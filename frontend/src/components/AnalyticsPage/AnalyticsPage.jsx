import { useEffect, useRef, useState } from 'react'
import Navbar from '../HomePage/Navbar/Navbar.jsx'
import NavbarClock from '../LiveMonitoringPage/NavbarClock/NavbarClock.jsx'
import TelemetryStrip from './TelemetryStrip/TelemetryStrip.jsx'
import KpiSummary from './KpiSummary/KpiSummary.jsx'
import Charts from './Charts/Charts.jsx'
import Insights from './Insights/Insights.jsx'
import RiskLedger from './RiskLedger/RiskLedger.jsx'
import AnalyticsFooter from './Footer/AnalyticsFooter.jsx'
import AnalyticsToast from './Toast/AnalyticsToast.jsx'
import TuneModal from './TuneModal/TuneModal.jsx'
import './AnalyticsPage.css'

export default function AnalyticsPage({user,onHome,onLive,onIncidents,onHow,onSignOut}) {
 const [sector,setSector]=useState('GLOBAL'),[syncing,setSyncing]=useState(false),[revision,setRevision]=useState(0),[modal,setModal]=useState(''),[toast,setToast]=useState(''),[broadcasting,setBroadcasting]=useState(false),[muted,setMuted]=useState(false)
 const timer=useRef(null)
 useEffect(()=>()=>{window.clearTimeout(timer.current)},[])
 function notify(message){setToast(message);window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>setToast(''),3200)}
 function resync(){if(syncing)return;setSyncing(true);window.setTimeout(()=>{setSyncing(false);setRevision(v=>v+1);notify('Analytics re-synced successfully')},2000)}
 function confirmAction(action){if(window.confirm(`Confirm ${action}?`))notify(`${action} request confirmed`)}
 function saveTune(level){const zone=modal;setModal('');notify(`${zone} sensitivity set to level ${level}`)}
 return <div className="analytics-page min-h-screen text-white"><div className="analytics-nav"><Navbar user={user} activePage="analytics" onOpenHome={onHome} onOpenLive={onLive} onOpenIncidents={onIncidents} onOpenAnalytics={()=>{}} onOpenHow={onHow} onSignOut={onSignOut} broadcasting={broadcasting} onBroadcast={()=>{setBroadcasting(v=>!v);notify(broadcasting?'Emergency broadcast cancelled':'Emergency broadcast activated')}} utcTime={<NavbarClock/>} muted={muted} onToggleMute={()=>setMuted(v=>!v)}/></div>{broadcasting&&<div className="analytics-broadcast"><i className="pulse-red"/> EMERGENCY BROADCAST ACTIVE <button onClick={()=>setBroadcasting(false)}>DISMISS</button></div>}<main className="analytics-main"><TelemetryStrip sector={sector} setSector={setSector} onResync={resync} syncing={syncing}/><KpiSummary sector={sector} revision={revision}/><Charts sector={sector}/><section className="analytics-bottom"><Insights onAction={confirmAction}/><RiskLedger onTune={setModal}/></section><AnalyticsFooter/></main>{modal&&<TuneModal zone={modal} onClose={()=>setModal('')} onSave={saveTune}/>}<AnalyticsToast message={toast}/></div>
}
