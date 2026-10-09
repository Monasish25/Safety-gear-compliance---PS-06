import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Layers, 
  Volume2, 
  VolumeX,
  Camera,
  Eye
} from 'lucide-react';
import Loader from './Loader';

export default function VideoPlayerView({ 
  currentVideoUrl, 
  cameraName, 
  activeZoneLabel,
  latestAlert
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  useEffect(() => {
    setIsVideoLoading(true);
  }, [currentVideoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Stream Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 15, 26, 0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={17} color="var(--accent-cyan)" />
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.9rem',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {cameraName || 'CCTV Video Stream'}
          </span>
          <span style={{
            fontSize: '0.7rem',
            background: 'rgba(0, 240, 255, 0.12)',
            color: 'var(--accent-cyan)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-mono)'
          }}>
            5.0 FPS INFERENCE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            style={{
              background: showOverlays ? 'rgba(0, 240, 255, 0.2)' : 'var(--bg-elevated)',
              color: showOverlays ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Layers size={13} />
            <span>AI OVERLAYS</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#04070d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }} aria-busy={isVideoLoading}>
        <video
          ref={videoRef}
          src={currentVideoUrl || '/api/v1/videos/stream'}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            maxHeight: '480px'
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadStart={() => setIsVideoLoading(true)}
          onWaiting={() => setIsVideoLoading(true)}
          onCanPlay={() => setIsVideoLoading(false)}
          onError={() => setIsVideoLoading(false)}
        />

        {isVideoLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'rgba(4, 7, 13, .72)',
            color: 'var(--text-secondary)',
            fontSize: '.75rem'
          }}>
            <Loader size={88} label="Connecting to video stream" />
            <span>CONNECTING TO VIDEO STREAM...</span>
          </div>
        )}

        {/* Real-time on-screen HUD (PRD Section 10 & 31) */}
        {showOverlays && (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Top HUD bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(6px)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="radar-beacon live"></span>
                <span>ZONE ENGINE: POINT-IN-POLYGON ACTIVE</span>
              </div>

              {latestAlert && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  CONFIRMED VIOLATION: {latestAlert.event_type}
                </div>
              )}
            </div>

            {/* Bottom HUD bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.65)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                BYTETRACK: ANONYMOUS TRACKING ON
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.65)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-cyan)'
              }}>
                TEMPORAL THRESHOLD: ≥ 2.0s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 15, 26, 0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={togglePlay}
            className="btn btn-secondary btn-sm"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button 
            onClick={restartVideo}
            className="btn btn-secondary btn-sm"
            style={{ width: '34px', height: '34px', padding: 0 }}
            title="Restart playback"
          >
            <RotateCcw size={15} />
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="btn btn-secondary btn-sm"
            style={{ width: '34px', height: '34px', padding: 0 }}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}>
          LIVE CCTV INGESTION FEED · 1280x720p
        </div>
      </div>
    </div>
  );
}
