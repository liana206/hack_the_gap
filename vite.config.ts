import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Tried in this order after GEMINI_MODEL when a model is busy or unavailable.
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3-flash-preview', 'gemini-3.5-flash']
// Debate turns (json) need reliable verdicts: in our test only this model got all of them right, but it takes ~9 s.
const JSON_MODEL = 'gemini-3-flash-preview'
const TRY_NEXT = new Set([404, 429, 500, 503, 504])
const ATTEMPT_MS = 15000
const TOTAL_MS = 40000

// Tiny proxy: browser POSTs {system, messages} to /api/gemini, we add the key server-side.
// messages: [{role: "user" | "assistant", content: string}]; json: true asks for a JSON reply
function geminiProxy(env: Record<string, string>): Plugin {
  const key = env.GEMINI_API_KEY
  const model = env.GEMINI_MODEL || 'gemini-3.8-flash'
  let lastGood: string | undefined // chat replies start with the model that answered last time

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const send = (status: number, body: object) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'POST') return send(405, { error: 'POST only' })
    if (!key) return send(200, { text: '', placeholder: true })

    let raw = ''
    for await (const chunk of req) raw += chunk
    try {
      const { system, messages, json } = JSON.parse(raw)
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: json ? { responseMimeType: 'application/json' } : undefined,
      })
      const deadline = Date.now() + TOTAL_MS // never let slow models hang the demo
      let lastError = 'no model answered'
      // Debate turns keep their fixed order: a fallback that answered once may still judge the verdicts badly.
      const order = json ? [JSON_MODEL, 'gemini-3.5-flash', model, ...FALLBACK_MODELS] : [lastGood ?? model, model, ...FALLBACK_MODELS]
      for (const m of new Set(order)) {
        const left = deadline - Date.now()
        if (left <= 0) break
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body,
            signal: AbortSignal.timeout(Math.min(ATTEMPT_MS, left)),
          })
          const data = await r.json()
          if (r.ok) {
            console.log(`[gemini] answered by ${m}`)
            if (!json) lastGood = m
            const text = (data.candidates?.[0]?.content?.parts ?? [])
              .map((p: { text?: string }) => p.text ?? '')
              .join('')
            return send(200, { text })
          }
          lastError = data?.error?.message ?? `Gemini HTTP ${r.status}`
          console.log(`[gemini] ${m} failed (HTTP ${r.status})`)
          if (!TRY_NEXT.has(r.status)) break // e.g. a bad key: another model will not help
        } catch (e) {
          lastError = String(e) // timeout or network: try the next model
          console.log(`[gemini] ${m} failed (${lastError})`)
        }
      }
      send(502, { error: lastError })
    } catch (e) {
      send(502, { error: String(e) })
    }
  }

  return {
    name: 'gemini-proxy',
    configureServer: (server) => void server.middlewares.use('/api/gemini', handle),
    configurePreviewServer: (server) => void server.middlewares.use('/api/gemini', handle),
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), geminiProxy(loadEnv(mode, process.cwd(), ''))],
  build: { chunkSizeWarningLimit: 1000 }, // recharts is big; fine for a local demo
}))
