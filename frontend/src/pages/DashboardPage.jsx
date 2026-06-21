import{useState,useEffect}from'react'
import{useNavigate}from'react-router-dom'
import{useAuth}from'../context/AuthContext'
import{api}from'../api'
import Sidebar from'../components/Sidebar'
import logoUrl from'../assets/logo.js'
const PlusIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const TrashIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
const EditIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
function TagInput({value,onChange,max=6}){
  const[input,setInput]=useState('')
  const add=e=>{if(e.key==='Enter'&&input.trim()){e.preventDefault();if(value.length>=max)return;onChange([...value,input.trim()]);setInput('')}}
  return(<div className="tag-input-wrap" onClick={()=>document.getElementById('taginp').focus()}>
    {value.map((t,i)=><span key={i} className="tag">{t}<button type="button" onClick={()=>onChange(value.filter((_,j)=>j!==i))}>×</button></span>)}
    {value.length<max&&<input id="taginp" className="tag-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={add} placeholder={value.length===0?'Escribe y presiona Enter...':''}/>}
  </div>)
}
function AddModal({onClose,onCreated}){
  const{user}=useAuth();const[name,setName]=useState('');const[tags,setTags]=useState([]);const[loading,setLoading]=useState(false);const[error,setError]=useState('')
  const submit=async e=>{e.preventDefault();if(!name.trim())return setError('El nombre es requerido');if(tags.length===0)return setError('Agrega al menos un dato');setLoading(true);try{const c=await api.createClass({user_id:user.id,name:name.trim(),details:tags});onCreated(c);onClose()}catch(err){setError(err.message)}finally{setLoading(false)}}
  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <h2 className="modal-title">Creando una clase</h2>
    {error&&<div className="alert alert-error">{error}</div>}
    <form onSubmit={submit}>
      <div className="form-group"><label className="form-label">Nombre de la clase</label><input className="form-input" placeholder="Ej. Introducción a la Programación" value={name} onChange={e=>setName(e.target.value)} autoFocus/></div>
      <div className="form-group"><label className="form-label">Datos <span style={{fontWeight:400,textTransform:'none'}}>(máx. 6, Enter)</span></label><TagInput value={tags} onChange={setTags}/></div>
      <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Creando...':'Crear'}</button></div>
    </form>
  </div></div>)
}
function DeleteModal({cls,onClose,onDeleted}){
  const{user}=useAuth();const[nip,setNip]=useState('');const[loading,setLoading]=useState(false);const[error,setError]=useState('')
  const submit=async e=>{e.preventDefault();setLoading(true);try{await api.deleteClass(cls.id,user.id,nip);onDeleted(cls.id);onClose()}catch(err){setError(err.message)}finally{setLoading(false)}}
  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <h2 className="modal-title" style={{color:'#991b1b'}}>Eliminar clase</h2>
    <p style={{fontSize:13,color:'#555',marginBottom:12}}>¿Eliminar <strong>{cls.name}</strong>? No se puede deshacer.</p>
    {error&&<div className="alert alert-error">{error}</div>}
    <form onSubmit={submit}>
      <div className="form-group"><label className="form-label">NIP para confirmar</label><input className="form-input" type="password" placeholder="NIP" value={nip} onChange={e=>setNip(e.target.value)} required autoFocus/></div>
      <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-danger" disabled={loading}>{loading?'Eliminando...':'Borrar clase'}</button></div>
    </form>
  </div></div>)
}
const COLORS=[{value:'#c0185a',light:'#ffe4ef',text:'#9a1039'},{value:'#7c3aed',light:'#ede9fe',text:'#5b21b6'},{value:'#1565c0',light:'#dbeafe',text:'#1e3a8a'},{value:'#2196f3',light:'#e3f2fd',text:'#1565c0'},{value:'#166534',light:'#dcfce7',text:'#14532d'},{value:'#212121',light:'#f5f5f5',text:'#111'}]
function ClassCard({cls,onDelete,onClick}){
  const col=COLORS.find(c=>c.value===cls.color)||COLORS[0]
  return(<div className="card" style={{cursor:'pointer'}}>
    <div className="card-strip" style={{background:cls.color||col.value}}/>
    <div className="card-body" onClick={onClick}>
      <div style={{fontSize:14,fontWeight:600,color:'#1a1a26',marginBottom:8}}>{cls.name}</div>
      {(cls.details||[]).slice(0,4).map((d,i)=><div key={i} style={{fontSize:11,color:'#888',marginBottom:2}}>{d}</div>)}
      <div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:5}}>
        {[cls.highlight_field1,cls.highlight_field2].filter(Boolean).map((h,i)=><span key={i} className="badge" style={{background:col.light,color:col.text}}>{h}</span>)}
      </div>
    </div>
    <div style={{display:'flex',gap:6,justifyContent:'flex-end',padding:'8px 14px',borderTop:'1px solid #f0f0f4'}}>
      <button className="btn-icon" onClick={e=>e.stopPropagation()}><EditIcon/></button>
      <button className="btn-icon danger" onClick={e=>{e.stopPropagation();onDelete(cls)}}><TrashIcon/></button>
    </div>
  </div>)
}
export default function DashboardPage(){
  const{user}=useAuth();const navigate=useNavigate()
  const[classes,setClasses]=useState([]);const[loading,setLoading]=useState(true);const[showAdd,setShowAdd]=useState(false);const[toDel,setToDel]=useState(null)
  useEffect(()=>{api.getClasses(user.id).then(setClasses).catch(console.error).finally(()=>setLoading(false))},[user.id])
  return(<div className="app-shell"><Sidebar/>
    <div className="main-content">
      <div className="topbar"><div className="topbar-left"><img src={logoUrl} alt="UAQ" className="topbar-logo"/><div><div className="page-title">Mis clases</div><div className="page-subtitle">{user.name} · Facultad de Informática</div></div></div></div>
      <div className="content">
        {loading?<div className="loading"><div className="spinner"/>Cargando...</div>
        :classes.length===0?<div className="empty-state"><div className="empty-icon">📚</div><h3>No tienes clases todavía</h3><p>Crea tu primera clase para comenzar.</p><button className="btn btn-primary" onClick={()=>setShowAdd(true)}><PlusIcon/>Añadir clase</button></div>
        :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>{classes.map(c=><ClassCard key={c.id} cls={c} onDelete={setToDel} onClick={()=>navigate(`/clase/${c.id}`)}/>)}</div>}
      </div>
      {classes.length>0&&<div className="bottom-bar" style={{justifyContent:'center'}}><button className="btn btn-primary" onClick={()=>setShowAdd(true)}><PlusIcon/>Añadir clase</button></div>}
    </div>
    {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onCreated={c=>setClasses(p=>[...p,c])}/>}
    {toDel&&<DeleteModal cls={toDel} onClose={()=>setToDel(null)} onDeleted={id=>setClasses(p=>p.filter(c=>c.id!==id))}/>}
  </div>)
}
