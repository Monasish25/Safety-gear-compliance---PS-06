import { useState } from 'react'
import './AuthPanel.css'

function BrandMark() {
  return (
    <div className="auth-brand" aria-label="Safewatch AI">
      <svg viewBox="0 0 44 50" aria-hidden="true">
        <path d="M22 2 41 13v24L22 48 3 37V13L22 2Z" fill="#101a20" stroke="currentColor" strokeWidth="2.5" />
        <path d="M22 8v7m0 20v7M8 25h7m14 0h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="25" r="8" fill="#101a20" stroke="#4c8dff" strokeWidth="2.5" />
        <circle cx="22" cy="25" r="3" fill="#48c69b" />
      </svg>
      <span>SAFEWATCH<span className="auth-brand__ai">AI</span></span>
    </div>
  )
}

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

export default function AuthPanel({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const isSignUp = mode === 'signup'

  function handleSubmit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') || '').trim().toLowerCase()
    onLogin?.({
      name: String(values.get('name') || email.split('@')[0] || 'Operator'),
      email,
    })
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-panel__glow" aria-hidden="true" />
      <div className="auth-panel__content">
        <BrandMark />
        <header className="auth-heading">
          <p className="auth-eyebrow">SECURE ACCESS PORTAL</p>
          <h1 id="auth-title">{isSignUp ? 'Create your account' : 'Login with'}</h1>
          <p className="auth-copy">
            {isSignUp
              ? 'Set up your Safewatch account to continue.'
              : 'Sign in to your Safewatch workspace using your Gmail address.'}
          </p>
        </header>

        <div className="auth-tabs" role="tablist" aria-label="Choose an account action">
          <button
            className={mode === 'login' ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
            id="login-tab"
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            aria-controls="auth-form"
            onClick={() => setMode('login')}
          >Log in</button>
          <button
            className={mode === 'signup' ? 'auth-tabs__tab is-active' : 'auth-tabs__tab'}
            id="signup-tab"
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            aria-controls="auth-form"
            onClick={() => setMode('signup')}
          >Sign up</button>
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
            <span>Gmail address</span>
            <input
              autoComplete="email"
              name="email"
              type="email"
              pattern="[a-zA-Z0-9._%+-]+@gmail[.]com"
              title="Enter a valid Gmail address (example@gmail.com)"
              placeholder="you@gmail.com"
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <span className="auth-password">
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
          <button className="auth-submit" type="submit">{isSignUp ? 'Create account' : 'Login'}</button>
        </form>
        <p className="auth-footnote">Demo access <span aria-hidden="true">•</span> Authentication server is not connected</p>
      </div>
    </section>
  )
}
