import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Flame, 
  CloudFog, 
  HardHat, 
  Check, 
  ExternalLink, 
  Clock, 
  MapPin, 
  ShieldCheck,
  ChevronRight,
  UserX
} from 'lucide-react';

export default function LiveAlertFeed({ 
  alerts, 
  onSelectAlert, 
  onAcknowledge, 
  onResolve 
}) {
  const [filter, setFilter] = useState('ACTIVE'); // 'ACTIVE', 'ALL'

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'ACTIVE') return a.status === 'NEW' || a.status === 'ACKNOWLEDGED';
    return true;
  });

  const getEventIcon = (type) => {
    switch (type) {
      case 'FIRE_DETECTED':
        return <Flame size={18} color="#ef4444" />;
      case 'SMOKE_DETECTED':
        return <CloudFog size={18} color="#94a3b8" />;
      case 'MISSING_HELMET':
        return <HardHat size={18} color="#f97316" />;
      default:
        return <AlertTriangle size={18} color="#eab308" />;
    }
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      case 'LOW': return 'badge-low';
      default: return 'badge-low';
    }
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Feed Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--accent-cyan)" />
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Active Safety Alerts
          </h2>
          <span style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          }}>
            {filteredAlerts.length}
          </span>
        </div>

        {/* Filter Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-elevated)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setFilter('ACTIVE')}
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: filter === 'ACTIVE' ? 'var(--accent-cyan)' : 'transparent',
              color: filter === 'ACTIVE' ? '#000' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ACTIVE
          </button>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: filter === 'ALL' ? 'var(--accent-cyan)' : 'transparent',
              color: filter === 'ALL' ? '#000' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ALL
          </button>
        </div>
      </div>

      {/* Alert Cards List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {filteredAlerts.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '240px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px'
          }}>
            <ShieldCheck size={48} color="#10b981" style={{ marginBottom: '12px', opacity: 0.8 }} />
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              All Monitored Zones Compliant
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              Zero unconfirmed or active violations. Temporal engine is observing camera feed.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: alert.status === 'NEW' 
                  ? '1px solid rgba(239, 68, 68, 0.4)' 
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                position: 'relative',
                boxShadow: alert.status === 'NEW' ? '0 0 16px rgba(239,68,68,0.15)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getEventIcon(alert.event_type)}
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {alert.event_type.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className={`badge ${alert.status === 'NEW' ? 'badge-new' : alert.status === 'ACKNOWLEDGED' ? 'badge-ack' : 'badge-resolved'}`}>
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Meta details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={13} color="var(--text-muted)" />
                  <span>{alert.zone_id || 'General Bay'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <UserX size={13} color="var(--text-muted)" />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {alert.worker_track_id || 'Environmental'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} color="var(--text-muted)" />
                  <span>
                    {alert.started_at ? new Date(alert.started_at).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Conf:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {(alert.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Evidence Snapshot thumbnail preview if available */}
              {alert.snapshot_url && (
                <div 
                  onClick={() => onSelectAlert(alert)}
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    maxHeight: '110px',
                    border: '1px solid var(--border-subtle)'
                  }}
                  title="Click to inspect full annotated evidence"
                >
                  <img 
                    src={alert.snapshot_url} 
                    alt="Evidence" 
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ExternalLink size={11} />
                    <span>INSPECT EVIDENCE</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                {alert.status === 'NEW' && (
                  <button 
                    onClick={() => onAcknowledge(alert)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <span>ACKNOWLEDGE</span>
                  </button>
                )}

                {alert.status !== 'RESOLVED' && (
                  <button 
                    onClick={() => onResolve(alert)}
                    className="btn btn-success btn-sm"
                    style={{ flex: 1 }}
                  >
                    <Check size={14} />
                    <span>RESOLVE</span>
                  </button>
                )}

                <button 
                  onClick={() => onSelectAlert(alert)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '5px 8px' }}
                  title="View Incident Audit Trail"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
