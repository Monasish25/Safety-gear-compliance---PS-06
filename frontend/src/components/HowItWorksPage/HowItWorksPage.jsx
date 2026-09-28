import { useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import NavbarClock from '../LiveMonitoringPage/NavbarClock/NavbarClock.jsx'
import EngineeringBrief from './EngineeringBrief/EngineeringBrief.jsx'
import ProcessingTopology from './ProcessingTopology/ProcessingTopology.jsx'
import Subsystems from './Subsystems/Subsystems.jsx'
import TechnologyStack from './TechnologyStack/TechnologyStack.jsx'
import CallToAction from './CallToAction/CallToAction.jsx'
import HowFooter from './Footer/HowFooter.jsx'
import ComplianceBanner from './ComplianceBanner/ComplianceBanner.jsx'
import SystemHealth from './SystemHealth/SystemHealth.jsx'
import ScrollTop from './ScrollTop/ScrollTop.jsx'
import './HowItWorksPage.css'

export default function HowItWorksPage({user,onHome,onLive,onIncidents,onAnalytics,onSignOut}) {
 const [paused,setPaused]=useState(false),[broadcasting,setBroadcasting]=useState(false),[muted,setMuted]=useState(false)
 const topologyRef=useRef(null)
 function confirmNavigation(destination){window.alert(`Navigation requested: ${destination}. Use the top navigation to open available dashboard pages.`)}
 return <div className="how-page min-h-screen text-white"><div className="how-nav"><Navbar user={user} activePage="how" onOpenHome={onHome} onOpenLive={onLive} onOpenIncidents={onIncidents} onOpenAnalytics={onAnalytics} onOpenHow={()=>{}} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={()=>setBroadcasting(value=>!value)} utcTime={<NavbarClock/>} muted={muted} onToggleMute={()=>setMuted(value=>!value)}/></div>{broadcasting&&<div className="how-broadcast"><i/> EMERGENCY BROADCAST ACTIVE <button aria-label="Dismiss emergency broadcast" onClick={()=>setBroadcasting(false)}>DISMISS</button></div>}<main className="how-main"><EngineeringBrief/><ComplianceBanner/><div ref={topologyRef}><ProcessingTopology paused={paused} onToggle={()=>setPaused(value=>!value)}/></div><Subsystems/><TechnologyStack/><SystemHealth/><CallToAction onNavigate={confirmNavigation}/><HowFooter/></main><ScrollTop onClick={()=>topologyRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}/></div>
}
