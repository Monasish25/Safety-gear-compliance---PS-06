import { useEffect, useState } from 'react'

export function formatUtc(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
}

export function useUtcTimestamp() {
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().replace('T', ' ').replace('Z', ''))
  useEffect(() => {
    const timer = window.setInterval(() => setTimestamp(new Date().toISOString().replace('T', ' ').replace('Z', '')), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return timestamp
}
