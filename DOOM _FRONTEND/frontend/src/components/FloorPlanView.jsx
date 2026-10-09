import React from 'react';
import { Map, Camera, AlertCircle, Shield, Flame, HardHat } from 'lucide-react';

export default function FloorPlanView({ zones, activeAlerts, selectedCamera, onSelectZone }) {
  // Check if each zone has an active un-resolved alert
  const getZoneStatus = (zoneId) => {
    const active = activeAlerts.filter(a => a.zone_id === zoneId && a.status !== 'RESOLVED');
    if (active.length === 0) return { status: 'SAFE', color: '#10b981', alert: null };
    const hasCritical = active.some(a => a.severity === 'CRITICAL');
    const hasHigh = active.some(a => a.severity === 'HIGH');
    if (hasCritical) return { status: 'CRITICAL', color: '#ef4444', alert: active[0] };
    if (hasHigh) return { status: 'HIGH', color: '#f97316', alert: active[0] };
    return { status: 'MEDIUM', color: '#eab308', alert: active[0] };
  };

  const assemblyState = getZoneStatus('ZONE_ASSEMBLY');
  const weldingState = getZoneStatus('ZONE_WELDING');
  const chemicalState = getZoneStatus('ZONE_CHEMICAL');

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Map size={17} color="var(--accent-cyan)" />
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.92rem',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            Factory 2D Floor Plan Overview
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            SAFE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fb923c' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }}></span>
            HIGH
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
            CRITICAL
          </span>
        </div>
      </div>

      {/* Interactive SVG Floor Plan */}
      <div style={{
        flex: 1,
        background: '#090d16',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}>
        <svg 
          viewBox="0 0 800 420" 
          style={{ width: '100%', height: '100%', maxHeight: '280px' }}
        >
          <defs>
            <radialGradient id="cam-fov" cx="0%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </radialGradient>
            <radialGradient id="cam2-fov" cx="100%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* Floor grid lines */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
          <rect width="800" height="420" fill="url(#grid)" />

          {/* ZONE 1: Assembly Zone */}
          <g 
            onClick={() => onSelectZone('ZONE_ASSEMBLY')}
            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
          >
            <rect 
              x="30" y="30" width="350" height="230" rx="8" 
              fill={assemblyState.status !== 'SAFE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)'}
              stroke={assemblyState.color}
              strokeWidth={assemblyState.status !== 'SAFE' ? 2 : 1.5}
              strokeDasharray={assemblyState.status !== 'SAFE' ? "4 4" : "none"}
            />
            <text x="50" y="65" fill="#f1f5f9" fontSize="14" fontFamily="Outfit" fontWeight="700">
              ASSEMBLY ZONE
            </text>
            <text x="50" y="85" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
              Policy: Helmet + Hi-Vis Vest
            </text>
            <text x="50" y="105" fill={assemblyState.color} fontSize="11" fontFamily="JetBrains Mono" fontWeight="600">
              Status: {assemblyState.status}
            </text>
            {assemblyState.status !== 'SAFE' && (
              <circle cx="340" cy="55" r="8" fill="#ef4444" className="radar-beacon alert" />
            )}
          </g>

          {/* ZONE 2: Welding Zone */}
          <g 
            onClick={() => onSelectZone('ZONE_WELDING')}
            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
          >
            <rect 
              x="420" y="30" width="350" height="230" rx="8" 
              fill={weldingState.status !== 'SAFE' ? 'rgba(249, 115, 22, 0.14)' : 'rgba(16, 185, 129, 0.08)'}
              stroke={weldingState.color}
              strokeWidth={weldingState.status !== 'SAFE' ? 2 : 1.5}
            />
            <text x="440" y="65" fill="#f1f5f9" fontSize="14" fontFamily="Outfit" fontWeight="700">
              WELDING ZONE
            </text>
            <text x="440" y="85" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
              Policy: Helmet + Vest + Gloves [High Risk]
            </text>
            <text x="440" y="105" fill={weldingState.color} fontSize="11" fontFamily="JetBrains Mono" fontWeight="600">
              Status: {weldingState.status}
            </text>
            {weldingState.status !== 'SAFE' && (
              <circle cx="730" cy="55" r="8" fill="#f97316" className="radar-beacon alert" />
            )}
          </g>

          {/* ZONE 3: Chemical Storage Annex */}
          <g 
            onClick={() => onSelectZone('ZONE_CHEMICAL')}
            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
          >
            <rect 
              x="30" y="280" width="740" height="110" rx="8" 
              fill={chemicalState.status !== 'SAFE' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.08)'}
              stroke={chemicalState.color}
              strokeWidth={chemicalState.status !== 'SAFE' ? 2 : 1.5}
            />
            <text x="50" y="315" fill="#f1f5f9" fontSize="14" fontFamily="Outfit" fontWeight="700">
              CHEMICAL STORAGE & HAZMAT ANNEX
            </text>
            <text x="50" y="335" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
              Policy: Helmet + Vest + Gloves + Chemical Mask [Critical Risk]
            </text>
            <text x="50" y="355" fill={chemicalState.color} fontSize="11" fontFamily="JetBrains Mono" fontWeight="600">
              Status: {chemicalState.status}
            </text>
          </g>

          {/* CAMERA 1 Marker and Field of View Cone */}
          <g transform="translate(390, 20)">
            <polygon points="0,15 -180,180 180,180" fill="url(#cam-fov)" />
            <circle cx="0" cy="15" r="14" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
            <text x="-12" y="19" fill="#00f0ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">C1</text>
          </g>

          {/* CAMERA 2 Marker */}
          <g transform="translate(390, 275)">
            <circle cx="0" cy="15" r="14" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
            <text x="-12" y="19" fill="#00f0ff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">C2</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
