import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Check, 
  Clock, 
  MapPin, 
  UserX, 
  FileText, 
  Send,
  Download,
  AlertTriangle
} from 'lucide-react';

export default function EvidenceModal({ 
  alert, 
  onClose, 
  onUpdateStatus 
}) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!alert) return null;

  const handleAction = async (status) => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(alert.id, status, note);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px' }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 15, 26, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color={alert.severity === 'CRITICAL' ? '#ef4444' : '#00f0ff'} />
            <div>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.05rem',
                fontWeight: 700
              }}>
                Safety Violation Evidence Snapshot
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                EVENT ID: {alert.id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Evidence Snapshot */}
          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#04070d',
            border: '1px solid var(--border-subtle)',
            maxHeight: '360px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {alert.snapshot_url ? (
              <img 
                src={alert.snapshot_url} 
                alt="Safety Evidence" 
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '360px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
                Annotated evidence processing or stored in local MinIO bucket.
              </div>
            )}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.75)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: '#00f0ff',
              border: '1px solid rgba(0,240,255,0.3)'
            }}>
              ANNOTATED DETECTION FRAME · 5 FPS
            </div>
          </div>

          {/* Incident Specs Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            background: 'var(--bg-elevated)',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>VIOLATION</span>
              <strong style={{ color: '#fff' }}>{alert.event_type.replace('_', ' ')}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>SEVERITY</span>
              <span className={`badge badge-${alert.severity?.toLowerCase()}`}>
                {alert.severity}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>TRACK ID</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {alert.worker_track_id || 'HAZARD'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>CONFIRMATION</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>
                ≥ 2.0s VERIFIED
              </span>
            </div>
          </div>

          {/* Audit History / Notes List */}
          {alert.actions && alert.actions.length > 0 && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Supervisor Audit Trail
              </h4>
              {alert.actions.map((act) => (
                <div key={act.id} style={{ fontSize: '0.75rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    [{new Date(act.timestamp).toLocaleTimeString()}]
                  </span>{' '}
                  <strong style={{ color: '#fff' }}>{act.action}</strong>: {act.note || 'No note attached.'}
                </div>
              ))}
            </div>
          )}

          {/* Supervisor Resolution Form */}
          {alert.status !== 'RESOLVED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Attach Supervisor Action Note:
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Spoke to technician; helmet retrieved from locker; hazard eliminated."
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                {alert.status === 'NEW' && (
                  <button
                    onClick={() => handleAction('ACKNOWLEDGED')}
                    disabled={isSubmitting}
                    className="btn btn-secondary"
                  >
                    <span>ACKNOWLEDGE</span>
                  </button>
                )}
                <button
                  onClick={() => handleAction('RESOLVED')}
                  disabled={isSubmitting}
                  className="btn btn-success"
                >
                  <Check size={16} />
                  <span>RESOLVE & CLOSE EVENT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
