// The Reticule's icons (Jon, 28 Oct 2026: "the menu at the bottom of the app
// is crude"): one line drawing per tab, above its word, drawn in the tab's
// own colour (currentColor), so the lit tab and the others need no second set.

const PATHS = {
  // a bell: what to do now
  now: <><path d="M6.2 9.6a5.8 5.8 0 0 1 11.6 0c0 4.6 1.9 6.2 1.9 6.2H4.3s1.9-1.6 1.9-6.2Z" /><path d="M10 19.2a2.1 2.1 0 0 0 4 0" /></>,
  // a person: your character
  you: <><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20c1.3-3.7 4-5.6 7.2-5.6s5.9 1.9 7.2 5.6" /></>,
  // a magnifying glass: what you have been told
  clues: <><circle cx="10.8" cy="10.8" r="6" /><path d="m15.3 15.3 4.7 4.7" /></>,
  // a pencil: your own words
  notes: <><path d="M4 20h4.2L19.4 8.8a2.4 2.4 0 0 0-3.4-3.4L4.8 16.6 4 20Z" /><path d="m14.2 7.2 3.4 3.4" /></>,
  // a checklist: the nineteen, crossed off
  motives: <><path d="m3.8 6.6 1.6 1.6 2.8-2.8" /><path d="m3.8 12.6 1.6 1.6 2.8-2.8" /><circle cx="6" cy="18.4" r="1.4" /><path d="M11 7h9M11 13h9M11 18.4h9" /></>,
  // a cat's head: the household
  cats: <><path d="M4.6 11.6 5.2 4l4.4 3.6h4.8L18.8 4l.6 7.6c0 4.6-3.3 8-7.4 8s-7.4-3.4-7.4-8Z" /><path d="M9.3 12.4h.01M14.7 12.4h.01" strokeWidth="2.6" /><path d="m11 15 1 .8 1-.8" /></>,
  // an open book: the rules
  rules: <><path d="M12 6.6C10.4 5.3 8.2 4.8 4 5v13.2c4.2-.2 6.4.3 8 1.6 1.6-1.3 3.8-1.8 8-1.6V5c-4.2-.2-6.4.3-8 1.6Z" /><path d="M12 6.6v13.2" /></>,
  // a key: the host's controls
  host: <><circle cx="8" cy="15.5" r="4" /><path d="m10.9 12.6 8.6-8.6M16.4 7.1l2.2 2.2M13.9 9.6l1.7 1.7" /></>,
}

export default function TabIcon({ name }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  )
}
