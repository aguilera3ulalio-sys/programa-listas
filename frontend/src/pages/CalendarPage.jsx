import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import logoUrl from '../assets/logo.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const ROW_H = 46

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

const normalize = s => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const colorOf = v => COLORS.find(c => c.value === v) || COLORS[0]

// Resolve an event against its linked class so name/color/tags stay LIVE.
// Unlinked (custom) events fall back to their stored values.
function resolveEvent(ev, classes) {
  const cls = ev.class_id ? classes.find(c => c.id === ev.class_id) : null
  const tags = cls ? [cls.highlight_field1, cls.highlight_field2, cls.highlight_field3].filter(Boolean) : []
  return {
    ...ev,
    displayName: cls ? cls.name : ev.class_name,
    displayColor: cls ? (cls.color || '#c0185a') : (ev.color || '#c0185a'),
    tags,
    linkedClass: cls || null,
  }
}

function AddEventModal({ classes, onClose, onAdded, presetClass }) {
  const { user } = useAuth()
  const [classId, setClassId] = useState(presetClass ? String(presetClass.id) : '')
  const [clsName, setClsName] = useState(presetClass ? presetClass.name : '')
  const [selectedDays, setSelectedDays] = useState([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState(presetClass ? (presetClass.color || '#c0185a') : '#c0185a')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const linked = classId ? classes.find(c => c.id === parseInt(classId)) : null

  const handleClassSelect = (e) => {
    const id = e.target.value
    setClassId(id)
    if (id) {
      const c = classes.find(c => c.id === parseInt(id))
      if (c) { setClsName(c.name); setColor(c.color || '#c0185a') }
    } else setClsName('')
  }

  const toggleDay = d => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  // End options must be after the chosen start.
  const endOptions = startTime ? HOURS.filter(h => h > parseInt(startTime)).concat([19]).filter((v, i, a) => a.indexOf(v) === i) : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!clsName.trim()) return setError('Escribe el nombre')
    if (selectedDays.length === 0) return setError('Selecciona al menos un día')
    if (!startTime || !endTime) return setError('Selecciona el horario')
    if (parseInt(endTime) <= parseInt(startTime)) return setError('La hora fin debe ser mayor que la de inicio')
    setLoading(true)
    try {
      const created = await Promise.all(
        selectedDays.map(day => api.addEvent({
          user_id: user.id,
          class_id: classId ? parseInt(classId) : null,
          class_name: clsName.trim(),
          day_of_week: day,
          start_time: String(startTime),
          end_time: String(endTime),   // FIX: use the real end time
          color,
        }))
      )
      created.forEach(ev => onAdded(ev))
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const previewTags = linked ? [linked.highlight_field1, linked.highlight_field2, linked.highlight_field3].filter(Boolean) : []
  const col = colorOf(color)

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 40 }} onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Agregar al calendario</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Clase existente</label>
            <select className="form-select" value={classId} onChange={handleClassSelect}>
              <option value="">— Clase personalizada (sin vincular) —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {linked && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#888' }}>Se usarán nombre, color y datos de la clase:</span>
                {previewTags.map((t, i) => <span key={i} className="badge" style={{ background: col.light, color: col.text }}>{t}</span>)}
                {previewTags.length === 0 && <span style={{ fontSize: 11, color: '#bbb' }}>(sin datos destacados)</span>}
              </div>
            )}
          </div>

          {!linked && (
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" placeholder="Ej. Tutoría" value={clsName} onChange={e => setClsName(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Días</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => (
                <button key={d} type="button"
                  className={`pill ${selectedDays.includes(DAY_KEYS[i]) ? 'active' : ''}`}
                  onClick={() => toggleDay(DAY_KEYS[i])}>{d}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Hora inicio</label>
              <select className="form-select" value={startTime} onChange={e => { setStartTime(e.target.value); setEndTime('') }}>
                <option value="">Seleccionar</option>
                {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hora fin</label>
              <select className="form-select" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={!startTime}>
                <option value="">{startTime ? 'Seleccionar' : 'Elige inicio primero'}</option>
                {endOptions.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
          </div>
          {startTime && endTime && (
            <p style={{ fontSize: 11, color: '#888', marginTop: -6, marginBottom: 12 }}>
              Duración: {parseInt(endTime) - parseInt(startTime)} hora{parseInt(endTime) - parseInt(startTime) !== 1 ? 's' : ''}
            </p>
          )}

          {!linked && (
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c.value} type="button" onClick={() => setColor(c.value)}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: `3px solid ${color === c.value ? '#1a1a26' : 'transparent'}`, cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}

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
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    Promise.all([api.getEvents(user.id), api.getClasses(user.id)])
      .then(([evs, cls]) => { setEvents(evs); setClasses(cls) })
      .catch(console.error).finally(() => setLoading(false))
  }, [user.id])

  const handleDelete = async (id) => {
    await api.deleteEvent(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const resolved = events.map(ev => resolveEvent(ev, classes))

  // Events for a given day, with grid placement computed from start/end hours.
  const eventsForDay = dayKey => resolved
    .filter(ev => normalize(ev.day_of_week) === normalize(dayKey))
    .map(ev => {
      const s = parseInt(ev.start_time)
      let e = parseInt(ev.end_time)
      if (!Number.isFinite(e) || e <= s) e = s + 1        // defensive: bad/legacy data
      const startIdx = HOURS.indexOf(s)
      if (startIdx < 0) return null
      const span = Math.min(e - s, HOURS.length - startIdx) // don't overflow the grid
      return { ...ev, startIdx, span }
    })
    .filter(Boolean)

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
                <div style={{ minWidth: 620, border: '1px solid #e0e0e8', borderRadius: 10, overflow: 'hidden', background: '#e0e0e8' }}>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '58px repeat(5,1fr)', gap: 1 }}>
                    <div style={{ background: '#f5f5f8', minHeight: 32 }} />
                    {DAYS.map(d => (
                      <div key={d} style={{ background: '#f5f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32, fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</div>
                    ))}
                  </div>

                  {/* Body: time column + one positioned column per day */}
                  <div style={{ display: 'grid', gridTemplateColumns: '58px repeat(5,1fr)', gap: 1, marginTop: 1 }}>
                    {/* Time labels */}
                    <div style={{ display: 'grid', gridTemplateRows: `repeat(${HOURS.length}, ${ROW_H}px)`, gap: 1 }}>
                      {HOURS.map(h => (
                        <div key={h} style={{ background: '#fff', fontSize: 10, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {h}:00
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {DAY_KEYS.map(day => {
                      const dayEvents = eventsForDay(day)
                      return (
                        <div key={day} style={{ position: 'relative', display: 'grid', gridTemplateRows: `repeat(${HOURS.length}, ${ROW_H}px)`, gap: 1 }}>
                          {/* Empty background cells */}
                          {HOURS.map(h => <div key={h} style={{ background: '#fff' }} />)}

                          {/* Event blocks, spanning multiple rows when needed */}
                          {dayEvents.map(ev => {
                            const col = colorOf(ev.displayColor)
                            const top = ev.startIdx * (ROW_H + 1)
                            const height = ev.span * ROW_H + (ev.span - 1) - 4
                            const isHovered = hovered === ev.id
                            return (
                              <div key={ev.id}
                                onMouseEnter={() => setHovered(ev.id)}
                                onMouseLeave={() => setHovered(null)}
                                onClick={() => ev.class_id && navigate(`/clase/${ev.class_id}`)}
                                style={{
                                  position: 'absolute', left: 3, right: 3,
                                  top: top + 2, height,
                                  background: col.light, color: col.text,
                                  borderLeft: `3px solid ${ev.displayColor}`,
                                  borderRadius: 6, padding: '4px 7px',
                                  fontSize: 11, fontWeight: 500,
                                  cursor: ev.class_id ? 'pointer' : 'default',
                                  overflow: 'hidden',
                                  boxShadow: isHovered ? '0 2px 10px rgba(0,0,0,.13)' : 'none',
                                  zIndex: isHovered ? 20 : 1,
                                  transition: 'box-shadow .12s',
                                }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.3 }}>
                                    {ev.displayName}
                                  </span>
                                  <button onClick={e => { e.stopPropagation(); handleDelete(ev.id) }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: col.text, opacity: .55, padding: 0, flexShrink: 0, display: 'flex' }}
                                    title="Eliminar del calendario">
                                    <TrashIcon />
                                  </button>
                                </div>
                                <div style={{ fontSize: 9.5, opacity: .75, marginTop: 1 }}>
                                  {ev.start_time}:00 – {ev.end_time}:00
                                </div>

                                {/* Tags: shown inside when the block is tall enough */}
                                {ev.span >= 2 && ev.tags.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                                    {ev.tags.map((t, i) => (
                                      <span key={i} style={{ fontSize: 9, background: 'rgba(255,255,255,.65)', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{t}</span>
                                    ))}
                                  </div>
                                )}

                                {/* Tooltip on hover for short blocks */}
                                {isHovered && ev.span < 2 && ev.tags.length > 0 && (
                                  <div style={{
                                    position: 'absolute', left: 6, right: 6, top: '100%', marginTop: 4,
                                    background: '#1a1a26', color: '#fff', borderRadius: 6,
                                    padding: '6px 8px', fontSize: 10, zIndex: 40,
                                    boxShadow: '0 4px 14px rgba(0,0,0,.25)', pointerEvents: 'none',
                                  }}>
                                    <div style={{ fontWeight: 600, marginBottom: 3 }}>{ev.displayName}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                      {ev.tags.map((t, i) => (
                                        <span key={i} style={{ background: 'rgba(255,255,255,.16)', borderRadius: 4, padding: '1px 5px' }}>{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

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
