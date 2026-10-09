import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Video, 
  Upload, 
  Settings, 
  Play, 
  Radio, 
  Clock, 
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import Loader from './Loader';

export default function Navbar({ 
  cameras, 
  selectedCamera, 
  onSelectCamera, 
  onOpenUpload, 
  onOpenPolicy, 
  onTriggerDemo,
  isWsConnected,
  isProcessingDemo
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-panel" style={{
      margin: '16px 24px',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 'var(--radius-lg)'
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(2,132,199,0.3) 100%)',
          border: '1px solid rgba(0,240,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(0,240,255,0.25)'
        }}>
          <ShieldAlert size={24} color="#00f0ff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #ffffff 0%, #a5f3fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              SAFEGEAR VISION AI
            </h1>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              background: 'rgba(0,240,255,0.12)',
              color: 'var(--accent-cyan)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(0,240,255,0.3)',
              fontFamily: 'var(--font-mono)'
            }}>
              HACKATHON MVP
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Temporal CCTV Verification · ByteTrack · Location-Aware Zero Alert Fatigue
          </p>
        </div>
      </div>

      {/* Middle Status Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Camera Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-elevated)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <Video size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CAMERA:</span>
          <select 
            value={selectedCamera}
            onChange={(e) => onSelectCamera(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#0f172a' }}>
                {c.id} - {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Live Stream Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-elevated)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem'
        }}>
          <span className={`radar-beacon ${isWsConnected ? 'live' : 'alert'}`}></span>
          <span style={{ color: isWsConnected ? '#34d399' : '#f87171', fontWeight: 600 }}>
            {isWsConnected ? 'WS LIVE' : 'RECONNECTING'}
          </span>
        </div>

        {/* Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem'
        }}>
          <Clock size={15} color="var(--text-muted)" />
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button 
          onClick={onTriggerDemo}
          disabled={isProcessingDemo}
          className="btn btn-primary"
          style={{ padding: '8px 14px' }}
          title="Run PRD Section 31 End-to-End Simulation"
        >
          {isProcessingDemo ? <Loader size={24} label="Generating demo video" /> : <Play size={16} fill="currentColor" />}
          <span>{isProcessingDemo ? 'SIMULATING...' : '1-CLICK DEMO'}</span>
        </button>

        <button 
          onClick={onOpenUpload}
          className="btn btn-secondary"
          style={{ padding: '8px 14px' }}
        >
          <Upload size={16} />
          <span>UPLOAD MP4</span>
        </button>

        <button 
          onClick={onOpenPolicy}
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
          title="Zone Safety Rules"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
