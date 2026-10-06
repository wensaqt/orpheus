// The style toolbar's line icons, drawn like the binder's (currentColor), decorative only

const common = {
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// The bold icon's strokes are heavier, like the text it sets
const BOLD_STROKE_WIDTH = 1.75

const PATHS = {
  undo: 'M5.5 4 2.75 6.75 5.5 9.5M2.75 6.75h6.5a3.5 3.5 0 0 1 0 7H7.5',
  redo: 'M10.5 4l2.75 2.75L10.5 9.5M13.25 6.75h-6.5a3.5 3.5 0 0 0 0 7H8.5',
  zoom: 'M7 2.75a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5M10.25 10.25l3.25 3.25',
  font: 'M3 13.5 7.5 2.5 12 13.5M4.85 9h5.3',
  fontSize: 'M2 4.5h6M5 4.5v9M9 8.5h5M11.5 8.5v5',
  bold: 'M4.5 2.75h4a2.6 2.6 0 0 1 0 5.25h-4zM4.5 8h4.75a2.75 2.75 0 0 1 0 5.5H4.5z',
  italic: 'M7 2.75h5M4 13.25h5M10 2.75 7 13.25',
  underline: 'M4.5 2.5v5a3.5 3.5 0 0 0 7 0v-5M3.5 14h9',
  strikethrough:
    'M11.25 4.5C10.8 3.4 9.7 2.75 8 2.75c-2 0-3.25 1-3.25 2.4 0 .9.5 1.6 1.6 2.1M2.5 8.25h11M4.9 11.25c.45 1.25 1.6 2 3.2 2 2 0 3.3-1 3.3-2.4 0-.4-.1-.75-.3-1.05',
  textColor: 'M4.75 10.5 8 2.5l3.25 8M5.9 7.75h4.2M3 13.75h10',
  highlight: 'M9.5 2.75l3.75 3.75-5.5 5.5H4V8.25zM2.5 14h11',
  link: 'M6.75 9.25a2.5 2.5 0 0 0 3.5 0l2.5-2.5a2.5 2.5 0 0 0-3.5-3.5l-.75.75M9.25 6.75a2.5 2.5 0 0 0-3.5 0l-2.5 2.5a2.5 2.5 0 0 0 3.5 3.5l.75-.75',
  comment: 'M2.75 3.25h10.5v7.5H7l-3 2.5v-2.5H2.75z',
  left: 'M2.5 3.5h11M2.5 6.5h7M2.5 9.5h11M2.5 12.5h7',
  center: 'M2.5 3.5h11M4.5 6.5h7M2.5 9.5h11M4.5 12.5h7',
  right: 'M2.5 3.5h11M6.5 6.5h7M2.5 9.5h11M6.5 12.5h7',
  justify: 'M2.5 3.5h11M2.5 6.5h11M2.5 9.5h11M2.5 12.5h11',
  lineSpacing:
    'M7 3.5h6.5M7 8h6.5M7 12.5h6.5M3.5 2.75v10.5M2 4.25l1.5-1.5L5 4.25M2 11.75l1.5 1.5 1.5-1.5',
  bullet:
    'M6.5 4h7M6.5 8h7M6.5 12h7M3 3.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2M3 7.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2M3 11.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2',
  number: 'M6.5 4h7M6.5 8h7M6.5 12h7M2.5 3l1-.5V6M2.25 9.75a1 1 0 0 1 2 .2c0 .8-2 1.3-2 2.3h2',
  indent: 'M2.5 3h11M7 6.5h6.5M7 9.5h6.5M2.5 13h11M2.5 6l2 2-2 2',
  clearFormatting: 'M4 3h7M7.5 3 5.75 11M9.5 10.5l3 3M12.5 10.5l-3 3',
  chevron: 'M4.5 6.5 8 10l3.5-3.5',
} as const

export type ToolbarIconName = keyof typeof PATHS

export const ToolbarIcon = ({ name }: { name: ToolbarIconName }) => (
  <svg {...common} strokeWidth={name === 'bold' ? BOLD_STROKE_WIDTH : common.strokeWidth}>
    <path d={PATHS[name]} />
  </svg>
)
