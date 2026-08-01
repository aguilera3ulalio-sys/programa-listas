require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 3001
const db = require('./db/database')

// Allowed origins come from FRONTEND_URL (comma-separated). Falls back to
// localhost for development. Keeps production from accepting any origin.
const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',').map(s => s.trim()).filter(Boolean)

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)           // curl / same-origin / health checks
    if (allowed.includes(origin)) return cb(null, true)
    return cb(new Error('Origen no permitido por CORS'))
  },
}))
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/classes', require('./routes/classes'))
app.use('/api/students', require('./routes/students'))
app.use('/api/periods', require('./routes/periods'))
app.use('/api/attendance', require('./routes/attendance'))
app.use('/api/evidences', require('./routes/evidences'))
app.use('/api/calendar', require('./routes/calendar'))
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

db.init()
  .then(() => {
    // 0.0.0.0 is required by hosted platforms such as Render.
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`)
      console.log(`Origenes permitidos: ${allowed.join(', ')}`)
    })
  })
  .catch(e => {
    console.error('No se pudo iniciar la base de datos:', e.message)
    process.exit(1)
  })
