import{useState,useEffect}from'react'
import{useParams,useNavigate}from'react-router-dom'
import{api}from'../api'
import Sidebar from'../components/Sidebar'
import logoUrl from'../assets/logo.js'
const TRAIT_KEYS=['actividades','tareas','proyecto','examen','practicas','asistencia','trabajos']
const TRAIT_LABELS={actividades:'Actividades',tareas:'Tareas',proyecto:'Proyecto',examen:'Examen',practicas:'Prácticas',asistencia:'Asistencia',trabajos:'Trabajos'}
const PlusIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const TrashIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
const SaveIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
function ModelCard({model,onSave,onDelete,periodsUsing}){
  const[name,setName]=useState(model.name)
  const[traits,setTraits]=useState(TRAIT_KEYS.map(k=>({trait_type:k,weight:model.traits.find(t=>t.trait_type===k)?.weight??0})))
  const[saving,setSaving]=useState(false);const[error,setError]=useState('')
  const total=traits.reduce((s,t)=>s+(parseFloat(t.weight)||0),0)
  const valid=Math.abs(total-100)<0.01||total===0
  const updateWeight=(key,val)=>{setTraits(p=>p.map(t=>t.trait_type===key?{...t,weight:val}:t));setError('')}
  const handleSave=async()=>{const active=traits.filter(t=>parseFloat(t.weight)>0);if(active.length>0&&Math.abs(total-100)>0.01)return setError(`Suma debe ser 100%. Actual: ${total.toFixed(1)}%`);setSaving(true);try{await onSave(model.id,{name,traits:traits.map(t=>({trait_type:t.trait_type,weight:parseFloat(t.weight)||0}))});setError('')}catch(err){setError(err.message)}finally{setSaving(false)}}
  return(<div className="card" style={{marginBottom:16}}><div className="card-body">
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
      <input className="form-input" value={name} onChange={e=>setName(e.target.value)} style={{fontWeight:600,fontSize:14,maxWidth:280}}/>
      {periodsUsing.length>0&&<span style={{fontSize:11,color:'#888',background:'#f0f0f5',padding:'3px 8px',borderRadius:6}}>Usado en: {periodsUsing.join(', ')}</span>}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 100px 40px',gap:'6px 12px',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'.05em'}}>Rasgo</div>
      <div style={{fontSize:10,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',textAlign:'center'}}>Ponderación %</div>
      <div/>
      {traits.map(t=>[
        <div key={`l${t.trait_type}`} style={{fontSize:13,color:'#1a1a26'}}>{TRAIT_LABELS[t.trait_type]}</div>,
        <div key={`i${t.trait_type}`} style={{display:'flex',alignItems:'center',gap:4}}><input type="number" min="0" max="100" step="1" value={t.weight} onChange={e=>updateWeight(t.trait_type,e.target.value)} className="form-input" style={{textAlign:'right',padding:'6px 10px'}}/><span style={{fontSize:12,color:'#888'}}>%</span></div>,
        <div key={`b${t.trait_type}`} style={{height:6,borderRadius:3,background:parseFloat(t.weight)>0?'var(--accent)':'#e0e0e8',width:`${Math.min(parseFloat(t.weight)||0,100)}%`,transition:'width .3s'}}/>
      ])}
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:8,background:valid?'#f0fdf4':'#fef2f2',border:`1px solid ${valid?'#86efac':'#fca5a5'}`,marginBottom:14}}>
      <span style={{fontSize:13,fontWeight:600,color:valid?'#15803d':'#991b1b'}}>Total: {total.toFixed(1)}%</span>
      {!valid&&total>0&&<span style={{fontSize:12,color:'#991b1b'}}>{total>100?`Excede ${(total-100).toFixed(1)}%`:`Faltan ${(100-total).toFixed(1)}%`}</span>}
    </div>
    {error&&<div className="alert alert-error" style={{marginBottom:12}}>{error}</div>}
    <div style={{display:'flex',gap:8,justifyContent:'space-between'}}>
      <button className="btn btn-danger btn-sm" onClick={()=>onDelete(model.id)} disabled={periodsUsing.length>0} title={periodsUsing.length>0?'En uso':''}><TrashIcon/> Eliminar</button>
      <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}><SaveIcon/>{saving?'Guardando...':'Guardar'}</button>
    </div>
  </div></div>)
}
export default function RasgosPage(){
  const{id}=useParams();const navigate=useNavigate()
  const[models,setModels]=useState([]);const[periods,setPeriods]=useState([]);const[loading,setLoading]=useState(true);const[clsName,setClsName]=useState('');const[msg,setMsg]=useState('')
  useEffect(()=>{Promise.all([api.getModels(id),api.getPeriods(id),api.getClass(id)]).then(([m,p,c])=>{setModels(m);setPeriods(p);setClsName(c.name)}).catch(console.error).finally(()=>setLoading(false))},[id])
  const handleSave=async(mid,data)=>{const u=await api.updateModel(mid,data);setModels(p=>p.map(m=>m.id===mid?u:m));setMsg('Guardado');setTimeout(()=>setMsg(''),2500)}
  const handleDelete=async mid=>{if(!confirm('¿Eliminar modelo?'))return;await api.deleteModel(mid);setModels(p=>p.filter(m=>m.id!==mid))}
  const handleAdd=async()=>{const m=await api.addModel(id,`Modelo ${models.length+1}`);setModels(p=>[...p,m])}
  const getUsing=mid=>periods.filter(p=>p.model_id===mid).map(p=>p.name)
  return(<div className="app-shell"><Sidebar/><div className="main-content">
    <div className="topbar"><div className="topbar-left"><img src={logoUrl} alt="UAQ" className="topbar-logo"/><div className="topbar-breadcrumb"><button className="back-link" onClick={()=>navigate(`/clase/${id}`)}>← {clsName}</button><span className="page-title">Rasgos</span></div></div></div>
    <div className="content" style={{maxWidth:620}}>
      <p style={{fontSize:13,color:'#888',marginBottom:20,lineHeight:1.6}}>Define los modelos de evaluación. Cada modelo establece qué % pesa cada evidencia. La suma debe ser <strong>100%</strong>.</p>
      {msg&&<div className="alert alert-success">{msg}</div>}
      {loading?<div className="loading"><div className="spinner"/>Cargando...</div>:(<>{models.map(m=><ModelCard key={m.id} model={m} onSave={handleSave} onDelete={handleDelete} periodsUsing={getUsing(m.id)}/>)}<button className="btn btn-primary" onClick={handleAdd} style={{marginTop:8}}><PlusIcon/> Agregar modelo</button></>)}
    </div>
  </div></div>)
}
