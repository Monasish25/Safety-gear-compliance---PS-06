import { useEffect, useState } from 'react'
import { formatUtc } from '../utils/liveTime.js'

export default function NavbarClock() {
  const [time, setTime] = useState(() => formatUtc(new Date()))
  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatUtc(new Date())), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return time
}
