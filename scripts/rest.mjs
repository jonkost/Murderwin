// Firestore, Auth and Functions over plain HTTP, with no packages to install.
// Used by the fake players (scripts/fake-players.mjs) and the emulator seed
// (scripts/seed-emulator.mjs). Everything here is a transport: it carries
// documents back and forth and never looks inside them.
//
// SEAL RULE: nothing in this module prints. Callers print counts only.

// ---- where things are -------------------------------------------------------

export function targets({ project, emulatorHost = '127.0.0.1', region = 'us-central1', live = false, apiKey = '' } = {}) {
  if (live) {
    return {
      live: true, project, region,
      firestore: `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`,
      auth: 'https://identitytoolkit.googleapis.com/v1',
      functions: `https://${region}-${project}.cloudfunctions.net`,
      apiKey,
    }
  }
  return {
    live: false, project, region,
    firestore: `http://${emulatorHost}:8080/v1/projects/${project}/databases/(default)/documents`,
    auth: `http://${emulatorHost}:9099/identitytoolkit.googleapis.com/v1`,
    functions: `http://${emulatorHost}:5001/${project}/${region}`,
    apiKey: apiKey || 'fake-api-key',
  }
}

// ---- Firestore's typed values ---------------------------------------------

export function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } }
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } }
  throw new Error(`cannot encode a ${typeof v}`)
}
export function encodeFields(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) fields[k] = encodeValue(v)
  return fields
}
export function decodeValue(v) {
  if (!v || typeof v !== 'object') return null
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('stringValue' in v) return v.stringValue
  if ('timestampValue' in v) return new Date(v.timestampValue)
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decodeValue)
  if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {})
  if ('referenceValue' in v) return v.referenceValue
  if ('geoPointValue' in v) return v.geoPointValue
  return null
}
export function decodeFields(fields) {
  const out = {}
  for (const [k, v] of Object.entries(fields ?? {})) out[k] = decodeValue(v)
  return out
}

// ---- requests ----------------------------------------------------------------

async function send(url, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  return { status: res.status, ok: res.ok, json }
}

// Firestore documents. `token` is a signed-in user's id token, or on the
// emulator the word "owner" for an admin's eye (the emulator honours it).
export async function getDoc(t, path, token) {
  const r = await send(`${t.firestore}/${path}`, { token })
  if (r.status === 404) return { exists: false, data: null, status: 404 }
  if (!r.ok) return { exists: false, data: null, status: r.status, error: r.json?.error?.status ?? 'error' }
  return { exists: true, data: decodeFields(r.json.fields), status: 200 }
}
export async function setDoc(t, path, data, token, { merge = false } = {}) {
  const url = merge ? `${t.firestore}/${path}?${Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')}` : `${t.firestore}/${path}`
  const r = await send(url, { method: 'PATCH', body: { fields: encodeFields(data) }, token })
  if (!r.ok) throw new Error(`write ${path}: ${r.status} ${r.json?.error?.status ?? ''}`)
  return true
}
export async function deleteDoc(t, path, token) {
  const r = await send(`${t.firestore}/${path}`, { method: 'DELETE', token })
  return r.ok || r.status === 404
}
// Every document of a collection, by id and data. Pages of up to 300.
export async function listDocs(t, collectionPath, token) {
  const out = []
  let pageToken = ''
  for (let page = 0; page < 50; page++) {
    const r = await send(`${t.firestore}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { token })
    if (!r.ok) return { ok: false, status: r.status, docs: out }
    for (const d of r.json?.documents ?? []) out.push({ id: d.name.split('/').pop(), data: decodeFields(d.fields) })
    pageToken = r.json?.nextPageToken ?? ''
    if (!pageToken) break
  }
  return { ok: true, status: 200, docs: out }
}

// Anonymous sign-in: one new user, one id token. The same call on the
// emulator and on the live project (the web API key is public).
export async function signUpAnonymous(t) {
  const r = await send(`${t.auth}/accounts:signUp?key=${t.apiKey}`, { method: 'POST', body: { returnSecureToken: true } })
  if (!r.ok || !r.json?.idToken) throw new Error(`sign-in failed: ${r.status} ${r.json?.error?.message ?? ''}`)
  return { uid: r.json.localId, token: r.json.idToken }
}

// A callable Cloud Function. Returns { ok, data } or { ok:false, code, message }.
export async function call(t, name, data, token) {
  const r = await send(`${t.functions}/${name}`, { method: 'POST', body: { data }, token })
  if (r.ok && r.json && 'result' in r.json) return { ok: true, data: r.json.result }
  const err = r.json?.error ?? {}
  return { ok: false, status: r.status, code: String(err.status ?? 'ERROR').toLowerCase().replace(/_/g, '-'), message: String(err.message ?? '') }
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms))
