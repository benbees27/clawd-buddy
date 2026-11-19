import { expect, test } from 'claude-code/testing'

import { svgFor } from './register'
import type { Mood } from '../types'

const MOODS: Mood[] = ['idle', 'sleep', 'wave', 'think', 'read', 'write', 'bash', 'web', 'agent', 'error', 'celebrate', 'dance']

test('every mood draws an svg within the Svg size limit', async () => {
  for (const mood of MOODS) {
    const svg = svgFor(mood)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg.length < 131072).toBe(true)
  }
})
