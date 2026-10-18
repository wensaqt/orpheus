'use client'

import { useSyncExternalStore } from 'react'

// Width chooses the writing space; large touch screens also start with continuous text.
const CONTINUOUS_QUERY = '(max-width: 1100px), (hover: none), (pointer: coarse)'
const SIDEBAR_QUERY = '(min-width: 64rem)'
const CONTINUOUS = 1
const SIDEBAR = 2
const PENDING = -1

function subscribe(onChange: () => void) {
  const queries = [CONTINUOUS_QUERY, SIDEBAR_QUERY].map((query) => window.matchMedia(query))
  for (const query of queries) query.addEventListener('change', onChange)
  return () => {
    for (const query of queries) query.removeEventListener('change', onChange)
  }
}

function snapshot() {
  return (
    (window.matchMedia(CONTINUOUS_QUERY).matches ? CONTINUOUS : 0) |
    (window.matchMedia(SIDEBAR_QUERY).matches ? SIDEBAR : 0)
  )
}

// A primitive snapshot stays stable until a capability changes; keyboard height is irrelevant.
export function useEditorDisplay() {
  const display = useSyncExternalStore(subscribe, snapshot, () => PENDING)
  return {
    ready: display !== PENDING,
    continuous: display !== PENDING && Boolean(display & CONTINUOUS),
    sidebar: display !== PENDING && Boolean(display & SIDEBAR),
  }
}
