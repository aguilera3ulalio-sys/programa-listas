import{useState,useEffect}from'react'
import{useParams,useNavigate}from'react-router-dom'
import{api}from'../api'
import Sidebar from'../components/Sidebar'
import logoUrl from'../assets/logo.js'
const PlusIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const TrashIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
const SaveIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const NAMES=['Primer parcial','Segundo parcial','Tercer parcial','Cuarto parcial','Quinto parcial']
export default function PeriosPage(){
  const{id}=useParams();const navigate=useNavigate()
  const[periods,setPeriods]=useState([]);const[models,setModels]=useState([]);const[clsName,setClsName]=useState('');const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState('');const[msg,setMsg]=useState('')
  useEffect(()=>{Promise.all([api.getPeriods(id),api.getModels(id),api.getClass(id)]).then(([p,m,c])=>{setPeriods(p);setModels(m);setClsName(c.name)}).catch(console.error).finally(()=>setLoading(false))},[id])
  const update=(i,f,v)=>{setPeriods(p=>p.map((x,j)=>j===i?{...x,[f]:v}:x));setError('')}
  const addPeriod=()=>{if(periods.length>=5)return;setPeriods(p=>[...p,{id:null,class_id:id,name:NAMES[p.length]||`Parcial ${p.length+1}`,start_date:'',end_date:'',weight:parseFloat((100/(p.length+1)).toFixed(2)),model_id:models[0]?.id||null,position:p.length}])}
  const removePeriod=i=>{if(periods.length<=1)return;setPeriods(p=>p.filter((_,j)=>j!==i))}
  const handleSave=async()=>{const tot=periods.reduce((s,p)=>s+(parseFloat(p.weight)||0),0);if(Math.abs(tot-100)>0.5)return setError(`Suma debe ser 100%. Actual: ${tot.toFixed(1)}%`);setSaving(true);try{const saved=await api.savePeriods(id,periods.map(p=>({name:p.name,start_date:p.start_date||null,end_date:p.end_date||null,weight:parseFloat(p.weight)||33.33,model_id:p.model_id?parseInt(p.model_id):null})));setPeriods(saved);setMsg('Guardado');setTimeout(()=>setMsg(''),2500)}catch(err){setError(err.message)}finally{setSaving(false)}}
  const tot=periods.reduce((s,p)=>s+(parseFloat(p.weight)||0),0);const valid=Math.abs(tot-100)<0.5
  return(<div className="app-shell"><Sidebar/><div className="main-content">
    <div className="topbar"><div className="topbar-left"><img src={logoUrl} alt="UAQ" className="topbar-logo"/><div className="topbar-breadcrumb"><button className="back-link" onClick={()=>navigate(`/clase/${id}`)}>← {clsName}</button><span className="page-title">Periodos</span></div></div></div>
    <div className="content" style={{maxWidth:720}}>
      <p style={{fontSize:13,color:'#888',marginBottom:20,lineHeight:1.6}}>Define fechas, modelo y ponderación de cada parcial. La suma debe ser <strong>100%</strong>.</p>
      {msg&&<div className="alert alert-success">{msg}</div>}
      {error&&<div className="alert alert-error">{error}</div>}
      {loading?<div className="loading"><div className="spinner"/>Cargando...</div>:(<>
        <div className="card" style={{marginBottom:16}}><div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f5f5f8'}}>
              {['Parcial','Fecha inicio','Fecha fin','Modelo de evaluación','Peso %',''].map((h,i)=><th key={i} style={{padding:'10px 14px',textAlign:i===4?'center':'left',fontSize:10,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #e0e0e8'}}>{h}</th>)}
            </tr></thead>
            <tbody>{periods.map((p,i)=>(<tr key={i} style={{borderBottom:i<periods.length-1?'1px solid #f0f0f4':'none'}}>
              <td style={{padding:'10px 14px'}}><input className="form-input" value={p.name} onChange={e=>update(i,'name',e.target.value)} style={{fontWeight:500}}/></td>
              <td style={{padding:'10px 14px'}}><input type="date" className="form-input" value={p.start_date||''} onChange={e=>update(i,'start_date',e.target.value)}/></td>
              <td style={{padding:'10px 14px'}}><input type="date" className="form-input" value={p.end_date||''} onChange={e=>update(i,'end_date',e.target.value)}/></td>
              <td style={{padding:'10px 14px'}}><select className="form-select" value={p.model_id||''} onChange={e=>update(i,'model_id',e.target.value?parseInt(e.target.value):null)}><option value="">Sin modelo</option>{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
              <td style={{padding:'10px 14px',textAlign:'center'}}><div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'center'}}><input type="number" min="0" max="100" step="0.01" className="form-input" value={p.weight} onChange={e=>update(i,'weight',e.target.value)} style={{width:70,textAlign:'right'}}/><span style={{fontSize:12,color:'#888'}}>%</span></div></td>
              <td style={{padding:'10px 14px',textAlign:'center'}}><button className="btn-icon danger" onClick={()=>removePeriod(i)} disabled={periods.length<=1}><TrashIcon/></button></td>
            </tr>))}</tbody>
          </table>
        </div></div>
        <div style={{display:'flex',alignItems:'center',gap:14,padding:'10px 16px',borderRadius:8,marginBottom:16,background:valid?'#f0fdf4':'#fef2f2',border:`1px solid ${valid?'#86efac':'#fca5a5'}`}}>
          <span style={{fontSize:13,fontWeight:600,color:valid?'#15803d':'#991b1b'}}>Total: {tot.toFixed(1)}%</span>
          {!valid&&<span style={{fontSize:12,color:'#991b1b'}}>{tot>100?`Excede ${(tot-100).toFixed(1)}%`:`Faltan ${(100-tot).toFixed(1)}%`}</span>}
          {valid&&<span style={{fontSize:12,color:'#15803d'}}>✓ Correcto</span>}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
          <button className="btn" onClick={addPeriod} disabled={periods.length>=5}><PlusIcon/> Agregar parcial</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}><SaveIcon/>{saving?'Guardando...':'Guardar cambios'}</button>
        </div>
      </>)}
    </div>
  </div></div>)
}
