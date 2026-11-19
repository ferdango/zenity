/** Forma del destello de Zenity (logo): se usa en el ícono y en los patrones de fondo. */

/** Estrella de 4 puntas con lados cóncavos centrada en (cx, cy) con radio r. */
export function starPath(cx: number, cy: number, r: number): string {
  const a = 0.0857 * r
  const b = 0.457 * r
  return [
    `M${cx} ${cy - r}`,
    `C${cx + a} ${cy - b} ${cx + b} ${cy - a} ${cx + r} ${cy}`,
    `C${cx + b} ${cy + a} ${cx + a} ${cy + b} ${cx} ${cy + r}`,
    `C${cx - a} ${cy + b} ${cx - b} ${cy + a} ${cx - r} ${cy}`,
    `C${cx - b} ${cy - a} ${cx - a} ${cy - b} ${cx} ${cy - r}Z`,
  ].join('')
}

const svgUri = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`

/** Un destello suelto, para usar como máscara (`mask-image`) y pintarlo con cualquier color o degradado. */
export const SPARK_MASK = svgUri(24, 24, `<path d='${starPath(12, 12, 11.5)}'/>`)

/**
 * Baldosa del patrón de marca: destellos de varios tamaños y puntos sueltos. Se usa como máscara
 * repetida para que el color salga de los tokens (claro y oscuro).
 */
export const PATRON_MARCA = (() => {
  const destellos: [number, number, number][] = [
    [36, 44, 10],
    [178, 26, 5],
    [214, 158, 14],
    [96, 150, 5.5],
    [30, 236, 7],
    [150, 262, 4],
  ]
  const puntos: [number, number][] = [
    [120, 84],
    [232, 82],
    [62, 112],
    [150, 206],
    [246, 250],
    [96, 284],
    [12, 150],
    [178, 112],
    [72, 20],
    [204, 226],
  ]
  const body = [
    ...destellos.map(([x, y, r]) => `<path d='${starPath(x, y, r)}'/>`),
    ...puntos.map(([x, y]) => `<circle cx='${x}' cy='${y}' r='1.8'/>`),
  ].join('')
  return svgUri(260, 300, body)
})()
