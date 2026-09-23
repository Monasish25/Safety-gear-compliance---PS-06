import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import { 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  PieChart as PieIcon
} from 'lucide-react';

export default function AnalyticsView({ analyticsData }) {
  if (!analyticsData) return null;

  // Transform data for charts
  const zoneBarData = Object.entries(analyticsData.by_zone || {}).map(([zone, count]) => ({
    name: zone,
    incidents: count,
    compliance: analyticsData.zone_compliance?.[zone] || 95.0
  }));

  const typePieData = Object.entries(analyticsData.by_type || {}).map(([type, count]) => ({
    name: type.replace('_', ' '),
    value: count
  }));

  const COLORS = ['#00f0ff', '#ef4444', '#f97316', '#eab308', '#3b82f6'];

  const trendData = [
    { time: '08:00', rate: 98.2 },
    { time: '10:00', rate: 96.5 },
    { time: '12:00', rate: 94.0 },
    { time: '14:00', rate: 95.8 },
    { time: '16:00', rate: 97.4 },
    { time: '18:00', rate: analyticsData.compliance_rate || 96.2 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 4 Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px'
      }}>
        {/* Metric 1 */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>OVERALL COMPLIANCE</span>
            <ShieldCheck size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-heading)' }}>
            {analyticsData.compliance_rate}%
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Target: ≥ 95.0% across all bays
          </span>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>TOTAL INCIDENTS</span>
            <AlertTriangle size={16} color="#f97316" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)' }}>
            {analyticsData.total_events}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#f87171' }}>
            {analyticsData.active_alerts} active un-resolved
          </span>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>FALSE ALERT RATE</span>
            <CheckCircle2 size={16} color="#00f0ff" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00f0ff', fontFamily: 'var(--font-heading)' }}>
            {analyticsData.false_alert_rate}%
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Suppressed via 2s temporal logic
          </span>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>AVG ACK TIME</span>
            <Clock size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)' }}>
            {analyticsData.avg_ack_time_seconds}s
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Supervisor responsiveness
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '16px'
      }}>
        {/* Chart 1: Incidents by Zone */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{
            fontSize: '0.85rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            Safety Incidents by Zone
          </h4>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                />
                <Bar dataKey="incidents" fill="#00f0ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Violations Distribution by Type */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{
            fontSize: '0.85rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            Hazard & Violation Distribution
          </h4>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
