import { HEX_CENTRES, hexPoints, matchLine } from '../lib/studyHexes'

// Check the map (A8, 12 Nov 2026; Jon: Granolia's hint "was reversed...
// backwards to the actual design"). Stand facing the wall: the wall lights
// one hexagon and the drawing lights the hexagon Granolia's hint would show.
// Yes three times and it is settled. No: the wall lights each hexagon in turn
// and you tap the same one in the drawing; the station saves it and checks
// again. `status` is the station's report, `send(command, name)` the page's.
export default function CheckTheMap({ status, send, off }) {
  const mode = status?.mode ?? 'idle'
  const match = mode === 'match' || status?.match?.done ? status?.match ?? null : null
  const live = mode === 'match' && match
  const remap = live && match.kind === 'remap'
  const hw = Math.max(...HEX_CENTRES.map(p => p[0])), hh = Math.max(...HEX_CENTRES.map(p => p[1]))
  const r = 100 / Math.sqrt(3) - 2
  return (
    <div className="gt-block">
      <h3>Granolia's map</h3>
      <p className="why">Stand facing the hexagons. The wall lights one, this drawing lights one. Say if they are the same one.</p>
      {!live && <div className="st-actions"><button className="primary" disabled={off || (mode !== 'idle' && mode !== 'flash')} onClick={() => send('match')}>Check the map</button></div>}
      {match && <p className="st-big" aria-live="polite">{matchLine(match)}</p>}
      {live && (
        <svg className="st-hexes" viewBox={`${-r - 6} ${-r - 6} ${hw + 2 * r + 12} ${hh + 2 * r + 12}`} role={remap ? 'group' : 'img'} aria-label="The hexagons as they hang">
          {HEX_CENTRES.map((c, i) => {
            const lit = !remap && match.hex === i
            return (
              <polygon key={i} points={hexPoints(c, r)}
                fill={lit ? '#f1e8d6' : '#24343c'} stroke="#a6a253" strokeWidth="3"
                style={remap ? { cursor: 'pointer' } : undefined}
                role={remap ? 'button' : undefined} aria-label={remap ? `Hexagon ${i + 1}` : undefined}
                onClick={remap ? () => send('hex', String(i)) : undefined} />
            )
          })}
        </svg>
      )}
      {live && !remap && (
        <div className="st-keys ends">
          <button className="st-key submit" onClick={() => send('yes')}>Yes, the same</button>
          <button className="st-key" onClick={() => send('no')}>No</button>
        </div>
      )}
      {live && <p className="hint">Tap Stop above to leave it as it was.</p>}
    </div>
  )
}
