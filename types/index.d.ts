export type Mood =
  | 'idle' | 'sleep' | 'wave' | 'think' | 'read' | 'write' | 'bash'
  | 'web' | 'agent' | 'error' | 'celebrate' | 'dance'

export type BuddyState = { mood: Mood; label: string }

declare module 'claude-code' {
  interface PluginState {
    'clawd-buddy': { buddy: Shaped<BuddyState>; isHidden: boolean }
  }
}
