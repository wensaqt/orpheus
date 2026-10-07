import localFont from 'next/font/local'

const lora = localFont({
  preload: false,
  src: [
    { path: './Lora/Lora-Variable.ttf', style: 'normal' },
    { path: './Lora/Lora-Italic-Variable.ttf', style: 'italic' },
  ],
  weight: '400 700',
  variable: '--font-document-lora',
})

const sourceSerif = localFont({
  preload: false,
  src: [
    { path: './Source_Serif_4/SourceSerif4-Variable.ttf', style: 'normal' },
    { path: './Source_Serif_4/SourceSerif4-Italic-Variable.ttf', style: 'italic' },
  ],
  weight: '200 900',
  variable: '--font-document-source-serif',
})

const sourceCode = localFont({
  preload: false,
  src: [
    { path: './Source_Code_Pro/SourceCodePro-Variable.ttf', style: 'normal' },
    { path: './Source_Code_Pro/SourceCodePro-Italic-Variable.ttf', style: 'italic' },
  ],
  weight: '200 900',
  variable: '--font-document-source-code',
})

export const documentFontClasses = [lora.variable, sourceSerif.variable, sourceCode.variable].join(
  ' ',
)
