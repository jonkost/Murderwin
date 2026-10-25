import { useEffect, useRef, useState } from 'react'
import { callPosePhoto } from '../firebase'
import { useTick } from '../lib/hooks'
import { poseShotKey, poseCaption, QUALITIES, fits } from '../lib/pose'

// The pose camera (card 450): /play/?kiosk=pose on the iPad Pro in the
// Entryway in Act 4, facing the catwalk. It shows the group to itself, like
// a mirror, follows Boo's show (public/boo, the same doc as her wall) and
// takes one photo at the group's last pose, for the end credits. The camera
// waits for a tap: the iPad asks for it once. Without it, Boo's Catwalk runs
// as before and the credits simply have no photos.
// With &practice=1 (the Game test tab) it follows the practice show and
// keeps the photo on this screen only: nothing is sent.

const SAY = {
  intro: 'Boo’s camera. Point this iPad at the catwalk: it takes one photo of each group’s last pose, for the end credits.',
  start: 'Turn on the camera',
  denied: 'The camera is off. Allow the camera for this page in the iPad’s Settings, then reload. Boo’s Catwalk works without it.',
  snapped: 'Snap! For the end credits.',
  practice: 'Snap! Practice: this photo stays on this screen. On the night it goes in the end credits.',
  missed: 'The photo did not go through. The next group gets theirs.',
}

// One frame of the video, mirrored like the screen, shrunk to fit the server's cap.
function snapFrame(video, maxWidth = 960) {
  const w0 = video?.videoWidth, h0 = video?.videoHeight
  if (!w0 || !h0) return null
  const scale = Math.min(1, maxWidth / w0)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w0 * scale)
  canvas.height = Math.round(h0 * scale)
  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  for (const q of QUALITIES) { const url = canvas.toDataURL('image/jpeg', q); if (fits(url)) return url }
  return null
}

export function PoseCamera({ boo, nightId, serverNow, practice = false }) {
  const video = useRef(null)
  const taken = useRef(new Set())
  const [camera, setCamera] = useState('off') // off | asking | on | denied
  const [shot, setShot] = useState(null) // { url, note }
  useTick(250)
  const start = async () => {
    setCamera('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
      video.current.srcObject = stream
      await video.current.play()
      setCamera('on')
    } catch { setCamera('denied') }
  }
  useEffect(() => () => { video.current?.srcObject?.getTracks?.().forEach(t => t.stop()) }, [])
  const now = serverNow()
  const key = camera === 'on' ? poseShotKey(boo, now) : null
  useEffect(() => {
    if (!key || taken.current.has(key)) return
    taken.current.add(key)
    const url = snapFrame(video.current)
    if (!url) return
    if (practice || nightId === 'preview') { setShot({ url, note: practice ? SAY.practice : SAY.snapped }); return }
    callPosePhoto({ nightId, groupId: boo.groupId, image: url })
      .then(() => setShot({ url, note: SAY.snapped }))
      .catch(() => setShot({ url: null, note: SAY.missed }))
  }, [key])
  // a new group: the last photo leaves the screen
  useEffect(() => { setShot(null) }, [boo?.groupId, boo?.startsAt?.toMillis?.() ?? boo?.startsAt])
  const cap = poseCaption(boo, now)
  return (
    <div className="kiosk pose-cam">
      <video ref={video} className={`pose-video${camera === 'on' ? '' : ' off'}`} playsInline muted />
      {camera !== 'on' && (
        <div className="pose-ask">
          <p className="kiosk-line">{camera === 'denied' ? SAY.denied : SAY.intro}</p>
          {camera !== 'denied' && <button className="primary" disabled={camera === 'asking'} onClick={start}>{SAY.start}</button>}
        </div>
      )}
      {camera === 'on' && (
        <div className="pose-caption">
          {cap.big && <p className="boo-strike">{cap.big}</p>}
          {cap.small && <p className="boo-hold">{cap.small}</p>}
        </div>
      )}
      {shot && (
        <div className="pose-shot">
          {shot.url && <img src={shot.url} alt="" />}
          <p>{shot.note}</p>
        </div>
      )}
    </div>
  )
}

// The end credits' photos: one per group, read from its own doc (the finale
// doc lists which groups have one). A missing photo shows nothing.
export function PoseShot({ src, names = [] }) {
  if (!src) return null
  return (
    <figure className="pose-credit">
      <img src={src} alt="" />
      <figcaption>{names.join(', ')}</figcaption>
    </figure>
  )
}
