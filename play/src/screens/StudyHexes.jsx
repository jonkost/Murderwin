import { HEX_CENTRES, hexPoints, hexesFor } from '../lib/walls'
export { studyState, STUDY_DONE_LINE } from '../lib/studyview'

// The Study's screen (A8, 12 Nov 2026). Jon: "everything needs to have a
// much more clear picture as to when you're there, when you start", and
// Granolia's hint "needs to also be the same design as far as the hexagons...
// it was reversed... backwards to the actual design".
//
// The states (studyState) live in lib/studyview.js, so play/test can read them.

// The wall's ten hexagons as they hang, the rules card's drawing.
const R = 100 / Math.sqrt(3) - 2
const W = Math.max(...HEX_CENTRES.map(p => p[0])), H = Math.max(...HEX_CENTRES.map(p => p[1]))
const VIEW = `${-R - 6} ${-R - 6} ${W + 2 * R + 12} ${H + 2 * R + 12}`

// Granolia's hint: the hexagons in the order they lit, numbered, drawn as the
// wall hangs. `order` is the panel numbers (1 up, the station's order),
// `hexes` which drawn hexagon each panel is. With the wall down (fallback)
// every hexagon also carries its key on the button box. Null when there is no
// map to draw with (the caller draws the old circles).
export function HexHint({ study, order = [], fallback = false }) {
  const hexes = hexesFor(study)
  if (!hexes) return null
  return (
    <svg className="wall-map hex-hint" viewBox={VIEW} role="img" aria-label="The hexagons, numbered in the order they lit">
      {HEX_CENTRES.map((c, h) => {
        const panel = hexes.indexOf(h) + 1
        const steps = order.map((n, k) => (n === panel ? k + 1 : null)).filter(Boolean)
        const lit = steps.length > 0
        return (
          <g key={h}>
            <polygon points={hexPoints(c, R)} fill={lit ? '#F1E8D6' : '#2a3a44'} stroke="#A6A253" strokeWidth="3" />
            {fallback && <text x={c[0]} y={c[1] + R * 0.75} textAnchor="middle" fontSize={R * 0.42} fill={lit ? '#001925' : '#8a9aa2'}>{panel}</text>}
            {lit && <text x={c[0]} y={c[1] + R * 0.3} textAnchor="middle" fontSize={steps.length > 2 ? R * 0.55 : R * 0.8} fill="#001925">{steps.join(',')}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// The hexagons on the ready card, plain, with no words.
export function ReadyHexes() {
  return (
    <div className="study-walls" aria-hidden="true">
      <svg viewBox={VIEW}>{HEX_CENTRES.map((c, i) => <polygon key={i} points={hexPoints(c, R)} className="wall-hex" />)}</svg>
    </div>
  )
}
