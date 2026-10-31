// The app grows week by week: each week switches on more feature flags.
// Build a new week by implementing the flag, then setting ready: true.

export interface WeekFeatures {
  thinkFirst: boolean // junior must commit a reasoning before seeing any AI hint
  strictSenior: boolean // senior challenges instead of coaching
  traps: boolean // senior sometimes argues a wrong conclusion on purpose
  scheduling: boolean // pick a maintenance window using (fake) price data
  secondLife: boolean // recycling / resale agent for dismantled parts
  readingHelp: boolean // hint line under the gap chart on how to read it
}

export interface Week {
  n: number
  title: string
  description: string
  ready: boolean
  seniorStyle: 'coach' | 'strict' | 'devil'
  features: WeekFeatures
}

const none: WeekFeatures = {
  thinkFirst: false,
  strictSenior: false,
  traps: false,
  scheduling: false,
  secondLife: false,
  readingHelp: false,
}

export const WEEKS: Week[] = [
  {
    n: 1,
    title: 'Read the signals',
    description: 'Decide on six turbines, then a friendly senior explains what mattered.',
    ready: true,
    seniorStyle: 'coach',
    features: { ...none, readingHelp: true },
  },
  {
    n: 2,
    title: 'Think first, then challenge',
    description: 'Explain your reasoning before any AI help; a strict senior corrects it.',
    ready: true,
    seniorStyle: 'strict',
    features: { ...none, thinkFirst: true, strictSenior: true },
  },
  {
    n: 3,
    title: 'Smart scheduling',
    description: 'Plan the maintenance window around wind forecasts and electricity prices.',
    ready: false,
    seniorStyle: 'strict',
    features: { ...none, thinkFirst: true, strictSenior: true, traps: true, scheduling: true },
  },
  {
    n: 4,
    title: 'Second life',
    description: 'For end-of-life turbines, decide which parts to reuse, sell or recycle.',
    ready: false,
    seniorStyle: 'strict',
    features: { ...none, thinkFirst: true, strictSenior: true, traps: true, scheduling: true, secondLife: true },
  },
]
