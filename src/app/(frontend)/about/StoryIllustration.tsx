import styles from './page.module.css'

// Decorative line art stays in the document so it follows the theme and scales without a bitmap.
export function StoryIllustration() {
  return (
    <svg className={styles.illustration} viewBox="0 0 600 540" fill="none" aria-hidden="true">
      <circle cx="307" cy="266" r="194" className={styles.wash} />
      <circle cx="307" cy="266" r="225" className={styles.orbit} strokeDasharray="2 12" />
      <g className={styles.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M80 350Q179 310 295 357Q410 310 516 350L502 453Q394 415 295 463Q185 419 94 452Z"
          className={styles.paper}
        />
        <path
          d="M93 340Q195 301 295 347Q400 303 505 340L492 439Q390 404 295 451Q191 409 107 438Z"
          className={styles.paper}
        />
        <path d="M295 347V451M119 360Q203 335 269 365M123 378Q206 355 267 384M127 396Q207 375 265 403" />
        <g className={styles.staff}>
          <path d="M327 367Q404 340 479 361M326 378Q403 351 477 372M325 389Q402 362 475 383M324 400Q401 373 473 394M323 411Q400 384 471 405" />
        </g>
        <path d="M365 389V357M365 357L406 350V381" />
        <ellipse
          cx="358"
          cy="390"
          rx="8"
          ry="5"
          transform="rotate(-20 358 390)"
          className={styles.solid}
        />
        <ellipse
          cx="399"
          cy="382"
          rx="8"
          ry="5"
          transform="rotate(-20 399 382)"
          className={styles.solid}
        />
        <path
          d="M218 319C229 243 274 137 390 69C391 152 352 240 252 285L218 319Z"
          className={styles.feather}
        />
        <path d="M211 337Q272 194 377 85M245 264L249 209M270 218L280 165M298 178L313 129M250 264L310 247M274 219L340 198M300 179L365 152" />
        <path d="M425 223V168L456 159V210M425 169L456 160" />
        <ellipse
          cx="418"
          cy="224"
          rx="9"
          ry="6"
          transform="rotate(-20 418 224)"
          className={styles.solid}
        />
        <ellipse
          cx="449"
          cy="211"
          rx="9"
          ry="6"
          transform="rotate(-20 449 211)"
          className={styles.solid}
        />
        <path d="M151 229V184Q171 195 167 210" />
        <ellipse
          cx="143"
          cy="231"
          rx="10"
          ry="6"
          transform="rotate(-20 143 231)"
          className={styles.solid}
        />
      </g>
      <g className={styles.gold} strokeWidth="1.5" strokeLinecap="round">
        <path d="M169 113V137M157 125H181M466 279V299M456 289H476M101 289V301M95 295H107" />
        <circle cx="472" cy="124" r="3" />
        <circle cx="202" cy="178" r="2" />
        <path d="M159 480Q303 503 448 477" strokeDasharray="3 8" />
      </g>
    </svg>
  )
}

export function MusicalThread() {
  return (
    <svg className={styles.thread} viewBox="0 0 1000 160" fill="none" aria-hidden="true">
      <g className={styles.staff} stroke="currentColor" strokeWidth="1.2">
        <path d="M0 48C250 48 260 112 500 92S760 28 1000 48M0 60C250 60 260 124 500 104S760 40 1000 60M0 72C250 72 260 136 500 116S760 52 1000 72M0 84C250 84 260 148 500 128S760 64 1000 84M0 96C250 96 260 160 500 140S760 76 1000 96" />
      </g>
      <g stroke="currentColor" strokeWidth="2">
        <path d="M275 113V58L316 65V123M275 58L316 65M721 81V28Q745 40 740 53" />
        <ellipse
          cx="267"
          cy="114"
          rx="9"
          ry="6"
          fill="currentColor"
          transform="rotate(-15 267 114)"
        />
        <ellipse
          cx="308"
          cy="124"
          rx="9"
          ry="6"
          fill="currentColor"
          transform="rotate(-15 308 124)"
        />
        <ellipse
          cx="713"
          cy="82"
          rx="9"
          ry="6"
          fill="currentColor"
          transform="rotate(-15 713 82)"
        />
      </g>
    </svg>
  )
}
