import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Tiny proxy: browser POSTs {system, messages} to /api/gemini, we add the key server-side.
// messages: [{role: "user" | "assistant", content: string}]
function geminiProxy(env: Record<string, string>): Plugin {
  const key = env.GEMINI_API_KEY
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash'

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
      const { system, messages } = JSON.parse(raw)
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m: { role: string; content: string }) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          }),
        },
      )
      const data = await r.json()
      if (!r.ok) return send(502, { error: data?.error?.message ?? `Gemini HTTP ${r.status}` })
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? '')
        .join('')
      send(200, { text })
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
