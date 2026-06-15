import { useState, useCallback } from 'react'
import { submitStill, normHandle, isValidHandle } from './api/still.js'
import EntryForm from './components/EntryForm.jsx'
import Scanner from './components/Scanner.jsx'
import Result from './components/Result.jsx'

// Phases: 'intro' → 'scanning' → 'mutual' | 'pending'
export default function App() {
  const [phase, setPhase] = useState('intro')
  const [them, setThem] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async ({ me, ex, email }) => {
    setError('')
    if (!isValidHandle(me) || !isValidHandle(ex)) {
      setError('Enter a valid Instagram @ for both.')
      return
    }
    if (normHandle(me) === normHandle(ex)) {
      setError("That's your own @. Enter your ex's.")
      return
    }

    setThem(ex.replace(/^@+/, ''))
    setPhase('scanning')

    // Run the lookup and the suspense animation in parallel; reveal only once
    // both finish, so the drama always lands (min ~2.8s) even on a fast network.
    const minSuspense = new Promise((r) => setTimeout(r, 2800))
    try {
      const [res] = await Promise.all([submitStill({ me, ex, email }), minSuspense])
      setPhase(res?.matched ? 'mutual' : 'pending')
    } catch (e) {
      console.error(e)
      setError('Something went wrong. Try again.')
      setPhase('intro')
    }
  }, [])

  const reset = useCallback(() => {
    setThem('')
    setError('')
    setPhase('intro')
  }, [])

  return (
    <main className="stage">
      <div className="vignette" aria-hidden="true" />
      <header className="brand">
        <span className="wordmark">STILL<span className="dot">.</span></span>
      </header>

      {phase === 'intro' && <EntryForm onSubmit={handleSubmit} error={error} />}
      {phase === 'scanning' && <Scanner them={them} />}
      {(phase === 'mutual' || phase === 'pending') && (
        <Result matched={phase === 'mutual'} them={them} onReset={reset} />
      )}

      <footer className="foot">
        <span>anonymous · zero-rejection · they never know unless it's mutual</span>
      </footer>
    </main>
  )
}
