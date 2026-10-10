import { useState } from 'react'
import './AuthPanel.css'

function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {visible ? (
        <><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.4 9.5 6-.4.7-1.3 1.9-2.6 3M6.2 6.2C4.3 7.4 3 9.2 2.5 11c1 1.6 4.5 6 9.5 6 1 0 1.9-.2 2.8-.5" /></>
      ) : (
        <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>
      )}
    </svg>
  )
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export default function AuthPanel({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const isSignUp = mode === 'signup'

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice('')
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') || '').trim().toLowerCase()
    const password = String(values.get('password') || '')

    if (isSignUp) {
      const name = String(values.get('name') || '')
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' 
          },
          body: JSON.stringify({ email, password, full_name: name, role: 'supervisor' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Registration failed')
        
        localStorage.setItem('token', data.access_token)
        const userObj = { name: name || email.split('@')[0], email, token: data.access_token, role: data.role }
        localStorage.setItem('user', JSON.stringify(userObj))
        onLogin?.(userObj)
      } catch (err) {
        setNotice(err.message)
      }
    } else {
      try {
        const params = new URLSearchParams()
        params.append('username', email)
        params.append('password', password)
        const res = await fetch(`${API_BASE}/auth/token`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'ngrok-skip-browser-warning': 'true'
          },
          body: params
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Login failed')
        
        localStorage.setItem('token', data.access_token)
        const userObj = { name: email.split('@')[0], email, token: data.access_token, role: data.role }
        localStorage.setItem('user', JSON.stringify(userObj))
        onLogin?.(userObj)
      } catch (err) {
        setNotice(err.message)
      }
    }
  }

  return (
    <div className="auth-stage">
      <section className="auth-panel" aria-label="Vision Shield account access">
      <div className="auth-panel__glow" aria-hidden="true" />
      <div className="auth-panel__content">
        <div className="auth-page-brand" role="img" aria-label="Vision Shield">
          <svg viewBox="0 0 48 54" aria-hidden="true">
            <path d="M24 2 44 9v15c0 13-10 23-20 28C14 47 4 37 4 24V9z" fill="rgba(53,215,255,.12)" stroke="#35D7FF" strokeWidth="2.5" />
            <path d="M24 7 39 12v12c0 10-7 18-15 22C16 42 9 34 9 24V12z" fill="rgba(53,215,255,.06)" stroke="rgba(141,157,245,.95)" strokeWidth="1.4" />
            <path d="M24 8v9m0 17v8M10 24h8m12 0h8M14 14l6 6m8 8 6 6m0-20-6 6m-8 8-6 6" fill="none" stroke="rgba(99,180,244,.95)" strokeWidth="1.2" />
            <circle cx="24" cy="24" r="8" fill="rgba(9,22,42,.92)" stroke="#63B4F4" strokeWidth="2" />
            <circle cx="24" cy="24" r="3.5" fill="#35D7FF" />
            <circle cx="25.5" cy="22.5" r="1.3" fill="#fff" />
          </svg>
          <span>VISION<strong>SHIELD</strong></span>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Choose an account action">
          <button
            className={mode === 'login' ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
            id="login-tab"
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            aria-controls="auth-form"
            onClick={() => { setMode('login'); setNotice('') }}
          >Sign In</button>
          <button
            className={mode === 'signup' ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
            id="signup-tab"
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            aria-controls="auth-form"
            onClick={() => { setMode('signup'); setNotice('') }}
          >Sign Up</button>
        </div>

        <form
          id="auth-form"
          className="auth-form"
          role="tabpanel"
          aria-labelledby={isSignUp ? 'signup-tab' : 'login-tab'}
          onSubmit={handleSubmit}
        >
          {isSignUp && (
            <label className="auth-field">
              <span>Full name</span>
              <input autoComplete="name" name="name" placeholder="Enter your name" required />
            </label>
          )}
          <label className="auth-field">
            <span>Email</span>
            <span className="auth-input-wrap"><MailIcon /><input autoComplete="email" name="email" type="email" placeholder="you@example.com" required /></span>
          </label>
          <label className="auth-field">
            <span>Password</span>
            <span className="auth-password">
              <LockIcon />
              <input
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                minLength={6}
                required
              />
              <button
                className="auth-password__toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              ><EyeIcon visible={showPassword} /></button>
            </span>
          </label>
          {!isSignUp && <button className="auth-forgot" type="button" onClick={() => setNotice('Password reset link sent (simulated).')}>Forgot password?</button>}
          <button className="auth-submit" type="submit">{isSignUp ? 'Create account' : 'Sign In'}</button>
        </form>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <p className="auth-footnote">Secure connection <span aria-hidden="true">•</span> E2E Encryption Active</p>
      </div>
      </section>
    </div>
  )
}
