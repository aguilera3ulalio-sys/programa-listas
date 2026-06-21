import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import logoUrl from '../assets/logo.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const HOURS = ['7','8','9','10','11','12','13','14','15','16','17','18']
const HOUR_LABELS = ['7–8','8–9','9–10','10–11','11–12','12–13','13–14','14–15','15–16','16–17','17–18','18–19']

const COLORS = [
  { value: '#c0185a', light: '#ffe4ef', text: '#9a1039' },
  { value: '#7c3aed', light: '#ede9fe', text: '#5b21b6' },
  { value: '#1565c0', light: '#dbeafe', text: '#1e3a8a' },
  { value: '#2196f3', light: '#e3f2fd', text: '#1565c0' },
  { value: '#166534', light: '#dcfce7', text: '#14532d' },
  { value: '#212121', light: '#f5f5f5', text: '#444' },
]

const PlusIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const TrashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>

function AddEventModal({ classes, onClose, onAdded }) {
  const { user } = useAuth()
  const [clsName, setClsName] = useState('')
  const [classId, setClassId] = useState('')
  const [selectedDays, setSelectedDays] = useState([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState('#c0185a')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClassSelect = (e) => {
    const id = e.target.value; setClassId(id)
    if (id) {
      const c = classes.find(c => c.id === parseInt(id))
      if (c) { setClsName(c.name); setColor(c.color || '#c0185a') }
    } else setClsName('')
  }

  const toggleDay = (d) => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clsName.trim()) return setError('Escribe el nombre')
    if (selectedDays.length === 0) return setError('Selecciona al menos un día')
    if (!startTime || !endTime) return setError('Selecciona el horario')
    setLoading(true)
    try {
      const created = await Promise.all(
        selectedDays.map(day => api.addEvent({
          user_id: user.id,
          class_id: classId ? parseInt(classId) : null,
          class_name: clsName.trim(),
          day_of_week: day,
          start_time: startTime,
          end_time: String(parseInt(startTime) + 1),
          color
        }))
      )
      created.forEach(ev => onAdded(ev))
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    // FIX: overflow-y:auto on overlay so modal is always reachable
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 40 }} onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Agregar al calendario</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vincular con clase (opcional)</label>
            <select className="form-select" value={classId} onChange={handleClassSelect}>
              <option value="">— Sin vincular —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" placeholder="Ej. Introducción a la Programación" value={clsName} onChange={e => setClsName(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Días</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => (
                <button key={d} type="button"
                  className={`pill ${selectedDays.includes(DAY_KEYS[i]) ? 'active' : ''}`}
                  onClick={() => toggleDay(DAY_KEYS[i])}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Hora inicio</label>
              <select className="form-select" value={startTime} onChange={e => setStartTime(e.target.value)}>
                <option value="">Seleccionar</option>
                {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hora fin</label>
              <select className="form-select" value={endTime} onChange={e => setEndTime(e.target.value)}>
                <option value="">Seleccionar</option>
                {HOURS.map(h => <option key={h} value={String(parseInt(h)+1)}>{parseInt(h)+1}:00</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: `3px solid ${color === c.value ? '#1a1a26' : 'transparent'}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Agregando...' : 'Aceptar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    Promise.all([api.getEvents(user.id), api.getClasses(user.id)])
      .then(([evs, cls]) => { setEvents(evs); setClasses(cls) })
      .catch(console.error).finally(() => setLoading(false))
  }, [user.id])

  const handleDelete = async (id) => {
    await api.deleteEvent(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const normalize = s => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ''
  const getCellEvents = (dayKey, hourStart) =>
    events.filter(ev => normalize(ev.day_of_week) === normalize(dayKey) && String(ev.start_time) === String(hourStart))
  const getColor = ev => COLORS.find(c => c.value === ev.color) || COLORS[0]

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <img src={logoUrl} alt="UAQ" className="topbar-logo" />
            <div>
              <div className="page-title">Calendario</div>
              <div className="page-subtitle">{user.name}</div>
            </div>
          </div>
        </div>

        <div className="content">
          {loading ? <div className="loading"><div className="spinner" />Cargando...</div> : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '54px repeat(5,1fr)',
                  gap: 1, background: '#e0e0e8', border: '1px solid #e0e0e8',
                  borderRadius: 10, overflow: 'hidden', minWidth: 560
                }}>
                  {/* Headers */}
                  <div style={{ background: '#f5f5f8' }} />
                  {DAYS.map(d => (
                    <div key={d} style={{ background: '#f5f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32, fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</div>
                  ))}
                  {/* Rows */}
                  {HOURS.map((hour, idx) => (
                    <>
                      <div key={`t${hour}`} style={{ background: '#fff', fontSize: 10, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>{HOUR_LABELS[idx]}</div>
                      {DAY_KEYS.map(day => {
                        const cellEvs = getCellEvents(day, hour)
                        return (
                          <div key={`${day}${hour}`} style={{ background: '#fff', padding: 5, minHeight: 50 }}>
                            {cellEvs.map(ev => {
                              const col = getColor(ev)
                              return (
                                <div key={ev.id} style={{ background: col.light, color: col.text, borderRadius: 5, padding: '4px 7px', fontSize: 11, fontWeight: 500, marginBottom: 3, cursor: ev.class_id ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}
                                  onClick={() => ev.class_id && navigate(`/clase/${ev.class_id}`)}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.class_name}</span>
                                  <button onClick={e => { e.stopPropagation(); handleDelete(ev.id) }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: col.text, opacity: .6, padding: 0, flexShrink: 0, display: 'flex' }}>
                                    <TrashIcon />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>
              </div>

              {/* FIX: No emoji in empty state */}
              {events.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 32, color: '#888', fontSize: 13 }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, color: '#555' }}>Calendario vacío</p>
                  <p>Agrega tus clases para verlas en la vista semanal.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bottom-bar" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <PlusIcon /> Agregar elemento
          </button>
        </div>
      </div>

      {showAdd && (
        <AddEventModal
          classes={classes}
          onClose={() => setShowAdd(false)}
          onAdded={ev => setEvents(prev => [...prev, ev])}
        />
      )}
    </div>
  )
}
