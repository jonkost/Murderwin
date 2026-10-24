import { useEffect, useState } from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, signIn, signOutUser } from './firebase'
import { ensureSeeded } from './lib/store'
import { PREVIEW } from './lib/previewFlag'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Assets from './pages/Assets'
import Night from './pages/Night'
import Timeline from './pages/Timeline'
import Devices from './pages/Devices'
import ForJenna from './pages/ForJenna'
import Status from './pages/Status'
import Health from './pages/Health'
import Steward from './pages/Steward'
import StudyTest from './pages/StudyTest'
import { useFrozen } from './components/Frozen'
import { FROZEN_CHIP } from './lib/frozen'

function SignInGate() {
  const [err, setErr] = useState(null)
  return (
    <div className="gate">
      <img className="gate-seal" src="/workshop/seal.png" alt="" />
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
      <h1>Not on the staff list yet</h1>
      <p className="sub">Signed in as {user.email ?? 'unknown'}</p>
      <p>Send Jon this code and he will add you:</p>
      <code className="uid">{user.uid}</code>
      <p>Reload once Jon says done.</p>
      <button onClick={() => navigator.clipboard.writeText(user.uid)}>Copy the code</button>
      <button onClick={signOutUser}>Sign out</button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(PREVIEW ? { uid: 'preview', email: 'preview' } : undefined) // undefined = still checking
  const [boot, setBoot] = useState({ state: 'idle' })

  useEffect(() => (PREVIEW ? undefined : onAuthStateChanged(auth, u => setUser(u))), [])

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

  return <Shell user={user} />
}

function Shell({ user }) {
  const frozen = useFrozen()
  return (
    <div className="shell">
      <nav className="rail" aria-label="Workshop">
        <Link to="/" className="brand"><img className="brand-seal" src="/workshop/seal.png" alt="" /><span>Workshop</span></Link>
        {frozen.frozen && <span className="rail-frozen" title={frozen.banner}>{FROZEN_CHIP}</span>}
        <NavLink to="/" end className="rail-link">Home</NavLink>
        <NavLink to="/timeline" className="rail-link">Timeline</NavLink>
        <NavLink to="/status" className="rail-link">Where we are</NavLink>
        <NavLink to="/night" className="rail-link">Game night</NavLink>
        <NavLink to="/jenna" className="rail-link">For Jenna</NavLink>
        <NavLink to="/study-test" className="rail-link">Study test</NavLink>
        <button className="rail-link quiet" onClick={signOutUser}>Sign out</button>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/edit/:area" element={<Editor />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/night" element={<Night />} />
        <Route path="/timeline" element={<Timeline />} />
        {/* Reached from Game night and the Timeline's Setting up the house; the rail is full on a phone. */}
        <Route path="/devices" element={<Devices />} />
        <Route path="/jenna" element={<ForJenna />} />
        <Route path="/status" element={<Status />} />
        {/* The last run of npm run checks. Reached from Where we are; the rail is full on a phone. */}
        <Route path="/health" element={<Health />} />
        {/* Jon at the study walls with his phone: flash, teach the taps, a practice round. Also linked from Devices and Game night. */}
        <Route path="/study-test" element={<StudyTest />} />
        {/* Jenna's page. Not in the rail: she reaches it from For Jenna. Jon's account sees "Not for you." and the server refuses it anyway. */}
        <Route path="/steward" element={<Steward user={user} />} />
      </Routes>
    </div>
  )
}
