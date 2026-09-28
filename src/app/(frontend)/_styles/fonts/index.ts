import localFont from 'next/font/local'

export const nunitoSans = localFont({
  src: [
    {
      path: './Nunito_Sans/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',
      style: 'normal',
    },
    {
      path: './Nunito_Sans/NunitoSans-Italic-VariableFont_YTLC,opsz,wdth,wght.ttf',
      style: 'italic',
    },
  ],
  weight: '200 1000',
  variable: '--font-nunito-sans',
})
