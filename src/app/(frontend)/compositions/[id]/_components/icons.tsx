// The editor's line icons, drawn with the stroke of the lyre (currentColor), decorative only

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

export const DocumentIcon = () => (
  <svg {...common}>
    <path d="M4 1.75h5.25L12.5 5v9.25H4z" />
    <path d="M9 1.75V5.25h3.5M6 8.5h4.5M6 11h3" />
  </svg>
)

export const FolderIcon = ({ open }: { open: boolean }) => (
  <svg {...common}>
    {open ? (
      <path d="M1.75 12.75V3.75h4l1.5 1.5h5v2M1.75 12.75l1.75-5.5h11l-1.75 5.5z" />
    ) : (
      <path d="M1.75 3.75h4l1.5 1.5h7v7.5H1.75z" />
    )}
  </svg>
)

export const ChevronIcon = () => (
  <svg {...common}>
    <path d="M6 4l4 4-4 4" />
  </svg>
)

// Two sheets slid apart: the binder, shown or hidden
export const BinderIcon = () => (
  <svg {...common}>
    <path d="M2.5 3.25h7.5v10H2.5zM10 5.25h3.5v8H6" />
  </svg>
)

// The same icons with a small "+": add a document, add a folder
export const NewDocumentIcon = () => (
  <svg {...common}>
    <path d="M9.25 14.25H4V1.75h5.25L12.5 5v3" />
    <path d="M9 1.75V5.25h3.5M12.5 10.5v4M10.5 12.5h4" />
  </svg>
)

export const NewFolderIcon = () => (
  <svg {...common}>
    <path d="M8.5 12.75H1.75v-9h4l1.5 1.5h7v3" />
    <path d="M12.5 10.5v4M10.5 12.5h4" />
  </svg>
)

// Two words facing each other: the synonyms, shown or hidden
export const SynonymsIcon = () => (
  <svg {...common}>
    <path d="M2 4.5h6M2 7.5h4M8 11.5h6M10 8.5h4" />
    <path d="M11 2.5l2 2-2 2M5 9.5l-2 2 2 2" />
  </svg>
)
