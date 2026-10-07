Document fonts are downloaded from the official Google Fonts repository and served locally
with `next/font/local`. Each family includes its SIL Open Font License in `OFL.txt`.

- Lora: https://github.com/google/fonts/tree/main/ofl/lora
- Source Serif 4: https://github.com/google/fonts/tree/main/ofl/sourceserif4
- Source Code Pro: https://github.com/google/fonts/tree/main/ofl/sourcecodepro

Downloaded on 2026-10-07. Normal and italic files are variable fonts, including weights 600
and 700 used by headings and bold text. Nunito Sans was already included in this directory.

CSS variable names in `documentFonts.ts` are referenced in saved Lexical content and must
remain stable. The UI catalogue lives separately in `_components/editor/fonts.ts` so client
formatting helpers never import the Next.js font loaders.
