import './LogoIntro.css'

export default function LogoIntro() {
  return (
    <div className="logo-intro" role="img" aria-label="Safewatch AI">
      <svg className="logo-intro__mark" viewBox="0 0 620 106" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M80 5 132 35v36l-52 30L28 71V35L80 5Z" fill="#11191c" stroke="#2fa5a0" strokeWidth="7" strokeLinejoin="round" />
        <path d="M80 23v17m0 26v17M42 53h17m42 0h17" stroke="#2fa5a0" strokeWidth="5" strokeLinecap="round" />
        <circle cx="80" cy="53" r="22" fill="#11191c" stroke="#4c8dff" strokeWidth="7" />
        <circle cx="80" cy="53" r="9" fill="#3fb27f" />
        <path d="M64 39a23 23 0 0 1 32 0" fill="none" stroke="#3fb27f" strokeWidth="6" strokeLinecap="round" />
        <text x="173" y="69" fill="#e8e9ea" fontFamily="Arial, sans-serif" fontSize="55" fontWeight="700" letterSpacing="2">SAFEWATCH</text>
        <rect x="536" y="31" width="78" height="50" rx="13" fill="#2fa5a0" />
        <text x="550" y="68" fill="#dff4f2" fontFamily="Arial, sans-serif" fontSize="31" fontWeight="700" letterSpacing="1">AI</text>
      </svg>
    </div>
  )
}
