export default function Icon({ name }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'search') return <svg {...common}><circle cx="10.8" cy="10.8" r="6.4" /><path d="m16 16 4 4" /></svg>
  if (name === 'download') return <svg {...common}><path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3" /></svg>
  if (name === 'pdf') return <svg {...common}><path d="M7 3h7l5 5v13H7zM14 3v6h5M9 15h6M9 18h4" /></svg>
  if (name === 'reset') return <svg {...common}><path d="M4 7v5h5M5 12a7 7 0 1 0 2-5" /></svg>
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
  if (name === 'external') return <svg {...common}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>
  return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>
}
