import React, { useId } from 'react'

import { FRAME_PATHS, H, restPath, STRINGS, W } from './geometry'
import styles from '../../home.module.css'
import { LyreSide } from './types'

type LyreHalfProps = {
  side: LyreSide
  svgRef: React.Ref<SVGSVGElement>
  // Receives the strings so the animation can write directly to the DOM
  stringRefs: React.RefObject<(SVGPathElement | null)[]>
}

// Purely visual half-lyre, pinned to its parent's inner edge and revealed on parent hover
export function LyreHalf({ side, svgRef, stringRefs }: LyreHalfProps) {
  const gradientId = `lyre-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <svg
      ref={svgRef}
      className={styles.lyre}
      data-side={side}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {STRINGS.map((string, i) => (
        <path
          key={string.x}
          ref={(el) => {
            stringRefs.current[i] = el
          }}
          className={styles.string}
          d={restPath(string)}
          stroke={`url(#${gradientId})`}
          strokeWidth={string.width}
        />
      ))}
      {/* Frame drawn after the strings so it covers their ends */}
      <g className={styles.frame}>
        {FRAME_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}
