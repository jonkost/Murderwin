// Draws relay strokes as SVG. The strokes come from the server in cell-local
// coordinates (0..1); see functions/lib/relay-gen.js for the shapes.
// One cell on the TV is a white square with a single dark line in it.
// A whole grid (the four options at vote time) is drawn with NO grid lines,
// so the options never look like the paper.

const S = 100 // one cell, in SVG units

function arcPath(from, to, bulge) {
  const [x1, y1] = from, [x2, y2] = to
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  // control point off the chord's midpoint; the curve peaks at bulge × chord
  const cx = mx + (-dy / len) * bulge * len * 2
  const cy = my + (dx / len) * bulge * len * 2
  return `M ${x1 * S} ${y1 * S} Q ${cx * S} ${cy * S} ${x2 * S} ${y2 * S}`
}

export function Stroke({ stroke, ox = 0, oy = 0, width = 6, color = 'currentColor' }) {
  const t = `translate(${ox * S} ${oy * S})`
  const common = { stroke: color, strokeWidth: width, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (stroke.kind === 'dot') return <circle transform={t} cx={stroke.at[0] * S} cy={stroke.at[1] * S} r={width * 1.2} fill={color} />
  if (stroke.kind === 'circle') return <circle transform={t} cx={stroke.at[0] * S} cy={stroke.at[1] * S} r={stroke.r * S} {...common} />
  if (stroke.kind === 'line') return <path transform={t} d={`M ${stroke.from[0] * S} ${stroke.from[1] * S} L ${stroke.to[0] * S} ${stroke.to[1] * S}`} {...common} />
  return <path transform={t} d={arcPath(stroke.from, stroke.to, stroke.bulge)} {...common} />
}

// One cell, as the TV shows it: a white square, the line inside, nothing else.
export function Cell({ strokes = [], className = 'cell-art' }) {
  return (
    <svg className={className} viewBox={`0 0 ${S} ${S}`} role="img" aria-label="the line to draw">
      <rect x="0" y="0" width={S} height={S} fill="#fff" />
      <g color="#111">
        {strokes.map((s, i) => <Stroke key={i} stroke={s} />)}
      </g>
    </svg>
  )
}

// A whole grid of cells, drawn without grid lines (for the four options).
export function Figure({ size, cells, className = 'figure-art', crossed = false }) {
  const w = size * S
  const keys = Object.keys(cells ?? {})
  return (
    <svg className={className} viewBox={`0 0 ${w} ${w}`} role="img" aria-label="a drawing">
      <rect x="0" y="0" width={w} height={w} fill="#fff" />
      <g color="#111">
        {keys.map(k => {
          const c = k.charCodeAt(0) - 65, r = Number(k.slice(1)) - 1
          return (cells[k] ?? []).map((s, i) => <Stroke key={`${k}-${i}`} stroke={s} ox={c} oy={r} width={4} />)
        })}
      </g>
      {crossed && <path d={`M 8 8 L ${w - 8} ${w - 8} M ${w - 8} 8 L 8 ${w - 8}`} stroke="#bf1925" strokeWidth={w / 40} strokeLinecap="round" />}
    </svg>
  )
}
