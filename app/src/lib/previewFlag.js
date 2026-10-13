// Preview mode: the workshop with pretend data and no sign-in, for looking
// at the screens on a dev server. Never on in a built site. Open
// http://localhost:5173/workshop/?preview=1#/ to use it.
export const PREVIEW = Boolean(import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('preview'))
