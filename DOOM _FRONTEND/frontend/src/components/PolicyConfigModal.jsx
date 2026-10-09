import React, { useState } from 'react';
import { X, Settings, Shield, Check, Save } from 'lucide-react';

export default function PolicyConfigModal({ 
  zones, 
  ppeRules, 
  onClose, 
  onSaveRule 
}) {
  const [rulesState, setRulesState] = useState(ppeRules || []);
  const [savingZone, setSavingZone] = useState(null);

  const handleToggle = (zoneId, field) => {
    setRulesState(prev => prev.map(r => {
      if (r.zone_id === zoneId) {
        return { ...r, [field]: !r[field] };
      }
      return r;
    }));
  };

  const saveRule = async (zoneId) => {
    setSavingZone(zoneId);
    const rule = rulesState.find(r => r.zone_id === zoneId);
    if (rule) {
      await onSaveRule(zoneId, rule);
    }
    setSavingZone(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 15, 26, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
              Zone Safety Policy & PPE Configuration
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Configure mandatory PPE gear per factory zone. The vision engine checks workers against these rules with temporal confirmation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {zones.map(zone => {
              const rule = rulesState.find(r => r.zone_id === zone.id) || {
                helmet_required: true,
                vest_required: true,
                gloves_required: false,
                mask_required: false
              };

              return (
                <div 
                  key={zone.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{zone.name}</strong>
                      <span className={`badge badge-${zone.risk_level?.toLowerCase()}`} style={{ marginLeft: '10px' }}>
                        {zone.risk_level} RISK
                      </span>
                    </div>
                    <button
                      onClick={() => saveRule(zone.id)}
                      disabled={savingZone === zone.id}
                      className="btn btn-primary btn-sm"
                    >
                      <Save size={13} />
                      <span>{savingZone === zone.id ? 'SAVING...' : 'APPLY'}</span>
                    </button>
                  </div>

                  {/* Toggles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Hardhat/Helmet', field: 'helmet_required' },
                      { label: 'Hi-Vis Vest', field: 'vest_required' },
                      { label: 'Gloves', field: 'gloves_required' },
                      { label: 'Safety Mask', field: 'mask_required' },
                    ].map(item => (
                      <label 
                        key={item.field}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          color: rule[item.field] ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          background: rule[item.field] ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          border: rule[item.field] ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={rule[item.field] || false}
                          onChange={() => handleToggle(zone.id, item.field)}
                          style={{ accentColor: '#00f0ff' }}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
