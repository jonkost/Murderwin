// Philips Hue, API v2 (CLIP v2) over HTTPS to the bridge. The bridge has a
// self-signed certificate, so the request to the bridge, and only that
// request, skips certificate checks (node:https with rejectUnauthorized
// false for that one connection; nothing process-wide).
//
// Pairing, once: press the button on the bridge, then within 30 seconds
//   curl -k -X POST https://<bridge>/api -d '{"devicetype":"murderwin#brain","generateclientkey":true}'
// → [{ "success": { "username": "<application key>", ... } }]
// Finding the hall light's id:
//   curl -k -H "hue-application-key: <key>" https://<bridge>/clip/v2/resource/light
// → data[].id with data[].metadata.name   (or: npm start -- --lights)
// Scenes (the four Jon makes in the Hue app, cues/scenes.json):
//   GET /clip/v2/resource/scene → data[].id, metadata.name, group { rid, rtype }
//   PUT /clip/v2/resource/scene/<id>  { "recall": { "action": "active" } }
// A Hue scene belongs to one room or zone, so a name may stand for several
// scenes (the same name made in each room): recallScene recalls them all.
// The hall bulb is in a room of its own and in no scene (Jon, in the Hue app),
// so a scene never touches its red or green.

import { request as httpsRequest } from 'node:https'

// CIE xy for a saturated red and green on a Hue colour bulb (gamut C).
export const XY = {
  red: { x: 0.675, y: 0.322 },
  green: { x: 0.17, y: 0.7 },
}

export function lightBody(colour, { brightness = 60 } = {}) {
  const xy = XY[colour]
  if (!xy) throw new Error(`no colour named ${colour}`)
  return { on: { on: true }, dimming: { brightness }, color: { xy } }
}

// A fetch-shaped request over node:https that accepts the bridge's own
// certificate. Returns { ok, status, text() } like fetch does. It always
// settles: a connection the bridge drops mid-response rejects instead of
// hanging (`requestImpl` is node's request; the tests hand in a fake).
export function bridgeFetch(url, { method = 'GET', headers = {}, body, timeoutMs = 5000, requestImpl = httpsRequest } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    let done = false
    const settle = (fn, v) => { if (!done) { done = true; fn(v) } }
    const req = requestImpl({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method, headers,
      rejectUnauthorized: false, timeout: timeoutMs,
    }, res => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { text += chunk })
      res.on('end', () => settle(resolve, { ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: async () => text }))
      res.on('error', e => settle(reject, e))
      res.on('close', () => { if (!res.complete) settle(reject, new Error('hue: connection dropped')) })
    })
    req.on('timeout', () => req.destroy(new Error('hue: timed out')))
    req.on('error', e => settle(reject, e))
    req.on('close', () => settle(reject, new Error('hue: connection closed before a reply')))
    req.end(body) // the body in one piece, so the bridge sees a Content-Length
  })
}

// Scene names match forgivingly: case, and spaces at the ends or doubled.
export function sameSceneName(a, b) {
  const norm = x => String(x ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
  return norm(a) !== '' && norm(a) === norm(b)
}

export const SCENE_RECALL = { recall: { action: 'active' } }

export class Hue {
  constructor({ host, key, fetchImpl = bridgeFetch, log = () => {} } = {}) {
    if (!host || !key) throw new Error('hue: bridge host and application key are required')
    this.host = host
    this.key = key
    this.fetch = fetchImpl
    this.log = log
  }

  async request(path, { method = 'GET', body } = {}) {
    const res = await this.fetch(`https://${this.host}${path}`, {
      method,
      headers: { 'hue-application-key': this.key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`hue: ${method} ${path} → ${res.status}`)
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  async lights() {
    const r = await this.request('/clip/v2/resource/light')
    return (r?.data ?? []).map(l => ({ id: l.id, name: l.metadata?.name ?? '' }))
  }

  async setLight(id, colour, opts) {
    return this.request(`/clip/v2/resource/light/${id}`, { method: 'PUT', body: lightBody(colour, opts) })
  }

  async scenes() {
    const r = await this.request('/clip/v2/resource/scene')
    return (r?.data ?? []).map(s => ({ id: s.id, name: s.metadata?.name ?? '', group: s.group?.rid ?? null }))
  }

  // Room and zone names by id, for the --scenes list.
  async places() {
    const out = new Map()
    for (const kind of ['room', 'zone']) {
      const r = await this.request(`/clip/v2/resource/${kind}`)
      for (const g of r?.data ?? []) out.set(g.id, g.metadata?.name ?? '')
    }
    return out
  }

  // Recall every scene with this name. Returns how many there were (0: none
  // by that name on the bridge).
  async recallScene(name) {
    const hits = (await this.scenes()).filter(s => sameSceneName(s.name, name))
    for (const s of hits) await this.request(`/clip/v2/resource/scene/${s.id}`, { method: 'PUT', body: SCENE_RECALL })
    return hits.length
  }
}
