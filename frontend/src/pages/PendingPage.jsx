import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import logoUrl from '../assets/logo.js'

const TRAIT_LABELS = {
  actividades: 'Actividades', tareas: 'Tareas', proyecto: 'Proyecto',
  examen: 'Examen', practicas: 'Prácticas', asistencia: 'Asistencia', trabajos: 'Trabajos'
}

export default function PendingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    api.getPending(user.id)
      .then(data => {
        // Group by class+period, keep earliest period per class
        // Sort so earlier periods come first within each class
        const sorted = [...data].sort((a, b) => a.period_position - b.period_position)
        setPending(sorted)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  // Unique classes with pending items
  const classesWithPending = [...new Map(
    pending.map(p => [p.class_id, { id: p.class_id, name: p.class_name, color: p.class_color }])
  ).values()]

  const filtered = filter ? pending.filter(p => p.class_id === filter) : pending
  const totalMissing = filtered.reduce((sum, p) => sum + p.missing_count, 0)

  // FIX: Navigate to /clase/:id with evidencias tab and period highlighted
  // We pass period_id as a URL param so ClassView can auto-select it
  const goToEvidence = (item) => {
    // Navigate to the class, evidencias tab, with the period_id in the URL
    navigate(`/clase/${item.class_id}?tab=evidencias&period_id=${item.period_id}`)
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <img src={logoUrl} alt="UAQ" className="topbar-logo" />
            <div>
              <div className="page-title">Pendientes</div>
              <div className="page-subtitle">{user.name}</div>
            </div>
          </div>
          {!loading && totalMissing > 0 && (
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
              {totalMissing} calificación{totalMissing !== 1 ? 'es' : ''} faltante{totalMissing !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="content">
          {loading ? (
            <div className="loading"><div className="spinner" />Cargando...</div>
          ) : pending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ fontSize: 28 }}>✓</div>
              <h3>Todo al día</h3>
              <p>No hay evidencias con calificaciones pendientes.</p>
            </div>
          ) : (
            <>
              {/* Class filter pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#888' }}>Filtrar:</span>
                <button className={`pill ${filter === null ? 'active' : ''}`} onClick={() => setFilter(null)}>
                  Todas
                </button>
                {classesWithPending.map(cls => (
                  <button
                    key={cls.id}
                    className={`pill ${filter === cls.id ? 'active' : ''}`}
                    onClick={() => setFilter(filter === cls.id ? null : cls.id)}
                    style={filter === cls.id ? {} : { borderColor: cls.color + '88' }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cls.color, display: 'inline-block', marginRight: 4 }} />
                    {cls.name}
                  </button>
                ))}
              </div>

              {/* Pending table */}
              <div className="card">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trabajo</th>
                        <th>Materia</th>
                        <th>Parcial</th>
                        <th>Dato 1</th>
                        <th>Dato 2</th>
                        <th style={{ textAlign: 'center' }}>Sin calificar</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, i) => (
                        <tr key={i}>
                          <td>
                            <span style={{ background: '#fef9c3', color: '#854d0e', fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 8px' }}>
                              {TRAIT_LABELS[p.trait_type] || p.trait_type}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.class_color, flexShrink: 0, display: 'inline-block' }} />
                              {p.class_name}
                            </div>
                          </td>
                          <td style={{ color: '#888', fontSize: 12 }}>{p.period_name}</td>
                          <td style={{ color: '#888', fontSize: 12 }}>{p.detail1 || '—'}</td>
                          <td style={{ color: '#888', fontSize: 12 }}>{p.detail2 || '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#991b1b' }}>{p.missing_count}</span>
                            <span style={{ color: '#aaa', fontSize: 11 }}> / {p.total_students}</span>
                          </td>
                          <td>
                            {/* FIX: Goes to evidencias tab with correct parcial selected */}
                            <button className="btn btn-sm btn-accent" onClick={() => goToEvidence(p)}>
                              Ir a evidencias →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filtered.length === 0 && filter && (
                <div style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>
                  No hay pendientes para esta materia.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
