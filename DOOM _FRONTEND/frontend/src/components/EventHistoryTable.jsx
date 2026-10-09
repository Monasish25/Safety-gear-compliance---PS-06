import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Download
} from 'lucide-react';

export default function EventHistoryTable({ 
  events, 
  onSelectEvent 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = events.filter(e => {
    const matchesSearch = 
      (e.worker_track_id && e.worker_track_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.zone_id && e.zone_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.event_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL': return <span className="badge badge-critical">CRITICAL</span>;
      case 'HIGH': return <span className="badge badge-high">HIGH</span>;
      case 'MEDIUM': return <span className="badge badge-medium">MEDIUM</span>;
      default: return <span className="badge badge-low">LOW</span>;
    }
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '18px',
      overflow: 'hidden'
    }}>
      {/* Table Header Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--accent-cyan)" />
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            Safety Incident Audit Log & History
          </h3>
          <span style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            ({filtered.length} RECORDS)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 10px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search track, zone, hazard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              fontSize: '0.75rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        background: '#090d16'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{
              background: 'var(--bg-elevated)',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              textAlign: 'left'
            }}>
              <th style={{ padding: '10px 14px' }}>TIMESTAMP</th>
              <th style={{ padding: '10px 14px' }}>EVENT TYPE</th>
              <th style={{ padding: '10px 14px' }}>SEVERITY</th>
              <th style={{ padding: '10px 14px' }}>ZONE</th>
              <th style={{ padding: '10px 14px' }}>TRACK ID</th>
              <th style={{ padding: '10px 14px' }}>STATUS</th>
              <th style={{ padding: '10px 14px' }}>EVIDENCE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No incident records found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr 
                  key={item.id}
                  onClick={() => onSelectEvent(item)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {new Date(item.started_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {item.event_type.replace('_', ' ')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {getSeverityBadge(item.severity)}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {item.zone_id || 'General Bay'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {item.worker_track_id || 'HAZARD'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className={`badge ${item.status === 'NEW' ? 'badge-new' : item.status === 'ACKNOWLEDGED' ? 'badge-ack' : 'badge-resolved'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                    >
                      <ExternalLink size={12} />
                      <span>VIEW</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
