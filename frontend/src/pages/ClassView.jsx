import{useState,useEffect,useCallback,useRef}from'react'
import{useParams,useNavigate,useLocation}from'react-router-dom'
import{useAuth}from'../context/AuthContext'
import{api}from'../api'
import Sidebar,{MenuButton} from '../components/Sidebar'
import ConfirmModal from '../components/ConfirmModal'
import{UsersIcon,CloseIcon,LinkIcon,ExternalIcon}from'../components/Icons'
import logoUrl from'../assets/logo.js'
const TRAITS={actividades:'Actividades',tareas:'Tareas',proyecto:'Proyecto',examen:'Examen',practicas:'Prácticas',asistencia:'Asistencia',trabajos:'Trabajos'}
const PlusIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const SaveIcon=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const TrashIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
const EditIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const dn=n=>n.split(' ').slice(0,2).join(' ')
// Partial and evidence averages keep decimals; only the final grade is rounded.
const fmt=v=>v==null?'—':String(Math.round(v*100)/100)
// Enter moves down the same column, like a spreadsheet.
const focusNext=(col,row)=>{const el=document.querySelector(`[data-cell="${col}-${row+1}"]`);if(el){el.focus();if(el.select)el.select()}}
const sortEs=list=>[...list].sort((a,b)=>a.full_name.localeCompare(b.full_name,'es',{sensitivity:'base',numeric:true}))
function AddStudentModal({classId,onClose,onAdded}){const[name,setName]=useState('');const[loading,setLoading]=useState(false);const[error,setError]=useState('');const submit=async e=>{e.preventDefault();if(!name.trim())return;setLoading(true);try{const s=await api.addStudent(classId,name.trim());onAdded(s);setName('')}catch(err){setError(err.message)}finally{setLoading(false)}};return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><h2 className="modal-title">Añadiendo alumno</h2><p style={{fontSize:12,color:'#888',marginBottom:14}}>Solo se muestran las dos primeras palabras.</p>{error&&<div className="alert alert-error">{error}</div>}<form onSubmit={submit}><div className="form-group"><label className="form-label">Nombre del alumno</label><input className="form-input" placeholder="Ej. Favio Jardínez Montiel" value={name} onChange={e=>setName(e.target.value)} autoFocus/></div><div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Agregando...':'Aceptar'}</button></div></form></div></div>)}
function EditStudentsModal({students,onClose,onUpdated,onDeleted}){
  const{user}=useAuth()
  const[editing,setEditing]=useState(null);const[editName,setEditName]=useState('')
  const[picked,setPicked]=useState([])            // multi-select for bulk delete
  const[confirming,setConfirming]=useState(null)  // array of students pending delete
  const[nip,setNip]=useState('')
  const[loading,setLoading]=useState(false);const[error,setError]=useState('')

  const togglePick=id=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const allPicked=students.length>0&&picked.length===students.length
  const toggleAll=()=>setPicked(allPicked?[]:students.map(s=>s.id))

  const saveEdit=async id=>{
    try{const u=await api.updateStudent(id,editName.trim());onUpdated(u);setEditing(null)}
    catch(err){setError(err.message)}
  }

  const handleDelete=async e=>{
    e.preventDefault();setError('');setLoading(true)
    try{
      for(const st of confirming){
        await api.deleteStudent(st.id,user.id,nip)
        onDeleted(st.id)
      }
      setConfirming(null);setNip('');setPicked([])
    }catch(err){setError(err.message)}finally{setLoading(false)}
  }

  return(<div className="modal-overlay" onClick={onClose}><div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
    <h2 className="modal-title">Editando alumnos</h2>
    {error&&<div className="alert alert-error">{error}</div>}
    {confirming?(
      <form onSubmit={handleDelete}>
        <p style={{fontSize:13,color:'#555',marginBottom:12}}>
          {confirming.length===1
            ?<>¿Eliminar a <strong>{dn(confirming[0].full_name)}</strong>?</>
            :<>¿Eliminar <strong>{confirming.length} alumnos</strong>? ({confirming.map(s=>dn(s.full_name)).join(', ')})</>}
          <br/>Se perderan sus calificaciones y asistencias.
        </p>
        <div className="form-group">
          <label className="form-label">NIP para confirmar</label>
          <input className="form-input" type="password" placeholder="NIP" value={nip} onChange={e=>setNip(e.target.value)} autoFocus required/>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={()=>{setConfirming(null);setNip('')}}>Cancelar</button>
          <button type="submit" className="btn btn-danger" disabled={loading}>{loading?'Eliminando...':'Eliminar'}</button>
        </div>
      </form>
    ):(<>
      {students.length>0&&(
        <div style={{display:'flex',alignItems:'center',gap:8,paddingBottom:8,borderBottom:'1px solid #e0e0e8',marginBottom:4}}>
          <input type="checkbox" checked={allPicked} onChange={toggleAll} style={{cursor:'pointer'}} id="selall"/>
          <label htmlFor="selall" style={{fontSize:12,color:'#888',cursor:'pointer',flex:1}}>
            {picked.length>0?`${picked.length} seleccionado${picked.length>1?'s':''}`:'Seleccionar todos'}
          </label>
          {picked.length>0&&(
            <button className="btn btn-danger btn-sm"
              onClick={()=>setConfirming(students.filter(s=>picked.includes(s.id)))}>
              <TrashIcon/> Eliminar ({picked.length})
            </button>
          )}
        </div>
      )}
      <div style={{maxHeight:340,overflowY:'auto'}}>
        {students.map(s=>(
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f0f0f4'}}>
            <input type="checkbox" checked={picked.includes(s.id)} onChange={()=>togglePick(s.id)} style={{cursor:'pointer'}}/>
            {editing===s.id
              ?<input className="form-input" value={editName} onChange={e=>setEditName(e.target.value)} style={{flex:1}} autoFocus onKeyDown={e=>e.key==='Enter'&&saveEdit(s.id)}/>
              :<span style={{flex:1,fontSize:13}}>{dn(s.full_name)}</span>}
            {editing===s.id
              ?<button className="btn btn-sm btn-primary" onClick={()=>saveEdit(s.id)}>Guardar</button>
              :<button className="btn-icon" onClick={()=>{setEditing(s.id);setEditName(s.full_name);setError('')}}><EditIcon/></button>}
            <button className="btn-icon danger" onClick={()=>setConfirming([s])}><TrashIcon/></button>
          </div>
        ))}
      </div>
      <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Cerrar</button></div>
    </>)}
  </div></div>)
}
function ImportStudentsModal({classId,existingNames,onClose,onImported}){
  const[text,setText]=useState('')
  const[preview,setPreview]=useState(null) // null = no preview yet
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')

  const HEADER_WORDS=new Set(['nombre','alumno','estudiante','name','student','nombres',
    'apellido','apellidos','no','num','numero','#','matricula','matrícula','expediente'])

  function parseNames(raw){
    const lines=raw.split(/\r?\n/)
    const existing=new Set(existingNames.map(n=>n.toLowerCase()))
    const seen=new Set()
    const toAdd=[]
    const dupes=[]

    for(const line of lines){
      // split por tab, coma o punto y coma
      const cells=line.split(/[\t,;]/)
      // celda más larga no puramente numérica
      const candidate=cells
        .map(c=>c.replace(/\s+/g,' ').trim())
        .filter(c=>c&&!/^\d+$/.test(c))
        .sort((a,b)=>b.length-a.length)[0]
      if(!candidate)continue
      if(HEADER_WORDS.has(candidate.toLowerCase()))continue
      const lower=candidate.toLowerCase()
      if(existing.has(lower)||seen.has(lower)){
        dupes.push(candidate)
      }else{
        seen.add(lower)
        toAdd.push(candidate)
      }
    }
    return{toAdd,dupes}
  }

  async function handleFile(e){
    const file=e.target.files[0]
    if(!file)return
    const XLSX=await import('xlsx')
    const data=await file.arrayBuffer()
    const wb=XLSX.read(data)
    const ws=wb.Sheets[wb.SheetNames[0]]
    const rows=XLSX.utils.sheet_to_csv(ws)
    setText(rows)
    const parsed=parseNames(rows)
    setPreview(parsed)
  }

  function handleTextChange(e){
    setText(e.target.value)
    setPreview(null)
  }

  function handlePreview(){
    setPreview(parseNames(text))
  }

  async function handleConfirm(){
    if(!preview||preview.toAdd.length===0)return
    setLoading(true)
    try{
      const result=await api.bulkAddStudents(classId,preview.toAdd)
      onImported(result.students)
      onClose()
    }catch(err){
      setError('Error al importar')
    }finally{
      setLoading(false)
    }
  }

  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500,width:'90%'}}>
        <h3>Importar lista de alumnos</h3>
        <p style={{fontSize:13,color:'#666'}}>Sube un archivo .xlsx, .xls o .csv, o pega los nombres directamente.</p>

        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{marginBottom:8}}/>

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="O pega los nombres aquí, uno por línea..."
          rows={8}
          style={{width:'100%',boxSizing:'border-box',marginBottom:8}}
        />

        {!preview&&(
          <button onClick={handlePreview} disabled={!text.trim()}>Vista previa</button>
        )}

        {preview&&(
          <div style={{marginBottom:12}}>
            <p><strong>Se agregarán {preview.toAdd.length} alumnos</strong></p>
            <ol style={{maxHeight:200,overflowY:'auto',margin:'4px 0'}}>
              {preview.toAdd.map((n,i)=><li key={i}>{n}</li>)}
              {preview.dupes.map((n,i)=>(
                <li key={'d'+i} style={{color:'#aaa',textDecoration:'line-through'}}>{n} (duplicado)</li>
              ))}
            </ol>
            {error&&<p style={{color:'red'}}>{error}</p>}
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={handleConfirm} disabled={loading||preview.toAdd.length===0}>
                {loading?'Importando...':`Importar ${preview.toAdd.length} alumnos`}
              </button>
              <button onClick={()=>setPreview(null)}>Volver a editar</button>
              <button onClick={onClose}>Cancelar</button>
            </div>
          </div>
        )}

        {!preview&&(
          <button onClick={onClose} style={{marginLeft:8}}>Cancelar</button>
        )}
      </div>
    </div>
  )
}
function AddEvidenceModal({period,models,onClose,onAdded}){
  const[loading,setLoading]=useState(false)
  const[selectedType,setSelectedType]=useState(null)
  const[evName,setEvName]=useState('')
  const model=models.find(m=>m.id===period.model_id)||models[0]
  const available=model?model.traits.filter(t=>t.weight>0).map(t=>t.trait_type):Object.keys(TRAITS)
  const handleAdd=async()=>{
    if(!selectedType)return
    setLoading(true)
    try{
      const ev=await api.addEvidence({period_id:period.id,trait_type:selectedType,name:evName.trim()})
      onAdded(ev);onClose()
    }catch(err){console.error(err)}finally{setLoading(false)}
  }
  return(<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <h2 className="modal-title">Agregar evidencia</h2>
    {!selectedType?(<>
      <p style={{fontSize:12,color:'#888',marginBottom:14}}>¿Qué tipo deseas agregar?</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {available.map(t=><button key={t} className="btn" style={{padding:12,borderRadius:10,justifyContent:'center'}} onClick={()=>setSelectedType(t)}>{TRAITS[t]||t}</button>)}
      </div>
      {available.length===0&&<p style={{fontSize:12,color:'#888',textAlign:'center',padding:16}}>Sin rasgos configurados.</p>}
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cancelar</button></div>
    </>):(<>
      <p style={{fontSize:12,color:'#888',marginBottom:14}}>{TRAITS[selectedType]||selectedType}</p>
      <div className="form-group">
        <label className="form-label">Nombre (opcional)</label>
        <input className="form-input" placeholder="Ej. Tarea 1" value={evName}
               onChange={e=>setEvName(e.target.value)} autoFocus
               onKeyDown={e=>e.key==='Enter'&&handleAdd()}/>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={()=>setSelectedType(null)} disabled={loading}>Atrás</button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>{loading?'Agregando...':'Agregar'}</button>
      </div>
    </>)}
  </div></div>)
}
function GeneralTab({students,periods,allEvidences}){if(students.length===0)return<div className="empty-state"><div className="empty-icon"><UsersIcon/></div><h3>No hay alumnos</h3></div>;const calcP=(sid,pid)=>{const evs=allEvidences[pid]||[];if(!evs.length)return null;let s=0,c=0;evs.forEach(ev=>{const g=(ev.grades||{})[sid];if(g!=null){s+=g;c++}});return c?s/c:null};const calcF=sid=>{let ws=0,tw=0;periods.forEach(p=>{const g=calcP(sid,p.id);if(g!=null){ws+=g*p.weight;tw+=p.weight}});return tw?Math.round(ws/tw):null};return(<div className="table-wrap"><table className="data-table" style={{minWidth:700}}><thead><tr><th rowSpan={2} style={{minWidth:130}}>Alumno</th>{periods.map(p=>{const evs=allEvidences[p.id]||[];return<th key={p.id} colSpan={evs.length+1} className="th-period">{p.name}</th>})}<th rowSpan={2} className="th-dark">Final</th></tr><tr>{periods.map(p=>{const evs=allEvidences[p.id]||[];return[...evs.map(ev=><th key={ev.id} className="num">{ev.name}</th>),<th key={`c${p.id}`} className="td-clf" style={{textAlign:'center',fontSize:10}}>Clf</th>]})}</tr></thead><tbody>{students.map(s=>{const fin=calcF(s.id);return(<tr key={s.id}><td>{dn(s.full_name)}</td>{periods.map(p=>{const evs=allEvidences[p.id]||[];const clf=calcP(s.id,p.id);return[...evs.map(ev=>{const g=(ev.grades||{})[s.id];return<td key={ev.id} className="num">{g??'—'}</td>}),<td key={`c${p.id}`} className="clf td-clf">{fmt(clf)}</td>]})}<td className="td-final">{fin??'—'}</td></tr>)})}</tbody></table></div>)}
function AttendanceTab({classId,students,periods}){
  const[activePeriod,setActivePeriod]=useState(0)
  const[days,setDays]=useState([]);const[records,setRecords]=useState({})
  const[loading,setLoading]=useState(false);const[saving,setSaving]=useState(false);const[dirty,setDirty]=useState(false)
  const[showAdd,setShowAdd]=useState(false)
  const[adding,setAdding]=useState(false)          // blocks double submits on slow connections
  const[newDay,setNewDay]=useState(()=>{const t=new Date();return{day:String(t.getDate()),month:String(t.getMonth()+1)}})
  const[delMode,setDelMode]=useState(false)
  const[dayToDelete,setDayToDelete]=useState(null)
  const[deleting,setDeleting]=useState(false)
  const period=periods[activePeriod]

  useEffect(()=>{if(!period)return;setLoading(true);api.getAttendance(classId,period.id).then(d=>{setDays(d.days||[]);setRecords(d.records||{})}).catch(console.error).finally(()=>setLoading(false))},[classId,period?.id])

  // Reset the form to today's date whenever it opens.
  const openAdd=()=>{const t=new Date();setNewDay({day:String(t.getDate()),month:String(t.getMonth()+1)});setShowAdd(true);setDelMode(false)}

  const toggle=(dayId,sid)=>{if(delMode)return;setRecords(p=>{const k=`${dayId}_${sid}`;return{...p,[k]:p[k]?0:1}});setDirty(true)}
  const get=(dayId,sid)=>records[`${dayId}_${sid}`]||0
  const pct=sid=>{if(!days.length)return null;const p=days.filter(d=>get(d.id,sid)===1).length;return Math.round(p/days.length*100)}
  const save=async()=>{setSaving(true);try{await api.saveAttendance({period_id:period.id,records});setDirty(false)}catch(err){console.error(err)}finally{setSaving(false)}}

  const addDay=async()=>{
    if(adding)return                                // guard against repeated clicks
    const d=parseInt(newDay.day),m=parseInt(newDay.month)
    if(!d||d<1||d>31||!m||m<1||m>12)return
    setAdding(true)
    try{
      const u=await api.saveAttendance({period_id:period.id,new_day:{day:String(d),month:String(m)},records})
      setDays(u.days||days);setRecords(u.records||records)
      setShowAdd(false)
    }catch(err){console.error(err)}finally{setAdding(false)}
  }

  const confirmDelete=async()=>{
    if(!dayToDelete)return
    setDeleting(true)
    try{
      await api.deleteAttendanceDay(dayToDelete.id)
      setDays(p=>p.filter(x=>x.id!==dayToDelete.id))
      setRecords(p=>{const n={...p};Object.keys(n).forEach(k=>{if(k.startsWith(`${dayToDelete.id}_`))delete n[k]});return n})
      setDayToDelete(null);setDelMode(false)
    }catch(err){console.error(err)}finally{setDeleting(false)}
  }

  const marked=d=>students.filter(s=>get(d.id,s.id)===1).length

  if(!period)return<div className="loading">No hay periodos</div>
  return(<>
    <div style={{display:'flex',gap:6,padding:'10px 20px',background:'#fff',borderBottom:'1px solid #e0e0e8'}}>
      {periods.map((p,i)=><button key={p.id} className={`pill ${activePeriod===i?'active':''}`} onClick={()=>setActivePeriod(i)}>{p.name}</button>)}
    </div>
    <div className="content">
      {delMode&&days.length>0&&<div className="alert alert-error" style={{marginBottom:12}}>Selecciona el día que deseas eliminar (toca su encabezado).</div>}
      {loading?<div className="loading"><div className="spinner"/>Cargando...</div>:(
        <div className="table-wrap"><table className="data-table" style={{minWidth:480}}>
          <thead><tr>
            <th style={{minWidth:130}}>Alumno</th>
            {days.map(d=>(
              <th key={d.id} className="num"
                  onClick={()=>delMode&&setDayToDelete(d)}
                  title={delMode?'Eliminar este día':''}
                  style={delMode?{cursor:'pointer',background:'#fef2f2',color:'#991b1b',outline:'1px solid #fca5a5'}:{}}>
                {d.date_label}
              </th>
            ))}
            {days.length===0&&<th className="num">Sin días</th>}
            <th style={{textAlign:'center',background:'#eeeef2',color:'#555'}}>%Asis</th>
          </tr></thead>
          <tbody>{students.map(s=>{const p=pct(s.id);return(
            <tr key={s.id}>
              <td>{dn(s.full_name)}</td>
              {days.map(d=>{const v=get(d.id,s.id);return(
                <td key={d.id} className="num" style={{cursor:delMode?'default':'pointer'}} onClick={()=>toggle(d.id,s.id)}>
                  <span className={v?'present-badge':'absent-badge'}>{v}</span>
                </td>)})}
              {days.length===0&&<td className="num">—</td>}
              <td style={{textAlign:'center',fontWeight:600,color:p===null?'#aaa':p>=70?'#15803d':'#991b1b'}}>{p===null?'—':`${p}%`}</td>
            </tr>)})}
          </tbody>
        </table></div>
      )}
      {showAdd&&(
        <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap',marginTop:16,background:'#f5f5f8',padding:14,borderRadius:10}}>
          <div><label className="form-label">Día</label>
            <input type="number" min="1" max="31" className="form-input" style={{width:80}} value={newDay.day}
                   onChange={e=>setNewDay(p=>({...p,day:e.target.value}))}/></div>
          <div><label className="form-label">Mes</label>
            <input type="number" min="1" max="12" className="form-input" style={{width:80}} value={newDay.month}
                   onChange={e=>setNewDay(p=>({...p,month:e.target.value}))}/></div>
          <button className="btn btn-primary" onClick={addDay} disabled={adding}>{adding?'Agregando...':'Agregar'}</button>
          <button className="btn" onClick={()=>setShowAdd(false)} disabled={adding}>Cancelar</button>
        </div>
      )}
    </div>
    <div className="bottom-bar">
      <button className="btn btn-primary" onClick={openAdd} disabled={showAdd}><PlusIcon/> Agregar día</button>
      <button className={`btn ${delMode?'btn-danger':''}`} disabled={days.length===0} onClick={()=>{setDelMode(v=>!v);setShowAdd(false)}}>
        <TrashIcon/> {delMode?'Cancelar':'Eliminar día'}
      </button>
      <button className="btn ml-auto" onClick={save} disabled={saving||!dirty}><SaveIcon/>{saving?'Guardando...':'Guardar'}</button>
    </div>
    {dayToDelete&&(
      <ConfirmModal
        title="Eliminar día de asistencia"
        message={`Se eliminara el dia ${dayToDelete.date_label} de ${period.name}.`}
        detail={`Se perderan los ${marked(dayToDelete)} registro(s) de asistencia de ese dia. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar día"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={()=>setDayToDelete(null)}
      />
    )}
  </>)
}
function EvidencesTab({classId,students,periods,models,onEvidencesChange,initialPeriodId}){
  const getIdx=()=>{if(initialPeriodId){const i=periods.findIndex(p=>p.id===parseInt(initialPeriodId));return i>=0?i:0}return 0}
  const[activePeriod,setActivePeriod]=useState(0)
  const[evidences,setEvidences]=useState([])
  const[grades,setGrades]=useState({})
  const[loading,setLoading]=useState(false);const[saving,setSaving]=useState(false);const[dirty,setDirty]=useState(false)
  const[showAdd,setShowAdd]=useState(false)
  const[editingEvId,setEditingEvId]=useState(null);const[editEvName,setEditEvName]=useState('')
  const suppressBlurRef=useRef(false)
  const period=periods[activePeriod]
  useEffect(()=>{if(initialPeriodId&&periods.length>0){const i=periods.findIndex(p=>p.id===parseInt(initialPeriodId));if(i>=0)setActivePeriod(i)}},[initialPeriodId,periods.length])
  const load=useCallback(()=>{if(!period)return;setLoading(true);api.getEvidences(classId,period.id).then(d=>{setEvidences(d.evidences||[]);setGrades(d.grades||{});onEvidencesChange&&onEvidencesChange(period.id,d.evidences||[],d.grades||{})}).catch(console.error).finally(()=>setLoading(false))},[classId,period?.id])
  useEffect(()=>{load()},[load])
  const updateGrade=(evId,sid,val)=>{setGrades(p=>({...p,[`${evId}_${sid}`]:val===''?null:parseFloat(val)}));setDirty(true)}
  const getGrade=(evId,sid)=>{const v=grades[`${evId}_${sid}`];return v===null||v===undefined?'':v}
  const save=async()=>{setSaving(true);try{await Promise.all(evidences.map(ev=>api.saveGrades(ev.id,students.map(s=>({student_id:s.id,grade:grades[`${ev.id}_${s.id}`]??null})))));setDirty(false)}catch(err){console.error(err)}finally{setSaving(false)}}
  const[evToDelete,setEvToDelete]=useState(null);const[delEvLoading,setDelEvLoading]=useState(false);
  const delEv=evId=>setEvToDelete(evidences.find(e=>e.id===evId)||null);
  const confirmDelEv=async()=>{if(!evToDelete)return;setDelEvLoading(true);try{await api.deleteEvidence(evToDelete.id);setEvToDelete(null);load()}catch(err){console.error(err)}finally{setDelEvLoading(false)}}
  const calcClf=sid=>{if(!evidences.length)return null;let s=0,c=0;evidences.forEach(ev=>{const g=grades[`${ev.id}_${sid}`];if(g!=null){s+=g;c++}});return c?s/c:null}
  const startEdit=ev=>{setEditingEvId(ev.id);setEditEvName(ev.name)}
  const renameEv=async(evId,newName)=>{
    try{
      const updated=await api.renameEvidence(evId,newName)
      setEvidences(p=>p.map(e=>e.id===evId?updated:e))
    }catch(err){console.error(err)}
  }
  const commitEdit=evId=>{renameEv(evId,editEvName);setEditingEvId(null)}
  const cancelEdit=()=>{suppressBlurRef.current=true;setEditingEvId(null)}
  const handleBlur=evId=>{
    if(suppressBlurRef.current){suppressBlurRef.current=false;return}
    commitEdit(evId)
  }
  if(!period)return<div className="loading">No hay periodos</div>
  return(<><div style={{display:'flex',gap:6,padding:'10px 20px',background:'#fff',borderBottom:'1px solid #e0e0e8'}}>{periods.map((p,i)=><button key={p.id} className={`pill ${activePeriod===i?'active':''}`} onClick={()=>setActivePeriod(i)}>{p.name}</button>)}</div><div className="content">{loading?<div className="loading"><div className="spinner"/>Cargando...</div>:(<div className="table-wrap"><table className="data-table"><thead><tr><th style={{minWidth:130}}>Alumno</th>{evidences.map(ev=><th key={ev.id} className="num"><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>{editingEvId===ev.id?<input autoFocus value={editEvName} onChange={e=>setEditEvName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){suppressBlurRef.current=true;commitEdit(ev.id)}else if(e.key==='Escape')cancelEdit()}} onBlur={()=>handleBlur(ev.id)} style={{width:70,fontSize:11,padding:'2px 4px',border:'1px solid #e0e0e8',borderRadius:4,textAlign:'center'}}/>:<span style={{cursor:'pointer'}} onClick={()=>startEdit(ev)} title="Clic para renombrar">{ev.name}</span>}<button className="btn-icon" style={{width:18,height:18,fontSize:10}} onClick={()=>delEv(ev.id)}><CloseIcon size={10}/></button></div></th>)}{evidences.length===0&&<th className="num">Sin evidencias</th>}<th className="td-clf" style={{textAlign:'center',fontSize:10}}>Clf. Parcial</th></tr></thead><tbody>{students.map((s,si)=>{const clf=calcClf(s.id);return(<tr key={s.id}><td>{dn(s.full_name)}</td>{evidences.map(ev=><td key={ev.id} className="num"><input type="number" min="0" max="100" step="any" data-cell={`${ev.id}-${si}`} value={getGrade(ev.id,s.id)} onChange={e=>updateGrade(ev.id,s.id,e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();focusNext(ev.id,si)}}} style={{width:56,padding:'3px 6px',border:'1px solid #e0e0e8',borderRadius:5,textAlign:'center',fontSize:12,background:'transparent'}}/></td>)}{evidences.length===0&&<td className="num">—</td>}<td className="clf td-clf">{fmt(clf)}</td></tr>)})}</tbody></table></div>)}</div><div className="bottom-bar"><button className="btn btn-primary" onClick={()=>setShowAdd(true)}><PlusIcon/> Agregar evidencia</button><button className="btn ml-auto" onClick={save} disabled={saving||!dirty}><SaveIcon/>{saving?'Guardando...':'Guardar'}</button></div>{showAdd&&period&&<AddEvidenceModal period={period} models={models} onClose={()=>setShowAdd(false)} onAdded={()=>{setShowAdd(false);load()}}/>}{evToDelete&&<ConfirmModal title="Eliminar evidencia" message={`Se eliminara "${evToDelete.name}" de ${period.name}.`} detail="Se perderan las calificaciones registradas en esta evidencia. Esta accion no se puede deshacer." confirmLabel="Eliminar evidencia" loading={delEvLoading} onConfirm={confirmDelEv} onClose={()=>setEvToDelete(null)}/>}</>)}
function PerStudentTab({classId,students,periods,models,allEvidences,onEvidencesChange}){
  const[selected,setSelected]=useState([]);const[viewing,setViewing]=useState(false)
  const[periodIdx,setPeriodIdx]=useState(0)
  const[evidences,setEvidences]=useState([]);const[grades,setGrades]=useState({})
  const[loading,setLoading]=useState(false);const[saving,setSaving]=useState(false);const[dirty,setDirty]=useState(false)
  const period=periods[periodIdx]
  const toggle=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const sel=students.filter(s=>selected.includes(s.id))

  // Load the chosen period's evidences so grades can be edited here too.
  useEffect(()=>{
    if(!viewing||!period)return
    setLoading(true)
    api.getEvidences(classId,period.id).then(d=>{
      setEvidences(d.evidences||[]);setGrades(d.grades||{});setDirty(false)
      onEvidencesChange&&onEvidencesChange(period.id,d.evidences||[],d.grades||{})
    }).catch(console.error).finally(()=>setLoading(false))
  },[viewing,classId,period?.id])

  const updateGrade=(evId,sid,val)=>{setGrades(p=>({...p,[`${evId}_${sid}`]:val===''?null:parseFloat(val)}));setDirty(true)}
  const getGrade=(evId,sid)=>{const v=grades[`${evId}_${sid}`];return v===null||v===undefined?'':v}
  const save=async()=>{
    setSaving(true)
    try{
      await Promise.all(evidences.map(ev=>api.saveGrades(ev.id,sel.map(s=>({student_id:s.id,grade:grades[`${ev.id}_${s.id}`]??null})))))
      setDirty(false)
      onEvidencesChange&&onEvidencesChange(period.id,evidences,grades)
    }catch(err){console.error(err)}finally{setSaving(false)}
  }
  const calcClf=sid=>{if(!evidences.length)return null;let t=0,c=0;evidences.forEach(ev=>{const g=grades[`${ev.id}_${sid}`];if(g!=null){t+=g;c++}});return c?t/c:null}
  const calcP=(sid,pid)=>{const evs=allEvidences[pid]||[];if(!evs.length)return null;let t=0,c=0;evs.forEach(ev=>{const g=(ev.grades||{})[sid];if(g!=null){t+=g;c++}});return c?t/c:null}
  const calcF=sid=>{let ws=0,tw=0;periods.forEach(p=>{const g=calcP(sid,p.id);if(g!=null){ws+=g*p.weight;tw+=p.weight}});return tw?Math.round(ws/tw):null}

  if(viewing&&sel.length>0)return(<>
    <div style={{display:'flex',gap:6,padding:'10px 20px',background:'#fff',borderBottom:'1px solid #e0e0e8',flexWrap:'wrap'}}>
      {periods.map((p,i)=><button key={p.id} className={`pill ${periodIdx===i?'active':''}`} onClick={()=>setPeriodIdx(i)}>{p.name}</button>)}
    </div>
    <div className="content">
      <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{sel.map(s=>dn(s.full_name)).join(' · ')}</div>

      <p style={{fontSize:11,color:'#888',marginBottom:6}}>Resumen por parcial</p>
      <div className="table-wrap"><table className="data-table" style={{minWidth:420,marginBottom:22}}>
        <thead><tr><th>Alumno</th>{periods.map(p=><th key={p.id} className="th-period">{p.name}</th>)}<th className="th-dark">Final</th></tr></thead>
        <tbody>{sel.map(s=>{const fin=calcF(s.id);return(
          <tr key={s.id}><td>{dn(s.full_name)}</td>
            {periods.map(p=>{const g=calcP(s.id,p.id);return<td key={p.id} className="clf td-clf">{fmt(g)}</td>})}
            <td className="td-final">{fin??'—'}</td>
          </tr>)})}
        </tbody>
      </table></div>

      <p style={{fontSize:11,color:'#888',marginBottom:6}}>Editar calificaciones — {period?period.name:''}</p>
      {loading?<div className="loading"><div className="spinner"/>Cargando...</div>:(
        <div className="table-wrap"><table className="data-table">
          <thead><tr>
            <th style={{minWidth:130}}>Alumno</th>
            {evidences.map((ev,i)=><th key={ev.id} className="num">{ev.name}</th>)}
            {evidences.length===0&&<th className="num">Sin evidencias</th>}
            <th className="td-clf" style={{textAlign:'center',fontSize:10}}>Clf. Parcial</th>
          </tr></thead>
          <tbody>{sel.map((s,si)=>{const clf=calcClf(s.id);return(
            <tr key={s.id}><td>{dn(s.full_name)}</td>
              {evidences.map(ev=>(
                <td key={ev.id} className="num">
                  <input type="number" min="0" max="100" step="any"
                    data-cell={`p${ev.id}-${si}`}
                    value={getGrade(ev.id,s.id)}
                    onChange={e=>updateGrade(ev.id,s.id,e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();focusNext('p'+ev.id,si)}}}
                    style={{width:56,padding:'3px 6px',border:'1px solid #e0e0e8',borderRadius:5,textAlign:'center',fontSize:12,background:'transparent'}}/>
                </td>))}
              {evidences.length===0&&<td className="num">—</td>}
              <td className="clf td-clf">{fmt(clf)}</td>
            </tr>)})}
          </tbody>
        </table></div>
      )}
    </div>
    <div className="bottom-bar">
      <button className="btn" onClick={()=>setViewing(false)}>← Regresar</button>
      <button className="btn ml-auto" onClick={save} disabled={saving||!dirty}><SaveIcon/>{saving?'Guardando...':'Guardar'}</button>
    </div>
  </>)

  return(<div className="content">
    <p style={{fontSize:13,color:'#888',marginBottom:12}}>Selecciona los alumnos:</p>
    <div style={{marginBottom:20}}>{students.map(s=><button key={s.id} className={`student-tag ${selected.includes(s.id)?'selected':''}`} onClick={()=>toggle(s.id)}>{dn(s.full_name)}</button>)}</div>
    <div style={{display:'flex',gap:8}}>
      <button className="btn btn-primary" disabled={selected.length===0} onClick={()=>setViewing(true)}>Revisar</button>
      {selected.length>0&&<button className="btn" onClick={()=>setSelected([])}>Limpiar</button>}
    </div>
  </div>)
}

function LinksBar({links,onEdit}){
  const has=links&&links.length>0
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',padding:'10px 20px',background:'#fff',borderBottom:'1px solid #e0e0e8'}}>
      {has?links.map(l=>(
        <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
           style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 11px',borderRadius:16,
                   border:'1px solid #e0e0e8',background:'#f5f5f8',color:'#1a1a26',
                   fontSize:12,fontWeight:500,textDecoration:'none'}}>
          <LinkIcon size={12}/>{l.label}<ExternalIcon size={10}/>
        </a>
      )):<span style={{fontSize:12,color:'#aaa'}}>Sin enlaces</span>}
      <button className="btn btn-sm" style={{marginLeft:'auto'}} onClick={onEdit}>
        <LinkIcon size={12}/> {has?'Editar enlaces':'Agregar enlaces'}
      </button>
    </div>
  )
}

function EditLinksModal({cls,onClose,onSaved}){
  const init=(cls.links||[]).map(l=>({label:l.label,url:l.url}))
  while(init.length<2)init.push({label:'',url:''})
  const[rows,setRows]=useState(init.slice(0,2))
  const[loading,setLoading]=useState(false);const[error,setError]=useState('')
  const upd=(i,f,v)=>setRows(p=>p.map((r,j)=>j===i?{...r,[f]:v}:r))
  const submit=async e=>{
    e.preventDefault();setError('');setLoading(true)
    try{
      const links=rows.filter(r=>r.label.trim()||r.url.trim())
      const saved=await api.saveClassLinks(cls.id,links)
      onSaved(saved);onClose()
    }catch(err){setError(err.message)}finally{setLoading(false)}
  }
  return(<div className="modal-overlay" style={{alignItems:'flex-start',paddingTop:40}} onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <h2 className="modal-title">Enlaces de la clase</h2>
    <p style={{fontSize:12,color:'#888',marginBottom:16,lineHeight:1.5}}>
      Accesos directos a Classroom, Canvas, Drive o lo que uses. Maximo 2.
    </p>
    {error&&<div className="alert alert-error">{error}</div>}
    <form onSubmit={submit}>
      {rows.map((r,i)=>(
        <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i===0?'1px solid #f0f0f4':'none'}}>
          <div className="form-group" style={{marginBottom:8}}>
            <label className="form-label">Nombre {i+1}</label>
            <input className="form-input" placeholder="Ej. Classroom T1 Grupo 32" value={r.label}
                   onChange={e=>upd(i,'label',e.target.value)} maxLength={40}/>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Direccion</label>
            <input className="form-input" placeholder="classroom.google.com/..." value={r.url}
                   onChange={e=>upd(i,'url',e.target.value)}/>
          </div>
        </div>
      ))}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
      </div>
    </form>
  </div></div>)
}

export default function ClassView(){
    const[menuOpen,setMenuOpen]=useState(false)
  const[showLinks,setShowLinks]=useState(false)
const{id}=useParams();const navigate=useNavigate();const location=useLocation()
  const sp=new URLSearchParams(location.search);const urlTab=sp.get('tab');const urlPeriodId=sp.get('period_id')
  const[cls,setCls]=useState(null);const[students,setStudents]=useState([]);const[periods,setPeriods]=useState([]);const[models,setModels]=useState([]);const[loading,setLoading]=useState(true);const[tab,setTab]=useState(urlTab||'general');const[showAddStu,setShowAddStu]=useState(false);const[showEditStu,setShowEditStu]=useState(false);const[showImport,setShowImport]=useState(false);const[allEvidences,setAllEvidences]=useState({})
  useEffect(()=>{Promise.all([api.getClass(id),api.getStudents(id),api.getPeriods(id),api.getModels(id)]).then(([c,s,p,m])=>{setCls(c);setStudents(sortEs(s));setPeriods(p);setModels(m)}).catch(console.error).finally(()=>setLoading(false))},[id])
  const onEC=(pid,evs,grd)=>{const wg=evs.map(ev=>({...ev,grades:Object.fromEntries(Object.entries(grd).filter(([k])=>k.startsWith(`${ev.id}_`)).map(([k,v])=>[k.split('_')[1],v]))}));setAllEvidences(p=>({...p,[pid]:wg}))}
  if(loading)return<div className="app-shell"><Sidebar open={menuOpen} onClose={()=>setMenuOpen(false)}/><div className="main-content"><div className="loading"><div className="spinner"/>Cargando...</div></div></div>
  if(!cls)return<div className="app-shell"><Sidebar open={menuOpen} onClose={()=>setMenuOpen(false)}/><div className="main-content"><div className="content"><div className="alert alert-error">Clase no encontrada</div><button className="btn btn-primary" onClick={()=>navigate('/')}>← Volver</button></div></div></div>
  return(<div className="app-shell"><Sidebar open={menuOpen} onClose={()=>setMenuOpen(false)}/><div className="main-content">
    <div className="topbar"><div className="topbar-left"><MenuButton onClick={()=>setMenuOpen(true)}/><img src={logoUrl} alt="UAQ" className="topbar-logo"/><div className="topbar-breadcrumb"><button className="back-link" onClick={()=>navigate('/')}>← Mis clases</button><span className="page-title">{cls.name}</span></div></div></div>
    <div className="tabs">{[['general','General'],['asistencia','Asistencia'],['evidencias','Evidencias'],['por-alumnos','Por alumnos']].map(([k,l])=><button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>)}</div>
    <LinksBar links={cls.links} onEdit={()=>setShowLinks(true)}/>
    {tab==='general'&&<><div className="content"><GeneralTab students={students} periods={periods} allEvidences={allEvidences}/></div><div className="bottom-bar"><button className="btn" onClick={()=>navigate(`/clase/${id}/rasgos`)}>Rasgos</button><button className="btn btn-primary" onClick={()=>setShowAddStu(true)}><PlusIcon/>Añadir alumno</button><button className="btn" onClick={()=>setShowImport(true)}>Importar lista</button><button className="btn" onClick={()=>navigate(`/clase/${id}/periodos`)}>Periodos</button><button className="btn" onClick={()=>setShowEditStu(true)}>Editar alumnos</button></div></>}
    {tab==='asistencia'&&<AttendanceTab classId={id} students={students} periods={periods}/>}
    {tab==='evidencias'&&<EvidencesTab classId={id} students={students} periods={periods} models={models} onEvidencesChange={onEC} initialPeriodId={urlPeriodId}/>}
    {tab==='por-alumnos'&&<PerStudentTab classId={id} students={students} periods={periods} models={models} allEvidences={allEvidences} onEvidencesChange={onEC}/>}
    {showAddStu&&<AddStudentModal classId={id} onClose={()=>setShowAddStu(false)} onAdded={s=>setStudents(p=>sortEs([...p,s]))}/>}
    {showLinks&&<EditLinksModal cls={cls} onClose={()=>setShowLinks(false)} onSaved={links=>setCls(c=>({...c,links}))}/>}
    {showEditStu&&<EditStudentsModal students={students} onClose={()=>setShowEditStu(false)} onUpdated={u=>setStudents(p=>sortEs(p.map(s=>s.id===u.id?u:s)))} onDeleted={did=>setStudents(p=>p.filter(s=>s.id!==did))}/>}
    {showImport&&<ImportStudentsModal classId={id} existingNames={students.map(s=>s.full_name)} onClose={()=>setShowImport(false)} onImported={newStudents=>setStudents(sortEs(newStudents))}/>}
  </div></div>)
}
