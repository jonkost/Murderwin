// The study's two walls as they hang (Jon's photos, 28 Oct 2026), for the
// drawing on the study's rules card. Read once from the controllers' own
// layouts (ten hexagons, twelve bars) and levelled to match the photos.
// Plain numbers, no React, so play/test can check them.

// The Elements wall: ten flat-topped hexagons, centres 100 apart.
export const HEX_CENTRES = [
  [0, 50.2], [86.5, 100.3], [173.9, 50.2], [260.4, 0], [260.4, 100.3],
  [347.7, 150.5], [434.2, 100.3], [521.6, 150.5], [608.1, 100.3], [695.5, 50.2],
]
// The Lines wall: twelve bars, left to right, each [from, to], 100 long.
export const LINE_BARS = [
  [[0, 91.7], [98.9, 90.7]], [[108.1, 96], [157.8, 182.8]], [[164.2, 182.7], [213.8, 96.7]],
  [[219.9, 86.1], [269.6, 0.1]], [[275.2, 0], [325.6, 85.7]], [[331.5, 96.1], [381.1, 182.9]],
  [[387, 193.4], [437.4, 279]], [[443, 278.9], [492.7, 192.9]], [[498.8, 182.3], [548.4, 96.3]],
  [[554.8, 96.2], [604.5, 183]], [[610.3, 182.6], [660, 96.6]], [[669.5, 91.7], [768.4, 90.7]],
]

// A flat-topped hexagon's corners around a centre, `r` from it.
export function hexPoints([cx, cy], r) {
  return [0, 60, 120, 180, 240, 300]
    .map(d => [cx + r * Math.cos(d * Math.PI / 180), cy + r * Math.sin(d * Math.PI / 180)])
    .map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ')
}
