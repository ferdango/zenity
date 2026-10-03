/* Iconos SVG de los sets usados en Figma (Iconify), con currentColor para adaptarse al tema. */

interface GlyphProps {
  size?: number
  className?: string
}

/** mynaui:api — conector de API (Figma) */
export function ApiGlyph({ size = 24, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        d="M5.5 13L7 11.5l5.5 5.5l-1.5 1.5c-.75.75-3.5 2-5.5 0s-.75-4.75 0-5.5M3 21l2.5-2.5m13-7.5L17 12.5L11.5 7L13 5.5c.75-.75 3.5-2 5.5 0s.75 4.75 0 5.5m-6-3l-2 2M21 3l-2.5 2.5m-2.5 6l-2 2"
      />
    </svg>
  )
}

/** hugeicons:google-sheet — hoja de cálculo (Figma) */
export function SheetGlyph({ size = 24, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6">
        <path d="M15 2.5V4c0 1.414 0 2.121.44 2.56C15.878 7 16.585 7 18 7h1.5" />
        <path d="M4 16V8c0-2.828 0-4.243.879-5.121C5.757 2 7.172 2 10 2h4.172c.408 0 .613 0 .797.076c.183.076.328.22.617.51l3.828 3.828c.29.29.434.434.51.618c.076.183.076.388.076.796V16c0 2.828 0 4.243-.879 5.121C18.243 22 16.828 22 14 22h-4c-2.828 0-4.243 0-5.121-.879C4 20.243 4 18.828 4 16" />
        <path d="M12 11v3m0 0v3m0-3H7.5m4.5 0h4.5m-7 3h5c.943 0 1.414 0 1.707-.293s.293-.764.293-1.707v-2c0-.943 0-1.414-.293-1.707S15.443 11 14.5 11h-5c-.943 0-1.414 0-1.707.293S7.5 12.057 7.5 13v2c0 .943 0 1.414.293 1.707S8.557 17 9.5 17" />
      </g>
    </svg>
  )
}

/** ic:baseline-apple */
export function AppleGlyph({ size = 24, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35c-1.09-.46-2.09-.48-3.24 0c-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8c1.18-.24 2.31-.93 3.57-.84c1.51.12 2.65.72 3.4 1.8c-3.12 1.87-2.38 5.98.48 7.13c-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25c.29 2.58-2.34 4.5-3.74 4.25"
      />
    </svg>
  )
}
