// Sir Irwin on the desk: his face and one line, chosen by a plain count
// check. He is the dog: always true, adores everyone, never barks.
export default function Irwin({ line, small = false }) {
  if (!line) return null
  return (
    <div className={small ? 'irwin small' : 'irwin'} role="status">
      <img className="irwin-face" src="/workshop/irwin-icon.svg" alt="" />
      <p className="irwin-line">{line}</p>
    </div>
  )
}
