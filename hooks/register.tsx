import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { BuddyState, Mood } from '../types'

const buddy = atom({ plugin: 'clawd-buddy', key: 'buddy' } as const, { mood: 'wave', label: 'hi!' } as BuddyState, { shape: 'buddy-1' })
const isHidden = atom({ plugin: 'clawd-buddy', key: 'isHidden' } as const, false)

// ---------- drawing: a 9x6 pixel Claude, 4px a pixel, in the app's own orange ----------
const P = 4
const W = 360
const H = 64
const X0 = 24
const Y0 = 34
const ORANGE = '#D97757'
const INK = '#1F1E1D'
const GRAY = '#8C8A84'
const PAPER = '#F0EEE6'

const r = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x * P}" y="${y * P}" width="${w * P}" height="${h * P}" fill="${fill}" ${extra}/>`
const spin = (type: string, values: string, dur: string, extra = '') =>
  `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" repeatCount="indefinite" ${extra}/>`
const fade = (attr: string, values: string, dur: string, begin = '0s') =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>`
const g = (inner: string, anim = '', at = '') => `<g${at ? ` transform="${at}"` : ''}>${anim}${inner}</g>`

type Look = {
  eyes?: 'open' | 'shut' | 'wide'
  eyeMove?: string // translate values for the eyes
  walk?: boolean
  armL?: string // translate values for an arm
  armR?: string
  armDur?: string
}

function sprite(o: Look = {}): string {
  const eyes =
    o.eyes === 'shut'
      ? r(2, 2.5, 1, 0.5, INK) + r(6, 2.5, 1, 0.5, INK)
      : o.eyes === 'wide'
        ? r(1.75, 0.75, 1.5, 2.5, INK) + r(5.75, 0.75, 1.5, 2.5, INK)
        : r(2, 1, 1, 2, INK) + r(6, 1, 1, 2, INK) +
          // a lid that drops for a blink every 4s
          `<rect x="${2 * P}" y="${P}" width="${P}" height="0" fill="${ORANGE}">${fade('height', `0;0;${2 * P};0`, '4s')}</rect>` +
          `<rect x="${6 * P}" y="${P}" width="${P}" height="0" fill="${ORANGE}">${fade('height', `0;0;${2 * P};0`, '4s')}</rect>`
  const legA = r(1, 5, 1, 1, ORANGE) + r(5, 5, 1, 1, ORANGE)
  const legB = r(3, 5, 1, 1, ORANGE) + r(7, 5, 1, 1, ORANGE)
  const step = (begin: string) => (o.walk ? spin('translate', '0 0;0 -3;0 0', '.4s', `begin="${begin}"`) : '')
  const arm = (x: number, values: string | undefined, begin: string) =>
    g(r(x, 3, 1, 1, ORANGE), values ? spin('translate', values, o.armDur ?? '.4s', `begin="${begin}"`) : '')
  return (
    r(1, 0, 7, 5, ORANGE) +
    arm(0, o.armL, '0s') +
    arm(8, o.armR, '.2s') +
    g(eyes, o.eyeMove ? spin('translate', o.eyeMove, '1.6s') : '') +
    g(legA, step('0s')) +
    g(legB, step('.2s'))
  )
}

// The buddy at its spot, with a whole-body animation.
const place = (inner: string, bodyAnim = '', x = X0, y = Y0) => g(g(inner, bodyAnim), '', `translate(${x} ${y})`)

const floatUp = (text: string, x: number, y: number, begin: string, fill = GRAY, size = 10) =>
  `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" fill="${fill}" opacity="0">${text}` +
  fade('opacity', '0;1;0', '3s', begin) + fade('y', `${y};${y - 22}`, '3s', begin) + `</text>`

const CONFETTI = ['#D97757', '#E8B04B', '#6A9BCC', '#788C5D', '#C46686', '#F0EEE6']

const scenes: Record<Mood, () => string> = {
  // Strolls the strip, stops, strolls back.
  idle: () =>
    place(sprite({ walk: true }), spin('translate', '0 0;280 0;280 0;0 0;0 0', '18s', 'keyTimes="0;.42;.5;.92;1"')),
  sleep: () =>
    place(sprite({ eyes: 'shut' }), spin('translate', '0 0;0 1;0 0', '3s')) +
    floatUp('z', X0 + 36, Y0, '0s') + floatUp('z', X0 + 42, Y0 - 4, '1s', GRAY, 12) + floatUp('Z', X0 + 48, Y0 - 8, '2s', GRAY, 14),
  wave: () =>
    place(sprite({ armR: '0 0;0 -8;0 0', armDur: '.5s' }), spin('translate', '0 0;0 -4;0 0;0 0', '1s')),
  think: () =>
    place(sprite({ eyeMove: '0 -2;-2 -2;0 -2' }), spin('rotate', '-4 18 24;4 18 24;-4 18 24', '3s')) +
    [0, 1, 2].map(i => `<circle cx="${X0 + 40 + i * 7}" cy="${Y0 - 6 - i * 6}" r="${1.5 + i}" fill="${GRAY}" opacity="0">${fade('opacity', '0;1;1;0', '1.8s', `${i * 0.3}s`)}</circle>`).join(''),
  read: () =>
    place(sprite({ eyeMove: '-3 0;3 0;-3 0' }), spin('translate', '0 0;0 -1;0 0', '1.6s')) +
    g(`<circle cx="0" cy="0" r="6" fill="${PAPER}" fill-opacity=".35" stroke="${GRAY}" stroke-width="2"/><rect x="4" y="4" width="3" height="8" fill="${GRAY}" transform="rotate(-45 5 5)"/>`,
      spin('translate', `${X0 + 8} ${Y0 + 8};${X0 + 28} ${Y0 + 8};${X0 + 8} ${Y0 + 8}`, '1.6s')),
  write: () =>
    place(sprite({ armR: '0 0;2 -1;0 0', armDur: '.3s' }), spin('translate', '0 0;0 -1;0 0', '.6s')) +
    `<rect x="${X0 + 46}" y="${Y0 - 4}" width="26" height="28" fill="${PAPER}" stroke="${GRAY}"/>` +
    [0, 1, 2].map(i => `<rect x="${X0 + 50}" y="${Y0 + 2 + i * 7}" width="0" height="2" fill="${INK}">${fade('width', '0;18;18', '2.4s', `${i * 0.8}s`)}</rect>`).join('') +
    g(r(0, 0, 1, 3, '#E8B04B') + r(0, 3, 1, 1, INK),
      spin('translate', `${X0 + 50} ${Y0 - 14};${X0 + 66} ${Y0 - 14};${X0 + 50} ${Y0 - 7};${X0 + 66} ${Y0 - 7};${X0 + 50} ${Y0};${X0 + 66} ${Y0}`, '2.4s')),
  bash: () =>
    place(sprite({ armL: '0 0;0 -4;0 0', armR: '0 0;0 -4;0 0', armDur: '.25s' }), spin('translate', '0 0;0 -1;0 0', '.25s')) +
    `<rect x="${X0 + 46}" y="${Y0 - 6}" width="40" height="28" rx="3" fill="${INK}" stroke="${GRAY}"/>` +
    `<text x="${X0 + 50}" y="${Y0 + 8}" font-family="monospace" font-size="10" fill="${ORANGE}">&gt;</text>` +
    `<rect x="${X0 + 58}" y="${Y0}" width="6" height="9" fill="${PAPER}">${fade('opacity', '1;1;0;0', '.9s')}</rect>`,
  web: () =>
    place(sprite() + r(4, -2, 1, 2, INK) + r(4, -3, 1, 1, ORANGE), spin('translate', '0 0;0 -1;0 0', '1.2s')) +
    [0, 1, 2].map(i => `<circle cx="${X0 + 18}" cy="${Y0 - 10}" r="2" fill="none" stroke="${ORANGE}" stroke-width="1.5" opacity="0">${fade('r', '2;18', '1.8s', `${i * 0.6}s`)}${fade('opacity', '1;0', '1.8s', `${i * 0.6}s`)}</circle>`).join(''),
  agent: () =>
    place(sprite({ armR: '0 0;0 -8;0 0' }), spin('translate', '0 0;0 -2;0 0', '.8s')) +
    [0, 1].map(i =>
      g(g(sprite({ walk: true }), spin('translate', '0 0;0 -6;0 0', '.6s', `begin="${i * 0.3}s"`)),
        '', `translate(${X0 + 50 + i * 28} ${Y0 + 12}) scale(.5)`)).join(''),
  error: () =>
    place(sprite({ eyes: 'wide' }), spin('translate', '-3 0;3 0;-3 0;3 0;0 0;0 0', '1s')) +
    `<text x="${X0 + 14}" y="${Y0 - 6}" font-family="monospace" font-weight="bold" font-size="16" fill="#E5484D">!${fade('opacity', '1;0;1', '.6s')}</text>`,
  celebrate: () =>
    place(sprite({ eyes: 'shut', armL: '0 0;0 -8;0 0', armR: '0 0;0 -8;0 0', armDur: '.6s' }), spin('translate', '0 0;0 -12;0 0', '.6s')) +
    Array.from({ length: 14 }, (_, i) => {
      const x = X0 - 16 + ((i * 37) % 90)
      const dur = `${1.4 + (i % 4) * 0.3}s`
      return `<rect x="${x}" y="-6" width="3" height="5" fill="${CONFETTI[i % CONFETTI.length]}">${fade('y', `-6;${H}`, dur, `${(i % 5) * 0.25}s`)}</rect>`
    }).join(''),
  dance: () =>
    place(sprite({ walk: true, armL: '0 0;0 -6;0 0', armR: '0 0;0 -6;0 0', armDur: '.8s' }), spin('rotate', '-12 18 24;12 18 24;-12 18 24', '.8s')) +
    floatUp('♪', X0 + 40, Y0, '0s', ORANGE, 12) + floatUp('♫', X0 + 52, Y0 - 6, '1.5s', ORANGE, 12),
}

export const svgFor = (mood: Mood) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">${scenes[mood]()}</svg>`

// ---------- behaviour ----------
const TRICKS: Mood[] = ['dance', 'wave', 'celebrate', 'sleep', 'think']
const base = (path: string) => path.split(/[\\/]/).pop() ?? path
const short = (text: string) => (text.length > 40 ? `${text.slice(0, 39)}…` : text)

function moodForTool(e: { tool: string } & Record<string, unknown>): [Mood, string] {
  const s = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : '')
  switch (e.tool) {
    case 'Read': case 'NotebookRead': return ['read', `reading ${base(s('file_path'))}`]
    case 'Grep': case 'Glob': return ['read', `searching ${short(s('pattern'))}`]
    case 'Edit': case 'Write': case 'NotebookEdit': return ['write', `writing ${base(s('file_path') || s('notebook_path'))}`]
    case 'Bash': case 'PowerShell': return ['bash', `running ${short(s('command').split('\n')[0] ?? '')}`]
    case 'WebFetch': case 'WebSearch': return ['web', `browsing ${short(s('query') || s('url'))}`]
    case 'Agent': case 'Task': return ['agent', `sending a helper: ${short(s('description'))}`]
    default: return ['think', `using ${e.tool}`]
  }
}

let timer: Timer | undefined

// Sets the mood; after holdMs falls back to idle, and idle dozes off after 3 minutes.
async function setMood($: EngineInterface, mood: Mood, label: string, holdMs?: number): Promise<void> {
  timer?.cancel()
  await update($, buddy, () => ({ mood, label }))
  if (holdMs !== undefined) timer = $.clock.after(holdMs, () => void setMood($, 'idle', ''))
  else if (mood === 'idle') timer = $.clock.after(180_000, () => void setMood($, 'sleep', 'zzz…'))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'buddy', description: `Clawd buddy: show, hide, or a trick (${TRICKS.join(', ')})` })
    void setMood($, 'wave', 'hi!', 4000)
    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'hide' || arg === 'show') {
      await update($, isHidden, () => arg === 'hide')
      return { text: arg === 'hide' ? 'Buddy is hiding. /buddy show brings him back.' : 'Buddy is back!' }
    }
    const trick = (TRICKS as string[]).includes(arg) ? (arg as Mood) : TRICKS[Math.floor(Math.random() * TRICKS.length)]!
    await update($, isHidden, () => false)
    await setMood($, trick, `${trick}!`, trick === 'sleep' ? undefined : 8000)
    return { text: `Buddy does: ${trick}` }
  })

  on('prompt.submit', async ($, e, next) => {
    await setMood($, 'wave', 'on it!')
    timer = $.clock.after(1500, () => void setMood($, 'think', 'thinking…'))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const [mood, label] = moodForTool(e as never)
    await setMood($, mood, label)
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError === true) await setMood($, 'error', 'uh oh!', 2500)
    else await setMood($, 'think', 'thinking…')
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.reason === 'answer') await setMood($, 'celebrate', 'done!', 5000)
    else await setMood($, 'error', e.reason === 'aborted' ? 'stopped' : 'hmm…', 3000)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const { mood, label } = await read($, buddy)
    const { Box, Text } = $.ui.resolve(e)
    const words = label || 'just wandering'
    if (e.surface === 'terminal') {
      return <Box><Text color="#D97757">▐▛███▜▌ </Text><Text dimColor>{words}</Text></Box>
    }
    const { Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg key={mood} source={svgFor(mood)} alt={`Clawd buddy: ${words}`} width={W} height={H} isInteractive />
        <Text dimColor>{words}</Text>
      </Box>
    )
  })
}
