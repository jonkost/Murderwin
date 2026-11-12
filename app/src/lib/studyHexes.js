// Check the map (A8, 12 Nov 2026), the Study test page's part: the wall's
// ten hexagons as the rules card and Granolia's hint draw them (a copy of
// play/src/lib/walls.js HEX_CENTRES; app/test/a8-checkmap.test.mjs keeps
// them equal), and the page's words. Plain numbers and words, no React.

export const HEX_CENTRES = [
  [0, 50.2], [86.5, 100.3], [173.9, 50.2], [260.4, 0], [260.4, 100.3],
  [347.7, 150.5], [434.2, 100.3], [521.6, 150.5], [608.1, 100.3], [695.5, 50.2],
]

export function hexPoints([cx, cy], r) {
  return [0, 60, 120, 180, 240, 300]
    .map(d => [cx + r * Math.cos(d * Math.PI / 180), cy + r * Math.sin(d * Math.PI / 180)])
    .map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ')
}

// What the page says, from the station's report (status.match).
export function matchLine(match) {
  if (!match) return null
  if (match.done && match.ok) return 'All three match. Granolia\'s map is the right way round.'
  if (match.kind === 'remap') return `Hexagon ${match.step} of ${match.of} is lit on the wall. Tap the same one in the drawing.`
  return `Check ${match.step} of ${match.of}. Is the hexagon lit on the wall the one lit below?`
}
