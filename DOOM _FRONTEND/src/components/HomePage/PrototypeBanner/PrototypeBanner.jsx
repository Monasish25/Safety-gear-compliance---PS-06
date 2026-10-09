export default function PrototypeBanner({ onLaunch }) {
  return (
    <section className="prototype-banner glass-panel" id="incidents">
      <div className="prototype-banner__copy"><span className="prototype-icon" aria-hidden="true"><svg viewBox="0 0 256 256" className="glass-icon" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mTop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ea4335"/><stop offset="1" stopColor="#fbbc04"/></linearGradient>
          <linearGradient id="mRight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbc04"/><stop offset="1" stopColor="#34a853"/></linearGradient>
          <linearGradient id="mBottom" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#34a853"/><stop offset="1" stopColor="#4285f4"/></linearGradient>
          <linearGradient id="mLeft" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#4285f4"/><stop offset="1" stopColor="#ea4335"/></linearGradient>
        </defs>
        <path d="M 64 60 L 166 60 A 24 24 0 0 1 190 84" stroke="url(#mTop)" strokeWidth="20" strokeLinecap="round" fill="none" filter="drop-shadow(0 0 6px rgba(234,67,53,0.4))"/>
        <path d="M 190 84 V 100 L 240 70 V 186 L 190 156 V 172 A 24 24 0 0 1 166 196" stroke="url(#mRight)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="drop-shadow(0 0 6px rgba(52,168,83,0.4))"/>
        <path d="M 166 196 L 64 196 A 24 24 0 0 1 40 172" stroke="url(#mBottom)" strokeWidth="20" strokeLinecap="round" fill="none" filter="drop-shadow(0 0 6px rgba(66,133,244,0.4))"/>
        <path d="M 40 172 L 40 84 A 24 24 0 0 1 64 60" stroke="url(#mLeft)" strokeWidth="20" strokeLinecap="round" fill="none" filter="drop-shadow(0 0 6px rgba(66,133,244,0.4))"/>
      </svg></span><div><p className="section-eyebrow">SAFETY IN MOTION</p><h2>See the full site. Act in real time.</h2><p>Bring every camera, alert, and response into one clear operational picture.</p></div></div>
      <div className="prototype-banner__actions"><button className="button button--primary" type="button" onClick={onLaunch}>Launch Live Monitoring <span aria-hidden="true">↗</span></button><a className="button button--glass" href="#pipeline">System Specs</a></div>
    </section>
  )
}
