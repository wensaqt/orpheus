import { LyreSide } from './types'

// Small decorative drawings replace the interactive lyre in the card layout.
export function ChoiceIllustration({ side }: { side: LyreSide }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {side === LyreSide.Left ? (
        <>
          <path d="M21 91H85L80 103H16Z" fill="currentColor" fillOpacity="0.06" />
          <path
            d="M37 89C43 62 61 32 99 15C97 47 79 72 49 79L37 89Z"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <path d="M33 99Q53 54 94 20M49 77L52 54M61 57L67 37M49 77L76 66M62 57L89 45" />
          <path d="M22 107H80M21 33V45M15 39H27M105 79V87M101 83H109" opacity="0.5" />
        </>
      ) : (
        <>
          <path
            d="M28 19H93V98H28Q18 98 18 89V29Q18 19 28 19Z"
            fill="currentColor"
            fillOpacity="0.06"
          />
          <path d="M30 19V98M40 38H78M40 47H67M22 36H34M22 53H34M22 70H34M22 87H34" />
          <path d="M59 84V66L76 62V79M59 66L76 62" />
          <ellipse
            cx="55"
            cy="85"
            rx="4"
            ry="2.5"
            fill="currentColor"
            transform="rotate(-15 55 85)"
          />
          <ellipse
            cx="72"
            cy="80"
            rx="4"
            ry="2.5"
            fill="currentColor"
            transform="rotate(-15 72 80)"
          />
          <path d="M103 33V45M97 39H109M39 109H83" opacity="0.5" />
        </>
      )}
    </svg>
  )
}
