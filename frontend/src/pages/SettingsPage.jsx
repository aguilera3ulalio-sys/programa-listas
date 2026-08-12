import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar,{MenuButton} from '../components/Sidebar'
import logoUrl from '../assets/logo.js'
import NipInput from '../components/NipInput'

function Section({ title, description, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-body">
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a26', marginBottom: 4 }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>{description}</div>}
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
    const[menuOpen,setMenuOpen]=useState(false)
const { user, updateUser } = useAuth()

  // Name
  const [name, setName] = useState(user.name || '')
  const [nameMsg, setNameMsg] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Email
  const [email, setEmail] = useState(user.email || '')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // NIP
  const [currentNip, setCurrentNip] = useState('')
  const [newNip, setNewNip] = useState('')
  const [confirmNip, setConfirmNip] = useState('')
  const [nipMsg, setNipMsg] = useState('')
  const [nipErr, setNipErr] = useState('')
  const [savingNip, setSavingNip] = useState(false)

  const flash = (setter) => { setTimeout(() => setter(''), 2500) }

  const handleName = async (e) => {
    e.preventDefault()
    setNameErr(''); setNameMsg('')
    if (!name.trim()) return setNameErr('El nombre no puede estar vacío')
    setSavingName(true)
    try {
      const { user: updated } = await api.updateAccount({ user_id: user.id, name: name.trim() })
      updateUser(updated)
      setNameMsg('Nombre actualizado'); flash(setNameMsg)
    } catch (err) { setNameErr(err.message) }
    finally { setSavingName(false) }
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setEmailErr(''); setEmailMsg('')
    const v = email.trim()
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setEmailErr('El correo no es válido')
    setSavingEmail(true)
    try {
      const { user: updated } = await api.updateAccount({ user_id: user.id, email: v })
      updateUser(updated)
      setEmailMsg(v ? 'Correo actualizado' : 'Correo eliminado'); flash(setEmailMsg)
    } catch (err) { setEmailErr(err.message) }
    finally { setSavingEmail(false) }
  }

  const handleNip = async (e) => {
    e.preventDefault()
    setNipErr(''); setNipMsg('')
    if (!currentNip || !newNip || !confirmNip) return setNipErr('Completa los tres campos')
    if (newNip.length < 4) return setNipErr('El nuevo NIP debe tener al menos 4 dígitos')
    if (newNip !== confirmNip) return setNipErr('El nuevo NIP y su confirmación no coinciden')
    setSavingNip(true)
    try {
      const { user: updated } = await api.updateAccount({
        user_id: user.id,
        new_nip: newNip,
        current_nip: currentNip,
      })
      updateUser(updated)
      setCurrentNip(''); setNewNip(''); setConfirmNip('')
      setNipMsg('NIP actualizado correctamente'); flash(setNipMsg)
    } catch (err) { setNipErr(err.message) }
    finally { setSavingNip(false) }
  }

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={()=>setMenuOpen(false)} />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left"><MenuButton onClick={()=>setMenuOpen(true)}/>
            <img src={logoUrl} alt="UAQ" className="topbar-logo" />
            <div>
              <div className="page-title">Ajustes</div>
              <div className="page-subtitle">{user.name} · Clave de trabajador {user.employee_number}</div>
            </div>
          </div>
        </div>

        <div className="content" style={{ maxWidth: 560 }}>
          {/* Name */}
          <Section title="Nombre del docente" description="Este nombre aparece en el encabezado de cada pantalla.">
            {nameErr && <div className="alert alert-error">{nameErr}</div>}
            {nameMsg && <div className="alert alert-success">{nameMsg}</div>}
            <form onSubmit={handleName}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. Francisco Paulín"
                />
              </div>
              <button className="btn btn-primary" disabled={savingName}>
                {savingName ? 'Guardando...' : 'Guardar nombre'}
              </button>
            </form>
          </Section>

          {/* Email */}
          <Section
            title="Correo de recuperación"
            description="Si olvidas tu NIP, te enviaremos un código a este correo para restablecerlo."
          >
            {emailErr && <div className="alert alert-error">{emailErr}</div>}
            {emailMsg && <div className="alert alert-success">{emailMsg}</div>}
            <form onSubmit={handleEmail}>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tucorreo@uaq.mx"
                />
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>
                  Déjalo vacío para quitar el correo de tu cuenta.
                </p>
              </div>
              <button className="btn btn-primary" disabled={savingEmail}>
                {savingEmail ? 'Guardando...' : 'Guardar correo'}
              </button>
            </form>
          </Section>

          {/* NIP */}
          <Section
            title="Cambiar NIP"
            description="Tu NIP se usa para iniciar sesión y para confirmar acciones sensibles como eliminar clases o alumnos."
          >
            {nipErr && <div className="alert alert-error">{nipErr}</div>}
            {nipMsg && <div className="alert alert-success">{nipMsg}</div>}
            <form onSubmit={handleNip}>
              <div className="form-group">
                <label className="form-label">NIP actual</label>
                <NipInput value={currentNip} onChange={e => setCurrentNip(e.target.value)} placeholder="••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Nuevo NIP</label>
                <NipInput value={newNip} onChange={e => setNewNip(e.target.value)} placeholder="Mínimo 4 dígitos" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar nuevo NIP</label>
                <NipInput value={confirmNip} onChange={e => setConfirmNip(e.target.value)} placeholder="Repite el nuevo NIP" />
              </div>
              <button className="btn btn-primary" disabled={savingNip}>
                {savingNip ? 'Guardando...' : 'Actualizar NIP'}
              </button>
            </form>
          </Section>

          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 8 }}>
            UAQ Docentes · Facultad de Informática
          </p>
        </div>
      </div>
    </div>
  )
}
