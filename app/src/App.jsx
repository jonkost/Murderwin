import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, signIn, signOutUser } from './firebase'
import { ensureSeeded } from './lib/store'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Stationery from './pages/Stationery'

function SignInGate() {
  const [err, setErr] = useState(null)
  return (
    <div className="gate">
      <h1>The Workshop</h1>
      <p className="sub">Sirwin Manor · staff entrance</p>
      <button className="primary" onClick={() => signIn().catch(e => setErr(e.message))}>
        Sign in with Google
      </button>
      {err && <p className="error">{err}</p>}
    </div>
  )
}

function NotAdmin({ user }) {
  return (
    <div className="gate">
      <h1>Not on the staff list</h1>
      <p className="sub">Signed in as {user.email ?? 'unknown'}</p>
      <p>This UID is not admin yet:</p>
      <code className="uid">{user.uid}</code>
      <p>
        Put it in <b>firestore.rules → isAdmin()</b> and redeploy, then reload.
      </p>
      <button onClick={() => navigator.clipboard.writeText(user.uid)}>Copy UID</button>
      <button onClick={signOutUser}>Sign out</button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking
  const [boot, setBoot] = useState({ state: 'idle' })

  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), [])

  useEffect(() => {
    if (!user) return
    setBoot({ state: 'checking' })
    ensureSeeded()
      .then(r => setBoot({ state: 'ready', seeded: r.seeded }))
      .catch(e => setBoot(
        // offline: the DB was seeded long ago — open anyway, work from cache
        e.code === 'unavailable' ? { state: 'ready', seeded: false }
          : {
            state: e.code === 'permission-denied' ? 'not-admin' : 'error',
            message: e.message,
          }))
  }, [user])

  if (user === undefined) return <div className="gate"><p>…</p></div>
  if (!user) return <SignInGate />
  if (boot.state === 'not-admin') return <NotAdmin user={user} />
  if (boot.state === 'error') return (
    <div className="gate">
      <h1>Something broke</h1>
      <p className="error">{boot.message}</p>
    </div>
  )
  if (boot.state !== 'ready') return <div className="gate"><p>Opening the workshop…</p></div>

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">The Workshop</Link>
        {boot.seeded && <span className="chip">seed imported ✓</span>}
        <span className="spacer" />
        <button className="ghost" onClick={signOutUser}>Sign out</button>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/edit/:area" element={<Editor />} />
        <Route path="/stationery" element={<Stationery />} />
      </Routes>
    </div>
  )
}
