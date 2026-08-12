// In-app confirmation dialog. Replaces the browser's confirm(), which looks
// like a system alert and can't be styled or explained properly.
export default function ConfirmModal({
  title,
  message,
  detail,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 60 }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h2 className="modal-title" style={danger ? { color: '#991b1b' } : undefined}>{title}</h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.55, marginBottom: detail ? 10 : 18 }}>
          {message}
        </p>
        {detail && (
          <div style={{ background: '#f5f5f8', borderRadius: 8, padding: '10px 12px', marginBottom: 18, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            {detail}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={loading}>{cancelLabel}</button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
