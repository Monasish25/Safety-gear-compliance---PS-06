export function entriesForIncident(incident) {
  const leadEvent = incident.classifier === 'Fire'
    ? { message: 'THERMAL SPIKE DETECTED', severity: 'critical' }
    : incident.classifier === 'Smoke'
      ? { message: 'SMOKE DENSITY INCREASE', severity: 'warning' }
      : incident.classifier.startsWith('PPE')
        ? { message: `${incident.classification.toUpperCase()} · VISUAL MATCH`, severity: 'warning' }
        : { message: `${incident.classification.toUpperCase()} · ZONE EVENT`, severity: incident.severity === 'CRITICAL' ? 'critical' : 'resolved' }
  return [leadEvent, { message: `AI MODEL RE-INFERENCE · ${incident.confidence}`, severity: 'neutral' }, { message: `SENSOR PING · ${incident.camera}-AXIS-PTZ-8K`, severity: 'resolved' }, { message: `${incident.assignee.toUpperCase()} · ${incident.status.toUpperCase()}`, severity: 'warning' }]
}

export function randomTime() {
  const now = new Date()
  const part = (number, length = 2) => String(number).padStart(length, '0')
  return `${part(now.getUTCHours())}:${part(now.getUTCMinutes())}:${part(now.getUTCSeconds())}.${part(Math.floor(Math.random() * 1000), 3)}`
}
