export const startingIncidents = [
  { id: 'INC-9482', time: '09:41:55', zone: 'Zone B4', camera: 'CAM-04', classifier: 'Fire', classification: 'Fire Detected', context: 'Thermal Flare', severity: 'CRITICAL', confidence: '98.6%', assignee: 'Marshall J. Chen', status: 'Dispatched', title: 'CRITICAL FIRE DETECTED - ZONE B4', subtitle: 'THERMAL RUNAWAY FLARE • ROBOTIC WELDING CELLS', temp: '74.2°C', obscuration: '22%', blur: '0.04', gps: [32.7767, -96.7970] },
  { id: 'INC-9481', time: '09:33:12', zone: 'Zone C2', camera: 'CAM-11', classifier: 'Smoke', classification: 'Smoke Emission', context: 'Chemical Exhaust', severity: 'WARNING', confidence: '94.2%', assignee: 'Officer D. Vance', status: 'Acknowledged', title: 'SMOKE EMISSION - ZONE C2', subtitle: 'CHEMICAL EXHAUST • VENTILATION BAY', temp: '42.8°C', obscuration: '38%', blur: '0.08', gps: [32.7771, -96.7962] },
  { id: 'INC-9480', time: '09:12:04', zone: 'Zone A1', camera: 'CAM-02', classifier: 'PPE Helm', classification: 'Missing Helmet', context: 'Crane Perimeter', severity: 'WARNING', confidence: '97.8%', assignee: 'Lead T. Kowalski', status: 'Notified', title: 'MISSING HELMET - ZONE A1', subtitle: 'PPE NON-COMPLIANCE • CRANE PERIMETER', temp: '26.1°C', obscuration: '0%', blur: '0.03', gps: [32.7763, -96.7975] },
  { id: 'INC-9479', time: '08:55:40', zone: 'Zone D3', camera: 'CAM-08', classifier: 'Breach', classification: 'Zone Breach', context: 'Automated AGV Path', severity: 'CRITICAL', confidence: '99.1%', assignee: 'System Audio Intercom', status: 'E-Stop Tripped', title: 'ZONE BREACH - ZONE D3', subtitle: 'RESTRICTED AGV PATH • AUTOMATIC E-STOP', temp: '28.4°C', obscuration: '0%', blur: '0.02', gps: [32.7758, -96.7968] },
  { id: 'INC-9478', time: '08:18:19', zone: 'Zone B1', camera: 'CAM-03', classifier: 'PPE Vest', classification: 'Missing Safety Vest', context: 'Staging Platform', severity: 'WARNING', confidence: '91.5%', assignee: 'Marshall K. Patel', status: 'Resolved', title: 'MISSING SAFETY VEST - ZONE B1', subtitle: 'PPE NON-COMPLIANCE • STAGING PLATFORM', temp: '25.6°C', obscuration: '0%', blur: '0.06', gps: [32.7769, -96.7981] },
  { id: 'INC-9477', time: '07:44:02', zone: 'Zone C4', camera: 'CAM-14', classifier: 'Fire', classification: 'Thermal Exceedance', context: 'Boiler Manifold', severity: 'CRITICAL', confidence: '99.8%', assignee: 'Engineering Squad B', status: 'Mitigated', title: 'THERMAL EXCEEDANCE - ZONE C4', subtitle: 'BOILER MANIFOLD • TEMPERATURE ABOVE LIMIT', temp: '88.7°C', obscuration: '4%', blur: '0.02', gps: [32.7774, -96.7959] },
  { id: 'INC-9476', time: '06:29:11', zone: 'Zone D1', camera: 'CAM-06', classifier: 'Breach', classification: 'Fallen Pallet Hazard', context: 'Bay Clear', severity: 'RESOLVED', confidence: '96.3%', assignee: 'Supervisor R. Gomez', status: 'Closed', title: 'FALLEN PALLET HAZARD - ZONE D1', subtitle: 'AISLE OBSTRUCTION • BAY CLEAR', temp: '24.2°C', obscuration: '0%', blur: '0.05', gps: [32.7759, -96.7978] },
  { id: 'INC-9475', time: '05:58:46', zone: 'Zone A3', camera: 'CAM-09', classifier: 'PPE Helm', classification: 'Missing Helmet', context: 'Tool Crib', severity: 'RESOLVED', confidence: '95.1%', assignee: 'Officer M. Lee', status: 'Closed', title: 'MISSING HELMET - ZONE A3', subtitle: 'PPE NON-COMPLIANCE • TOOL CRIB', temp: '25.0°C', obscuration: '0%', blur: '0.04', gps: [32.7765, -96.7964] },
  { id: 'INC-9474', time: '05:31:29', zone: 'Zone B2', camera: 'CAM-05', classifier: 'Smoke', classification: 'Smoke Emission', context: 'Welding Station', severity: 'RESOLVED', confidence: '92.7%', assignee: 'Marshall J. Chen', status: 'Closed', title: 'SMOKE EMISSION - ZONE B2', subtitle: 'WELDING STATION • AIR QUALITY REVIEW', temp: '39.6°C', obscuration: '19%', blur: '0.05', gps: [32.7770, -96.7972] },
  { id: 'INC-9473', time: '04:48:07', zone: 'Zone C1', camera: 'CAM-12', classifier: 'PPE Vest', classification: 'Missing Safety Vest', context: 'Service Corridor', severity: 'RESOLVED', confidence: '98.2%', assignee: 'Lead T. Kowalski', status: 'Closed', title: 'MISSING SAFETY VEST - ZONE C1', subtitle: 'PPE NON-COMPLIANCE • SERVICE CORRIDOR', temp: '23.9°C', obscuration: '0%', blur: '0.03', gps: [32.7762, -96.7969] },
  { id: 'INC-9472', time: '03:52:18', zone: 'Zone D2', camera: 'CAM-07', classifier: 'Breach', classification: 'Zone Breach', context: 'Loading Dock', severity: 'WARNING', confidence: '97.4%', assignee: 'System Audio Intercom', status: 'Dispatched', title: 'ZONE BREACH - ZONE D2', subtitle: 'RESTRICTED LOADING DOCK • ACCESS ALERT', temp: '27.3°C', obscuration: '0%', blur: '0.02', gps: [32.7756, -96.7965] },
  { id: 'INC-9471', time: '02:47:53', zone: 'Zone A2', camera: 'CAM-01', classifier: 'PPE Helm', classification: 'Missing Helmet', context: 'Fabrication Line', severity: 'RESOLVED', confidence: '93.6%', assignee: 'Officer D. Vance', status: 'Resolved', title: 'MISSING HELMET - ZONE A2', subtitle: 'PPE NON-COMPLIANCE • FABRICATION LINE', temp: '26.4°C', obscuration: '0%', blur: '0.05', gps: [32.7766, -96.7984] },
  { id: 'INC-9470', time: '01:39:20', zone: 'Zone B3', camera: 'CAM-10', classifier: 'Fire', classification: 'Thermal Exceedance', context: 'Cutting Bay', severity: 'RESOLVED', confidence: '98.9%', assignee: 'Engineering Squad B', status: 'Mitigated', title: 'THERMAL EXCEEDANCE - ZONE B3', subtitle: 'CUTTING BAY • HOT SURFACE WARNING', temp: '81.0°C', obscuration: '7%', blur: '0.03', gps: [32.7773, -96.7980] },
  { id: 'INC-9469', time: '00:56:14', zone: 'Zone C3', camera: 'CAM-13', classifier: 'Smoke', classification: 'Smoke Emission', context: 'Extraction Stack', severity: 'RESOLVED', confidence: '90.8%', assignee: 'Supervisor R. Gomez', status: 'Closed', title: 'SMOKE EMISSION - ZONE C3', subtitle: 'EXTRACTION STACK • SENSOR NORMALIZED', temp: '31.7°C', obscuration: '6%', blur: '0.09', gps: [32.7776, -96.7957] },
]

export const zones = ['All Zones', 'Zone A (Fab)', 'Zone B (Assy)', 'Zone C (Chem)', 'Zone D (Log)']
export const classifiers = ['All Types', 'Fire', 'Smoke', 'PPE Helm', 'PPE Vest', 'Breach']
export const severities = ['All', 'Critical', 'Warning', 'Safe / Resolved']
export const horizons = ['Today (May 18)', '24H', '7D', 'Custom']
export const eventPool = [
  { message: 'OPTICAL FLAME FLARE DETECTED', severity: 'critical' },
  { message: 'THERMAL SPIKE DETECTED', severity: 'critical' },
  { message: 'SMOKE DENSITY INCREASE', severity: 'warning' },
  { message: 'SENSOR PING', severity: 'neutral' },
  { message: 'AI MODEL RE-INFERENCE', severity: 'neutral' },
  { message: 'OPERATOR ACK', severity: 'resolved' },
  { message: 'MARSHALL DISPATCHED', severity: 'warning' },
]

export const initialEntries = [
  { time: '09:41:55.482', message: 'OPTICAL FLAME FLARE DETECTED', severity: 'critical' },
  { time: '09:41:55.319', message: 'THERMAL SPIKE DETECTED · 74.2°C', severity: 'critical' },
  { time: '09:41:54.901', message: 'AI MODEL RE-INFERENCE · 0.986', severity: 'neutral' },
  { time: '09:41:53.120', message: 'SENSOR PING · CAM-04-AXIS-PTZ-8K', severity: 'resolved' },
  { time: '09:41:51.738', message: 'MARSHALL DISPATCHED · UNIT 02', severity: 'warning' },
]

