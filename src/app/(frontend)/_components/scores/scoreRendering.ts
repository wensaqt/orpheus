export const DISPLAY_OPTIONS = { backend: 'svg' as const, autoResize: false, drawTitle: false }
export type ScoreRenderState = { xml: string; status: 'loading' | 'ready' | 'error' }
