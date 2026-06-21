import{useNavigate,useLocation}from'react-router-dom'
import{useAuth}from'../context/AuthContext'
import logoUrl from'../assets/logo.js'
const HomeIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
const CalIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><rect x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/><rect x="14" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/></svg>
const PendIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
const CfgIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const OutIcon=()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
export default function Sidebar(){
  const navigate=useNavigate(),location=useLocation(),{logout}=useAuth()
  const a=p=>location.pathname===p
  return(
    <aside className="sidebar">
      <img src={logoUrl} alt="UAQ FIF" className="sidebar-logo"/>
      {[['/','Inicio',<HomeIcon/>],['/calendario','Calendario',<CalIcon/>],['/pendientes','Pendientes',<PendIcon/>]].map(([path,label,icon])=>(
        <button key={path} className={`sidebar-item ${a(path)?'active':''}`} onClick={()=>navigate(path)}>{icon}<span>{label}</span></button>
      ))}
      <div className="sidebar-spacer"/>
      <button className={`sidebar-item ${a('/ajustes')?'active':''}`} onClick={()=>navigate('/ajustes')}><CfgIcon/><span>Ajustes</span></button>
      <button className="sidebar-item" onClick={()=>{logout();navigate('/login')}}><OutIcon/><span>Cerrar sesión</span></button>
    </aside>
  )
}
