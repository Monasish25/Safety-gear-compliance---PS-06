export default function PrototypeBanner({ onLaunch }) {
  return (
    <section className="prototype-banner glass-panel" id="incidents">
      <div className="prototype-banner__copy"><span className="prototype-icon" aria-hidden="true">✳</span><div><p className="section-eyebrow">SAFETY IN MOTION</p><h2>See the full site. Act in real time.</h2><p>Bring every camera, alert, and response into one clear operational picture.</p></div></div>
      <div className="prototype-banner__actions"><button className="button button--primary" type="button" onClick={onLaunch}>Launch Live Monitoring <span aria-hidden="true">↗</span></button><a className="button button--glass" href="#pipeline">System Specs</a></div>
    </section>
  )
}
