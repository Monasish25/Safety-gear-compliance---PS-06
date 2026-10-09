import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import VideoPlayerView from './components/VideoPlayerView';
import LiveAlertFeed from './components/LiveAlertFeed';
import FloorPlanView from './components/FloorPlanView';
import EvidenceModal from './components/EvidenceModal';
import EventHistoryTable from './components/EventHistoryTable';
import AnalyticsView from './components/AnalyticsView';
import PolicyConfigModal from './components/PolicyConfigModal';
import VideoUploadModal from './components/VideoUploadModal';
import SupervisorCopilot from './components/SupervisorCopilot';
import Loader from './components/Loader';
import { Bot, BarChart3, History, Layers } from 'lucide-react';

export default function App() {
  // State
  const [cameras, setCameras] = useState([
    { id: 'CAM_01', name: 'Factory Floor - Main Bay', location_label: 'Bay 1 (Assembly & Welding)' },
    { id: 'CAM_02', name: 'Storage & HazMat Annex', location_label: 'Chemical Storage Bay' }
  ]);
  const [selectedCamera, setSelectedCamera] = useState('CAM_01');
  const [zones, setZones] = useState([]);
  const [ppeRules, setPpeRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Modals & Navigation
  const [selectedAlertForEvidence, setSelectedAlertForEvidence] = useState(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ANALYTICS'); // 'ANALYTICS' or 'HISTORY'
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isProcessingDemo, setIsProcessingDemo] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Active Video URL
  const [currentVideoUrl, setCurrentVideoUrl] = useState('/api/v1/videos/stream');

  // WebSocket Connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/alerts`;
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsWsConnected(true);
        console.log('Connected to Live Alert WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_ALERT') {
            const newAlert = data.alert;
            setAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
            refreshAnalytics();
          } else if (data.type === 'STATUS_UPDATE') {
            setAlerts(prev => prev.map(a => a.id === data.event.id ? data.event : a));
            refreshAnalytics();
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWs();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Fetch initial data
  const fetchData = async () => {
    setIsInitialLoading(true);
    try {
      // Cameras
      const camRes = await fetch('/api/v1/cameras');
      if (camRes.ok) {
        const camData = await camRes.json();
        if (camData.length > 0) setCameras(camData);
      }

      // Zones
      const zoneRes = await fetch('/api/v1/zones');
      if (zoneRes.ok) setZones(await zoneRes.json());

      // PPE Rules
      const rulesRes = await fetch('/api/v1/ppe-rules');
      if (rulesRes.ok) setPpeRules(await rulesRes.json());

      // Events
      const eventsRes = await fetch('/api/v1/events?limit=50');
      if (eventsRes.ok) setAlerts(await eventsRes.json());

      // Analytics
      await refreshAnalytics();
    } catch (err) {
      console.error('Initial data fetch error:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    try {
      const res = await fetch('/api/v1/analytics/summary');
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Actions
  const handleAcknowledge = async (alert) => {
    try {
      const res = await fetch(`/api/v1/events/${alert.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACKNOWLEDGED', note: 'Acknowledged from supervisor quick action.' })
      });
      if (res.ok) {
        const updated = await res.json();
        setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a));
        refreshAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = (alert) => {
    setSelectedAlertForEvidence(alert);
  };

  const handleUpdateStatus = async (eventId, status, note) => {
    const res = await fetch(`/api/v1/events/${eventId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note })
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts(prev => prev.map(a => a.id === eventId ? updated : a));
      refreshAnalytics();
    }
  };

  const handleSavePPERule = async (zoneId, ruleData) => {
    try {
      const res = await fetch(`/api/v1/ppe-rules/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      if (res.ok) {
        const updated = await res.json();
        setPpeRules(prev => prev.map(r => r.zone_id === zoneId ? updated : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1-Click Demo Launcher (PRD Section 31)
  const handleTriggerDemo = async () => {
    setIsProcessingDemo(true);
    try {
      const res = await fetch('/api/v1/demo/generate-and-run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start the demo video.');
      const data = await res.json();
      await new Promise(resolve => window.setTimeout(resolve, 3000));
      setCurrentVideoUrl(`/api/v1/videos/${data.video_id}/stream`);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingDemo(false);
    }
  };

  const handleUploadSuccess = (videoId) => {
    setCurrentVideoUrl(`/api/v1/videos/${videoId}/stream`);
    fetchData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <Navbar
        cameras={cameras}
        selectedCamera={selectedCamera}
        onSelectCamera={setSelectedCamera}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenPolicy={() => setIsPolicyModalOpen(true)}
        onTriggerDemo={handleTriggerDemo}
        isWsConnected={isWsConnected}
        isProcessingDemo={isProcessingDemo}
      />

      {isInitialLoading && (
        <div className="loader-page-overlay">
          <Loader size={120} label="Loading dashboard data" />
          <span>CONNECTING TO SAFETY SERVICES...</span>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main style={{
        flex: 1,
        padding: '0 24px 24px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.85fr) minmax(360px, 1fr)',
        gap: '20px'
      }}>
        {/* Left Column: Visual Monitoring & Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Upper Split: Live CCTV Stream + 2D Floor Plan */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.25fr 1fr',
            gap: '20px',
            minHeight: '440px'
          }}>
            <VideoPlayerView
              currentVideoUrl={currentVideoUrl}
              cameraName={cameras.find(c => c.id === selectedCamera)?.name}
              activeZoneLabel="Assembly & Welding"
              latestAlert={alerts[0]}
            />
            <FloorPlanView
              zones={zones}
              activeAlerts={alerts}
              selectedCamera={selectedCamera}
              onSelectZone={(zoneId) => setIsPolicyModalOpen(true)}
            />
          </div>

          {/* Lower Tabs: Analytics vs Event History */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('ANALYTICS')}
                  className="btn"
                  style={{
                    background: activeTab === 'ANALYTICS' ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                    color: activeTab === 'ANALYTICS' ? '#000' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  <BarChart3 size={15} />
                  <span>COMPLIANCE ANALYTICS</span>
                </button>

                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className="btn"
                  style={{
                    background: activeTab === 'HISTORY' ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                    color: activeTab === 'HISTORY' ? '#000' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  <History size={15} />
                  <span>INCIDENT AUDIT LOG</span>
                </button>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                AUDIT TRAIL COMPLIANT · NO PII / NO FACIAL RECOGNITION
              </div>
            </div>

            {activeTab === 'ANALYTICS' ? (
              <AnalyticsView analyticsData={analytics} />
            ) : (
              <EventHistoryTable
                events={alerts}
                onSelectEvent={(e) => setSelectedAlertForEvidence(e)}
              />
            )}
          </div>
        </div>

        {/* Right Column: Live Alert Feed */}
        <div style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: '24px' }}>
          <LiveAlertFeed
            alerts={alerts}
            onSelectAlert={(a) => setSelectedAlertForEvidence(a)}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
          />
        </div>
      </main>

      {/* Floating AI Copilot Trigger Button */}
      <button
        onClick={() => setIsCopilotOpen(!isCopilotOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 850,
          background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
          color: '#07090e',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '12px 20px',
          boxShadow: '0 8px 30px rgba(0, 240, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          fontSize: '0.85rem'
        }}
      >
        <Bot size={18} />
        <span>SUPERVISOR COPILOT</span>
      </button>

      {/* Floating Copilot Drawer */}
      <SupervisorCopilot
        latestAlert={alerts[0]}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />

      {/* Modals */}
      {selectedAlertForEvidence && (
        <EvidenceModal
          alert={selectedAlertForEvidence}
          onClose={() => setSelectedAlertForEvidence(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isPolicyModalOpen && (
        <PolicyConfigModal
          zones={zones}
          ppeRules={ppeRules}
          onClose={() => setIsPolicyModalOpen(false)}
          onSaveRule={handleSavePPERule}
        />
      )}

      {isUploadModalOpen && (
        <VideoUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          onTriggerDemo={handleTriggerDemo}
        />
      )}
    </div>
  );
}
