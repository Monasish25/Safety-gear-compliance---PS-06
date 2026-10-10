import './LogoIntro.css'

export default function LogoIntro({ onComplete }) {
  return (
    <div
      className="logo-intro"
      role="img"
      aria-label="Vision Shield"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName === 'intro-out') onComplete?.()
      }}
    >
      <svg className="logo-intro__mark" viewBox="0 0 660 330" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="brandBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0062a3" />
            <stop offset="50%" stopColor="#005187" />
            <stop offset="100%" stopColor="#00355a" />
          </linearGradient>
          <linearGradient id="bevelBorder" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0088e0" stopOpacity=".9" />
            <stop offset="100%" stopColor="#00355a" stopOpacity=".3" />
          </linearGradient>
          <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0092e0" stopOpacity=".4" />
            <stop offset="75%" stopColor="#005187" stopOpacity=".08" />
            <stop offset="100%" stopColor="#005187" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="logo-intro__symbol">
          <path d="M135 15 245 52v83c0 73-57 123-110 150-53-27-110-77-110-150V52z" fill="url(#brandBlueGrad)" stroke="url(#bevelBorder)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M135 32 225 62v68c0 62-49 105-90 128-41-23-90-66-90-128V62z" fill="#101318" stroke="#003d66" strokeWidth="2" />
          <g opacity=".85" fill="none" stroke="#005b94">
            <circle cx="135" cy="150" r="92" strokeDasharray="5 4" strokeWidth="1.2" />
            <circle cx="135" cy="150" r="70" />
            <circle cx="135" cy="150" r="48" strokeDasharray="4 3" />
            <circle cx="135" cy="150" r="28" stroke="#004875" strokeWidth="1.2" />
            <path d="M135 42v216M27 150h216M80 95l110 110M190 95 80 205" stroke="#003d66" />
            <path d="M185 100h10" stroke="#007cc7" strokeWidth="1.2" />
          </g>
          <g className="logo-intro__radar">
            <path d="M135 150V58a92 92 0 0 1 79 46z" fill="url(#radarSweepGrad)" />
            <path d="m135 150 79-46" stroke="#0099ee" strokeWidth="1.5" opacity=".6" />
          </g>
          <path d="m135 150 35 62-35 26-35-26zM135 150l61-44m-61 44-61-44" fill="none" stroke="url(#brandBlueGrad)" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
          <g>
            <circle cx="135" cy="150" r="25" fill="#00385c" stroke="#007cc7" strokeWidth="2.5" />
            <circle cx="135" cy="150" r="18" fill="#0a0e13" stroke="#002b47" strokeWidth="1.8" />
            <circle cx="135" cy="150" r="12" fill="#00223d" />
            <circle cx="135" cy="150" r="7" fill="#005187" />
            <circle cx="140" cy="145" r="3" fill="#fff" className="logo-intro__flare" />
          </g>
        </g>

        <path className="logo-intro__divider" d="M278 65v200" stroke="url(#brandBlueGrad)" strokeWidth="4" strokeLinecap="round" />
        <g className="logo-intro__wordmark" fill="#005187" fontFamily="Montserrat, Arial, sans-serif" fontWeight="900" letterSpacing="2">
          <text x="310" y="149" fontSize="75">VISION</text>
          <text x="310" y="237" fontSize="75">SHIELD</text>
        </g>
      </svg>
    </div>
  )
}
