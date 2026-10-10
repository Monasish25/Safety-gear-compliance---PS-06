import './Background.css'

export default function Background({ theme = 'light' }) {
  const video = theme === 'dark' ? '/background-video-dark.mp4' : '/background-video.mp4'

  return (
    <div className={`site-background site-background--${theme}`} aria-hidden="true">
      <video key={video} className="site-background__video" autoPlay muted loop playsInline preload="auto">
        <source src={video} type="video/mp4" />
      </video>
    </div>
  )
}
