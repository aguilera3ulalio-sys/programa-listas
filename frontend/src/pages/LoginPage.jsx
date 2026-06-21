import{useState}from'react'
import{useNavigate}from'react-router-dom'
import{useAuth}from'../context/AuthContext'
import{api}from'../api'
import logoUrl from'../assets/logo.js'
export default function LoginPage(){
  const[mode,setMode]=useState('login') // 'login' | 'register' | 'recover'
  const[emp,setEmp]=useState('');const[nip,setNip]=useState('');const[remember,setRemember]=useState(false)
  const[error,setError]=useState('');const[info,setInfo]=useState('');const[loading,setLoading]=useState(false)
  const[regName,setRegName]=useState('')
  const[recCode,setRecCode]=useState('');const[recNewNip,setRecNewNip]=useState('')
  const[showCode,setShowCode]=useState(null) // {user, code} after successful register
  const{login}=useAuth();const navigate=useNavigate()
  const switchMode=(m)=>{setMode(m);setError('');setInfo('')}

  const submit=async(e)=>{
    e.preventDefault();setError('');setInfo('');setLoading(true)
    try{
      if(mode==='register'){
        const{user,recovery_code}=await api.register(emp,nip,regName)
        setShowCode({user,code:recovery_code}) // hold login until they save the code
      }else if(mode==='recover'){
        await api.recover(emp,recCode,recNewNip)
        setInfo('NIP actualizado. Ya puedes iniciar sesión con tu nuevo NIP.')
        setMode('login');setNip('');setRecCode('');setRecNewNip('')
      }else{
        const{user}=await api.login(emp,nip)
        login(user,remember);navigate('/')
      }
    }catch(err){setError(err.message)}finally{setLoading(false)}
  }

  const continueAfterCode=()=>{login(showCode.user,remember);navigate('/')}

  return(
    <div style={{display:'flex',minHeight:'100vh'}}>
      <div style={{width:'44%',background:'#1a1a26',display:'flex',flexDirection:'column',justifyContent:'center',padding:'52px 44px'}}>
        <img src={logoUrl} alt="UAQ FIF" style={{width:80,height:80,objectFit:'contain',background:'#fff',padding:6,borderRadius:10,marginBottom:28}}/>
        <div style={{fontSize:32,fontWeight:700,color:'#fff',lineHeight:1.2,marginBottom:12}}>Programa<br/>de Listas</div>
        <div style={{fontSize:13,color:'#8888aa',lineHeight:1.7}}>Sistema de gestión académica<br/>para docentes</div>
        <div style={{marginTop:40,fontSize:11,color:'#44445a'}}>Facultad de Informática · UAQ</div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{background:'#fff',borderRadius:14,padding:32,width:'100%',maxWidth:360,boxShadow:'0 4px 24px rgba(0,0,0,.08)'}}>

          {showCode?(
            <div>
              <h1 style={{fontSize:20,fontWeight:700,marginBottom:8,color:'#1a1a26'}}>Guarda tu código de recuperación</h1>
              <p style={{fontSize:13,color:'#888',lineHeight:1.6,marginBottom:16}}>Este código es la única forma de recuperar tu cuenta si olvidas tu NIP. <b>Guárdalo en un lugar seguro</b> — no volverá a mostrarse.</p>
              <div style={{background:'#f4f4f8',border:'1px dashed #c0185a',borderRadius:10,padding:'16px',textAlign:'center',fontSize:22,fontWeight:700,letterSpacing:2,color:'#1a1a26',fontFamily:'monospace',userSelect:'all',marginBottom:16}}>{showCode.code}</div>
              <button className="btn w-full" style={{padding:9,justifyContent:'center',marginBottom:10,background:'#eee',color:'#1a1a26'}} onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(showCode.code);setInfo('Código copiado')}}>Copiar código</button>
              {info&&<div className="alert alert-success">{info}</div>}
              <button className="btn btn-primary w-full" style={{padding:10,justifyContent:'center'}} onClick={continueAfterCode}>Ya lo guardé, continuar</button>
            </div>
          ):(
            <div>
              <h1 style={{fontSize:20,fontWeight:700,marginBottom:24,color:'#1a1a26'}}>{mode==='register'?'Crear cuenta':mode==='recover'?'Recuperar NIP':'Iniciar sesión'}</h1>
              {error&&<div className="alert alert-error">{error}</div>}
              {info&&<div className="alert alert-success">{info}</div>}
              <form onSubmit={submit}>
                {mode==='register'&&<div className="form-group"><label className="form-label">Nombre completo</label><input className="form-input" placeholder="Ej. Francisco Paulín" value={regName} onChange={e=>setRegName(e.target.value)} required/></div>}
                <div className="form-group"><label className="form-label">Clave de trabajador</label><input className="form-input" placeholder="Ej. 12345" value={emp} onChange={e=>setEmp(e.target.value)} required/></div>

                {mode==='recover'?(
                  <>
                    <div className="form-group"><label className="form-label">Código de recuperación</label><input className="form-input" placeholder="XXXX-XXXX-XXXX" value={recCode} onChange={e=>setRecCode(e.target.value)} required/></div>
                    <div className="form-group"><label className="form-label">Nuevo NIP</label><input className="form-input" type="password" placeholder="Mínimo 4 dígitos" value={recNewNip} onChange={e=>setRecNewNip(e.target.value)} required/></div>
                  </>
                ):(
                  <div className="form-group"><label className="form-label">NIP</label><input className="form-input" type="password" placeholder="••••" value={nip} onChange={e=>setNip(e.target.value)} required/></div>
                )}

                {mode==='login'&&<div style={{display:'flex',alignItems:'center',gap:8,margin:'10px 0 8px'}}><input type="checkbox" id="rem" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{cursor:'pointer'}}/><label htmlFor="rem" style={{fontSize:13,color:'#888',cursor:'pointer'}}>Recuérdame</label></div>}
                <button className="btn btn-primary w-full" style={{padding:10,justifyContent:'center',marginTop:mode==='login'?0:8}} disabled={loading}>{loading?'Cargando...':mode==='register'?'Crear cuenta':mode==='recover'?'Actualizar NIP':'Iniciar sesión'}</button>
              </form>

              {mode==='login'&&<div style={{textAlign:'center',marginTop:12,fontSize:13}}><button onClick={()=>switchMode('recover')} style={{color:'var(--accent)',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>¿Olvidaste tu NIP?</button></div>}
              <div style={{textAlign:'center',marginTop:12,fontSize:13,color:'#888'}}>
                {mode==='login'&&<>¿No tienes cuenta? <button onClick={()=>switchMode('register')} style={{color:'var(--accent)',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Regístrate</button></>}
                {mode==='register'&&<>¿Ya tienes cuenta? <button onClick={()=>switchMode('login')} style={{color:'var(--accent)',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Inicia sesión</button></>}
                {mode==='recover'&&<button onClick={()=>switchMode('login')} style={{color:'var(--accent)',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Volver a iniciar sesión</button>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
