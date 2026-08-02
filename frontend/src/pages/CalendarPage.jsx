import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar, { MenuButton } from '../components/Sidebar'
import logoUrl from '../assets/logo.js'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
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
const ChevL = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
const ChevR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>

const pad = n => String(n).padStart(2, '0')
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const normalize = s => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const colorOf = v => COLORS.find(c => c.value === v) || COLORS[0]

// Resolve a weekly event against its class so name/color/tags stay live.
function resolveEvent(ev, classes) {
  const cls = ev.class_id ? classes.find(c => c.id === ev.class_id) : null
  return {
    ...ev,
    displayName: cls ? cls.name : ev.class_name,
    displayColor: cls ? (cls.color || '#c0185a') : (ev.color || '#c0185a'),
    tags: cls ? [cls.highlight_field1, cls.highlight_field2, cls.highlight_field3].filter(Boolean) : [],
  }
}

// Build Mon-Fri month grid. Returns weeks of 5 cells.
function buildMonthGrid(year, month, todayIso) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7   // Mon=0 ... Sun=6
  const cursor = new Date(year, month, 1 - startOffset)
  const weeks = []
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(cursor)
      week.push({
        date: isoOf(dt), day: dt.getDate(), weekdayIdx: d,
        inMonth: dt.getMonth() === month, isToday: isoOf(dt) === todayIso,
        isWeekend: d >= 5,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    if (!week.some(c => c.inMonth) && w > 0) break
    weeks.push(week)
  }
  return weeks
}

// ---------- Meeting modal ----------
function AddMeetingModal({ classes, defaultDate, onClose, onAdded }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || isoOf(new Date()))
  const [classId, setClassId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const linked = classId ? classes.find(c => c.id === parseInt(classId)) : null
  const effColor = linked ? (linked.color || '#c0185a') : color
  const endOptions = start ? HOURS.filter(h => h > parseInt(start)).concat([19]).filter((v, i, a) => a.indexOf(v) === i) : []

  const submit = async e => {
    e.preventDefault(); setError('')
    if (!title.trim()) return setError('Escribe un titulo')
    if (!date) return setError('Selecciona la fecha')
    if (start && end && parseInt(end) <= parseInt(start)) return setError('La hora fin debe ser mayor que la de inicio')
    setLoading(true)
    try {
      const m = await api.addMeeting({
        user_id: user.id,
        class_id: classId ? parseInt(classId) : null,
        title: title.trim(), meeting_date: date,
        start_time: start || null, end_time: end || null,
        color: effColor, notes: notes.trim() || null,
      })
      onAdded(m); onClose()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 40 }} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Agregar reunion</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Titulo</label>
            <input className="form-input" placeholder="Ej. Junta de academia" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Relacionar con clase (opcional)</label>
            <select className="form-select" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">— Sin clase —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {linked && <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Usara el color de la clase.</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Hora inicio (opcional)</label>
              <select className="form-select" value={start} onChange={e => { setStart(e.target.value); setEnd('') }}>
                <option value="">Todo el dia</option>
                {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hora fin</label>
              <select className="form-select" value={end} onChange={e => setEnd(e.target.value)} disabled={!start}>
                <option value="">{start ? 'Seleccionar' : '—'}</option>
                {endOptions.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
          </div>
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
          <div className="form-group">
            <label className="form-label">Notas (opcional)</label>
            <input className="form-input" placeholder="Lugar, asunto..." value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Weekly event modal (existing behaviour) ----------
function AddEventModal({ classes, onClose, onAdded }) {
  const { user } = useAuth()
  const [classId, setClassId] = useState('')
  const [clsName, setClsName] = useState('')
  const [selectedDays, setSelectedDays] = useState([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState('#c0185a')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const linked = classId ? classes.find(c => c.id === parseInt(classId)) : null

  const handleClassSelect = e => {
    const id = e.target.value; setClassId(id)
    if (id) { const c = classes.find(c => c.id === parseInt(id)); if (c) { setClsName(c.name); setColor(c.color || '#c0185a') } }
    else setClsName('')
  }
  const toggleDay = d => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  const endOptions = startTime ? HOURS.filter(h => h > parseInt(startTime)).concat([19]).filter((v, i, a) => a.indexOf(v) === i) : []

  const handleSubmit = async e => {
    e.preventDefault(); setError('')
    if (!clsName.trim()) return setError('Escribe el nombre')
    if (selectedDays.length === 0) return setError('Selecciona al menos un dia')
    if (!startTime || !endTime) return setError('Selecciona el horario')
    if (parseInt(endTime) <= parseInt(startTime)) return setError('La hora fin debe ser mayor que la de inicio')
    setLoading(true)
    try {
      const created = await Promise.all(selectedDays.map(day => api.addEvent({
        user_id: user.id, class_id: classId ? parseInt(classId) : null,
        class_name: clsName.trim(), day_of_week: day,
        start_time: String(startTime), end_time: String(endTime), color,
      })))
      created.forEach(ev => onAdded(ev)); onClose()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const previewTags = linked ? [linked.highlight_field1, linked.highlight_field2, linked.highlight_field3].filter(Boolean) : []
  const col = colorOf(color)

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 40 }} onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Agregar clase al horario</h2>
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
                <span style={{ fontSize: 11, color: '#888' }}>Se usaran nombre, color y datos de la clase:</span>
                {previewTags.map((t, i) => <span key={i} className="badge" style={{ background: col.light, color: col.text }}>{t}</span>)}
              </div>
            )}
          </div>
          {!linked && (
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" placeholder="Ej. Tutoria" value={clsName} onChange={e => setClsName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Dias</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => (
                <button key={d} type="button" className={`pill ${selectedDays.includes(DAY_KEYS[i]) ? 'active' : ''}`} onClick={() => toggleDay(DAY_KEYS[i])}>{d}</button>
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

// ---------- Main ----------
export default function CalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [meetings, setMeetings] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [meetingDate, setMeetingDate] = useState(null)
  const [hovered, setHovered] = useState(null)

  // View mode + current month, both remembered locally.
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('cal_view') || 'week' } catch { return 'week' }
  })
  const today = new Date()
  const [cursorYM, setCursorYM] = useState({ y: today.getFullYear(), m: today.getMonth() })

  // Which classes are visible. Stored as a set of hidden ids.
  const [hidden, setHidden] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cal_hidden') || '[]')) } catch { return new Set() }
  })
  const [hideMeetings, setHideMeetings] = useState(() => {
    try { return localStorage.getItem('cal_hide_meetings') === '1' } catch { return false }
  })
  const [hideUnlinked, setHideUnlinked] = useState(() => {
    try { return localStorage.getItem('cal_hide_unlinked') === '1' } catch { return false }
  })

  useEffect(() => { try { localStorage.setItem('cal_view', view) } catch {} }, [view])
  useEffect(() => { try { localStorage.setItem('cal_hidden', JSON.stringify([...hidden])) } catch {} }, [hidden])
  useEffect(() => { try { localStorage.setItem('cal_hide_meetings', hideMeetings ? '1' : '0') } catch {} }, [hideMeetings])
  useEffect(() => { try { localStorage.setItem('cal_hide_unlinked', hideUnlinked ? '1' : '0') } catch {} }, [hideUnlinked])

  useEffect(() => {
    Promise.all([api.getEvents(user.id), api.getClasses(user.id), api.getMeetings(user.id)])
      .then(([evs, cls, mts]) => { setEvents(evs); setClasses(cls); setMeetings(mts) })
      .catch(console.error).finally(() => setLoading(false))
  }, [user.id])

  const toggleClass = id => setHidden(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const isVisible = ev => {
    if (ev.class_id) return !hidden.has(ev.class_id)
    return !hideUnlinked
  }

  const resolved = useMemo(() => events.map(ev => resolveEvent(ev, classes)), [events, classes])
  const visibleEvents = resolved.filter(isVisible)
  const visibleMeetings = hideMeetings ? [] : meetings.filter(m => !m.class_id || !hidden.has(m.class_id))

  const handleDeleteEvent = async id => { await api.deleteEvent(id); setEvents(p => p.filter(e => e.id !== id)) }
  const handleDeleteMeeting = async id => { await api.deleteMeeting(id); setMeetings(p => p.filter(m => m.id !== id)) }

  // --- week view placement ---
  const eventsForDay = dayKey => visibleEvents
    .filter(ev => normalize(ev.day_of_week) === normalize(dayKey))
    .map(ev => {
      const s = parseInt(ev.start_time)
      let e = parseInt(ev.end_time)
      if (!Number.isFinite(e) || e <= s) e = s + 1
      const startIdx = HOURS.indexOf(s)
      if (startIdx < 0) return null
      return { ...ev, startIdx, span: Math.min(e - s, HOURS.length - startIdx) }
    }).filter(Boolean)

  // --- month view ---
  const todayIso = isoOf(new Date())
  const weeks = useMemo(() => buildMonthGrid(cursorYM.y, cursorYM.m, todayIso), [cursorYM, todayIso])
  const meetingsByDate = useMemo(() => {
    const m = {}
    visibleMeetings.forEach(mt => { (m[mt.meeting_date] = m[mt.meeting_date] || []).push(mt) })
    return m
  }, [visibleMeetings])

  const shiftMonth = delta => setCursorYM(({ y, m }) => {
    const d = new Date(y, m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const goToday = () => setCursorYM({ y: today.getFullYear(), m: today.getMonth() })

  const classesUsed = classes.filter(c => events.some(e => e.class_id === c.id) || meetings.some(m => m.class_id === c.id))
  const hasUnlinked = events.some(e => !e.class_id)

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <MenuButton onClick={() => setMenuOpen(true)} />
            <img src={logoUrl} alt="UAQ" className="topbar-logo" />
            <div>
              <div className="page-title">Calendario</div>
              <div className="page-subtitle">{user.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`pill ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Semana</button>
            <button className={`pill ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Mes</button>
          </div>
        </div>

        {/* Filters */}
        {(classesUsed.length > 0 || hasUnlinked || meetings.length > 0) && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', padding: '11px 20px', background: '#fff', borderBottom: '1px solid #e0e0e8' }}>
            <span style={{ fontSize: 12, color: '#888', marginRight: 4, fontWeight: 500 }}>Mostrar:</span>
            {classesUsed.map(c => {
              const on = !hidden.has(c.id)
              const cc = c.color || '#c0185a'
              return (
                <button key={c.id} onClick={() => toggleClass(c.id)}
                  title={on ? 'Ocultar' : 'Mostrar'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 16,
                           border: `1.5px solid ${on ? cc : '#d0d0da'}`,
                           background: on ? cc : '#fff',
                           color: on ? '#fff' : '#999', fontSize: 12, fontWeight: 600,
                           cursor: 'pointer', transition: 'all .15s',
                           textDecoration: on ? 'none' : 'line-through' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%',
                                 background: on ? '#fff' : '#ccc',
                                 border: on ? 'none' : `1.5px solid #ccc` }} />
                  {c.name}
                </button>
              )
            })}
            {hasUnlinked && (
              <button onClick={() => setHideUnlinked(v => !v)}
                title={hideUnlinked ? 'Mostrar' : 'Ocultar'}
                style={{ padding: '6px 13px', borderRadius: 16, border: `1.5px solid ${hideUnlinked ? '#d0d0da' : '#555'}`,
                         background: hideUnlinked ? '#fff' : '#555',
                         color: hideUnlinked ? '#999' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                         textDecoration: hideUnlinked ? 'line-through' : 'none' }}>
                Otras
              </button>
            )}
            {meetings.length > 0 && (
              <button onClick={() => setHideMeetings(v => !v)}
                title={hideMeetings ? 'Mostrar' : 'Ocultar'}
                style={{ padding: '6px 13px', borderRadius: 16, border: `1.5px solid ${hideMeetings ? '#d0d0da' : '#1a1a26'}`,
                         background: hideMeetings ? '#fff' : '#1a1a26',
                         color: hideMeetings ? '#999' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                         textDecoration: hideMeetings ? 'line-through' : 'none' }}>
                Reuniones
              </button>
            )}
          </div>
        )}

        {/* Month navigation */}
        {view === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: '#fff', borderBottom: '1px solid #e0e0e8' }}>
            <button className="btn-icon" onClick={() => shiftMonth(-1)}><ChevL /></button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 150 }}>{MONTHS[cursorYM.m]} {cursorYM.y}</span>
            <button className="btn-icon" onClick={() => shiftMonth(1)}><ChevR /></button>
            <button className="btn btn-sm" onClick={goToday}>Hoy</button>
          </div>
        )}

        <div className="content">
          {loading ? <div className="loading"><div className="spinner" />Cargando...</div> : view === 'week' ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 780, border: '1px solid #e0e0e8', borderRadius: 10, overflow: 'hidden', background: '#e0e0e8' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '58px repeat(7,1fr)', gap: 1 }}>
                    <div style={{ background: '#f5f5f8', minHeight: 32 }} />
                    {DAYS.map(d => (
                      <div key={d} style={{ background: '#f5f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32, fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '58px repeat(7,1fr)', gap: 1, marginTop: 1 }}>
                    <div style={{ display: 'grid', gridTemplateRows: `repeat(${HOURS.length}, ${ROW_H}px)`, gap: 1 }}>
                      {HOURS.map(h => (
                        <div key={h} style={{ background: '#fff', fontSize: 10, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{h}:00</div>
                      ))}
                    </div>
                    {DAY_KEYS.map(day => (
                      <div key={day} style={{ position: 'relative', display: 'grid', gridTemplateRows: `repeat(${HOURS.length}, ${ROW_H}px)`, gap: 1 }}>
                        {HOURS.map(h => <div key={h} style={{ background: '#fff' }} />)}
                        {eventsForDay(day).map(ev => {
                          const col = colorOf(ev.displayColor)
                          const top = ev.startIdx * (ROW_H + 1)
                          const height = ev.span * ROW_H + (ev.span - 1) - 4
                          const isH = hovered === ev.id
                          return (
                            <div key={ev.id}
                              onMouseEnter={() => setHovered(ev.id)} onMouseLeave={() => setHovered(null)}
                              onClick={() => ev.class_id && navigate(`/clase/${ev.class_id}`)}
                              style={{ position: 'absolute', left: 3, right: 3, top: top + 2, height,
                                background: col.light, color: col.text, borderLeft: `3px solid ${ev.displayColor}`,
                                borderRadius: 6, padding: '4px 7px', fontSize: 11, fontWeight: 500,
                                cursor: ev.class_id ? 'pointer' : 'default', overflow: 'hidden',
                                boxShadow: isH ? '0 2px 10px rgba(0,0,0,.13)' : 'none', zIndex: isH ? 20 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.3 }}>{ev.displayName}</span>
                                <button onClick={e => { e.stopPropagation(); handleDeleteEvent(ev.id) }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: col.text, opacity: .55, padding: 0, flexShrink: 0, display: 'flex' }}>
                                  <TrashIcon />
                                </button>
                              </div>
                              <div style={{ fontSize: 9.5, opacity: .75, marginTop: 1 }}>{ev.start_time}:00 – {ev.end_time}:00</div>
                              {ev.span >= 2 && ev.tags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                                  {ev.tags.map((t, i) => <span key={i} style={{ fontSize: 9, background: 'rgba(255,255,255,.65)', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{t}</span>)}
                                </div>
                              )}
                              {isH && ev.span < 2 && ev.tags.length > 0 && (
                                <div style={{ position: 'absolute', left: 6, right: 6, top: '100%', marginTop: 4, background: '#1a1a26', color: '#fff', borderRadius: 6, padding: '6px 8px', fontSize: 10, zIndex: 40, boxShadow: '0 4px 14px rgba(0,0,0,.25)', pointerEvents: 'none' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 3 }}>{ev.displayName}</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    {ev.tags.map((t, i) => <span key={i} style={{ background: 'rgba(255,255,255,.16)', borderRadius: 4, padding: '1px 5px' }}>{t}</span>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {events.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 32, color: '#888', fontSize: 13 }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, color: '#555' }}>Calendario vacio</p>
                  <p>Agrega tus clases para verlas en la vista semanal.</p>
                </div>
              )}
            </>
          ) : (
            /* ---------- MONTH VIEW ---------- */
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 800, border: '1px solid #e0e0e8', borderRadius: 10, overflow: 'hidden', background: '#e0e0e8' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ background: '#f5f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 30, fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginTop: 1 }}>
                    {week.map(cell => {
                      const dayClasses = visibleEvents.filter(ev => normalize(ev.day_of_week) === normalize(DAY_KEYS[cell.weekdayIdx]))
                        .sort((a, b) => parseInt(a.start_time) - parseInt(b.start_time))
                      const dayMeetings = meetingsByDate[cell.date] || []
                      return (
                        <div key={cell.date}
                          onClick={() => { setMeetingDate(cell.date); setShowAddMeeting(true) }}
                          style={{ background: cell.inMonth ? (cell.isWeekend ? '#fbfbfd' : '#fff') : '#fafafb', minHeight: 104, padding: 6, cursor: 'pointer', opacity: cell.inMonth ? 1 : .55 }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                            <span style={{
                              fontSize: 11, fontWeight: cell.isToday ? 700 : 500,
                              color: cell.isToday ? '#fff' : (cell.inMonth ? '#555' : '#bbb'),
                              background: cell.isToday ? 'var(--accent)' : 'transparent',
                              borderRadius: '50%', width: 20, height: 20,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>{cell.day}</span>
                          </div>
                          {cell.inMonth && dayClasses.slice(0, 3).map(ev => {
                            const col = colorOf(ev.displayColor)
                            return (
                              <div key={`c${ev.id}`} title={`${ev.displayName} ${ev.start_time}:00-${ev.end_time}:00`}
                                onClick={e => { e.stopPropagation(); ev.class_id && navigate(`/clase/${ev.class_id}`) }}
                                style={{ background: col.light, color: col.text, borderLeft: `2px solid ${ev.displayColor}`, borderRadius: 4, padding: '2px 5px', fontSize: 10, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ev.start_time}:00 {ev.displayName}
                              </div>
                            )
                          })}
                          {cell.inMonth && dayClasses.length > 3 && (
                            <div style={{ fontSize: 9, color: '#aaa', marginBottom: 2 }}>+{dayClasses.length - 3} mas</div>
                          )}
                          {dayMeetings.map(mt => {
                            const col = colorOf(mt.color)
                            return (
                              <div key={`m${mt.id}`} title={mt.notes || mt.title}
                                onClick={e => e.stopPropagation()}
                                style={{ background: col.text, color: '#fff', borderRadius: 4, padding: '2px 5px', fontSize: 10, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {mt.start_time ? `${mt.start_time}:00 ` : ''}{mt.title}
                                </span>
                                <button onClick={e => { e.stopPropagation(); handleDeleteMeeting(mt.id) }}
                                  style={{ background: 'none', border: 'none', color: '#fff', opacity: .7, padding: 0, cursor: 'pointer', display: 'flex' }}>
                                  <TrashIcon />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 10 }}>
                Toca cualquier dia para agregar una reunion.
              </p>
            </div>
          )}
        </div>

        <div className="bottom-bar" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowAddEvent(true)}><PlusIcon /> Agregar clase</button>
          <button className="btn" onClick={() => { setMeetingDate(null); setShowAddMeeting(true) }}><PlusIcon /> Agregar reunion</button>
        </div>
      </div>

      {showAddEvent && <AddEventModal classes={classes} onClose={() => setShowAddEvent(false)} onAdded={ev => setEvents(p => [...p, ev])} />}
      {showAddMeeting && <AddMeetingModal classes={classes} defaultDate={meetingDate} onClose={() => setShowAddMeeting(false)} onAdded={m => setMeetings(p => [...p, m])} />}
    </div>
  )
}
