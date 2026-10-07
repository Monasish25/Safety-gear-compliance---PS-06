// Feed catalogue — IDs match CCTV_CAMERAS in backend/app/detector.py
export const feedList = [
  {
    id: 'CAM-01',
    zone: 'ZONE_WELDING',
    shortZone: 'WELD B4',
    place: 'WELDING BAY - SECTOR B4',
    status: '1 WARNING',
    tone: 'warning',
    position: '18% 50%',
    videoUrl: '/storage/demo_video/13751987_3840_2160_50fps.mp4',
    altUrl: 'http://localhost:8000/storage/demo_video/13751987_3840_2160_50fps.mp4',
  },
  {
    id: 'CAM-02',
    zone: 'ZONE_ASSEMBLY',
    shortZone: 'ASSM A',
    place: 'ASSEMBLY LINE - SECTOR A',
    status: 'SECURE',
    tone: 'normal',
    position: '60% 38%',
    videoUrl: '/storage/demo_video/14990691_2160_3840_30fps.mp4',
    altUrl: 'http://localhost:8000/storage/demo_video/14990691_2160_3840_30fps.mp4',
  },
  {
    id: 'CAM-03',
    zone: 'ZONE_LOADING',
    shortZone: 'DOCK S',
    place: 'LOADING DOCK - SOUTH GATE',
    status: 'NORMAL',
    tone: 'normal',
    position: '85% 68%',
    videoUrl: '/storage/demo_video/19832492-hd_1920_1080_25fps.mp4',
    altUrl: 'http://localhost:8000/storage/demo_video/19832492-hd_1920_1080_25fps.mp4',
  },
  {
    id: 'CAM-04',
    zone: 'ZONE_PERIMETER',
    shortZone: 'PERIM E',
    place: 'PERIMETER - EAST FENCE',
    status: 'CLEAR',
    tone: 'normal',
    position: '42% 20%',
    videoUrl: '/storage/demo_video/42923-434300950.mp4',
    altUrl: 'http://localhost:8000/storage/demo_video/42923-434300950.mp4',
  },
]

export const initialThreats = [
  { id: 'THR-8821', kind: 'critical', title: 'FIRE DETECTED', time: '09:41:55 UTC', location: 'LOCATION: Zone B4 • Station B4-3 (Welding)', description: 'Thermal sensor spike at robotic welding cell. Peak surface temperature exceeds site threshold.', actions: ['TRIGGER ALARM', 'DISPATCH MARSHAL', 'ACK'] },
  { id: 'THR-8820', kind: 'warning', title: 'NO HELMET DETECTED', time: '09:41:31 UTC', location: 'LOCATION: Zone C2 • Gantry Transit Corridor', description: 'Contractor detected in active transit corridor without required head protection.', actions: ['SPEAKER WARNING', 'LOG VIOLATION'] },
  { id: 'THR-8819', kind: 'critical', title: 'SMOKE DENSITY SPIKE', time: '09:40:58 UTC', location: 'LOCATION: Zone A1 • Diesel Generator Staging', description: 'Aerosol density increased above the configured ventilation response threshold.', actions: ['ACTIVATE EXHAUST', 'ISOLATE POWER'] },
  { id: 'THR-8818', kind: 'warning', title: 'MISSING SAFETY VEST', time: '09:38:12 UTC', location: 'LOCATION: Zone B1 • Automated Crane Perimeter', description: 'Ground crew member detected outside the marked safe lane without high visibility PPE.', actions: [] },
  { id: 'THR-8817', kind: 'resolved', title: 'RESTRICTED ENTRY CLEARED', time: '09:34:02 UTC', location: 'LOCATION: Zone A3 • High Voltage Vault', description: 'Authorized NFC badge override verified. Access event recorded and cleared.' },
]

export const randomThreats = [
  { kind: 'warning', title: 'PPE CHECK REQUIRED', location: 'LOCATION: Zone B2 • Assembly Line 04', description: 'Vision classifier flagged a worker for a secondary PPE inspection.' },
  { kind: 'critical', title: 'THERMAL ANOMALY', location: 'LOCATION: Zone C4 • Boiler Manifold', description: 'Thermal array registered a rapid temperature rise on an active system.' },
  { kind: 'warning', title: 'PERIMETER MOTION', location: 'LOCATION: Zone D1 • East Loading Dock', description: 'Unscheduled motion detected inside a restricted perimeter.' },
  { kind: 'resolved', title: 'ACCESS EVENT CLEARED', location: 'LOCATION: Zone A2 • Service Gate', description: 'Authorized access confirmed; automated verification completed.' },
]

export const zones = ['ALL ZONES (24)', 'ZONE A - HEAVY FABRICATION (8)', 'ZONE B - SMELTING & ASSEMBLY (6)', 'ZONE C - CHEMICAL & LOADING (10)']
