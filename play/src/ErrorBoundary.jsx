import { Component } from 'react'

// A render crash must never leave a guest staring at a blank phone.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="moment papered">
        <p className="moment-text">The Manor has lost its place. Nothing is lost — tap below and it will catch up.</p>
        <button className="big" onClick={() => window.location.reload()}>Catch up</button>
      </div>
    )
  }
}
