import 'react'

/*
 * CSS custom properties (`--name`) in a style prop. React sets them as they are, but its type
 * lists only the standard properties: this lets a component hand its CSS the values it reads
 * (`style={{ '--level': level }}`) without an assertion. Numbers are set without a unit.
 */
declare module 'react' {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined
  }
}
