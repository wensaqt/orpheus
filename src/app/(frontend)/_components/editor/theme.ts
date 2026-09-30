import type { EditorThemeClasses } from 'lexical'

import styles from './theme.module.css'

// Classes Lexical applies to the document nodes
export const editorTheme: EditorThemeClasses = {
  paragraph: styles.paragraph,
  heading: { h1: styles.h1, h2: styles.h2, h3: styles.h3 },
  quote: styles.quote,
  list: {
    ul: styles.ul,
    ol: styles.ol,
    listitem: styles.listItem,
    nested: { listitem: styles.nestedListItem },
  },
  text: {
    bold: styles.bold,
    italic: styles.italic,
    underline: styles.underline,
    strikethrough: styles.strikethrough,
    underlineStrikethrough: styles.underlineStrikethrough,
  },
}
