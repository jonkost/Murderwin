import { Component } from 'react'

// A render crash must never blank the page silently — show the wreckage.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    const detail = `${this.state.error?.message ?? this.state.error}\n\n${this.state.error?.stack ?? ''}`
    return (
      <div className="gate">
        <h1>Something broke</h1>
        <p className="sub">The workshop hit an error while drawing the page.</p>
        <pre className="crash">{detail}</pre>
        <div>
          <button className="primary" onClick={() => window.location.reload()}>Reload</button>{' '}
          <button onClick={() => navigator.clipboard.writeText(detail)}>Copy error</button>
        </div>
        <p className="hint">Nothing you typed is lost — saved edits live in the database.</p>
      </div>
    )
  }
}
