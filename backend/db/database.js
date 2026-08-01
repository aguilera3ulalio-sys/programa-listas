// PostgreSQL data layer (Neon). Reads connection string from DATABASE_URL env var.
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Copia backend/.env.example a backend/.env y pon tu cadena de Neon.')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech')?{rejectUnauthorized:false}:false,
})

// ---- Small async query helpers so route code stays close to the old shape ----
// query(sql, params) -> full result; get -> first row or undefined; all -> rows; run -> {rowCount, rows}
async function query(sql, params = []) { return pool.query(sql, params) }
async function get(sql, params = []) { const r = await pool.query(sql, params); return r.rows[0] }
async function all(sql, params = []) { const r = await pool.query(sql, params); return r.rows }
async function run(sql, params = []) { const r = await pool.query(sql, params); return { rowCount: r.rowCount, rows: r.rows } }

const genRecoveryCode = () => { const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<12;i++){ if(i&&i%4===0)s+='-'; s+=a[crypto.randomInt(a.length)] } return s }

// ---- Schema creation (Postgres dialect). Idempotent via IF NOT EXISTS. ----
async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      employee_number TEXT UNIQUE NOT NULL,
      nip TEXT NOT NULL,
      name TEXT NOT NULL,
      theme TEXT DEFAULT 'pink',
      recovery_code TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS classes(
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#c0185a',
      highlight_field1 TEXT, highlight_field2 TEXT, highlight_field3 TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS class_details(
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      label TEXT NOT NULL, value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students(
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS evaluation_models(
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS model_traits(
      id SERIAL PRIMARY KEY,
      model_id INTEGER NOT NULL REFERENCES evaluation_models(id) ON DELETE CASCADE,
      trait_type TEXT NOT NULL, weight REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS periods(
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      name TEXT NOT NULL, start_date TEXT, end_date TEXT,
      weight REAL DEFAULT 33.33,
      model_id INTEGER REFERENCES evaluation_models(id) ON DELETE SET NULL,
      position INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS attendance_days(
      id SERIAL PRIMARY KEY,
      period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
      day TEXT NOT NULL, month TEXT NOT NULL, date_label TEXT NOT NULL,
      position INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS attendance_records(
      id SERIAL PRIMARY KEY,
      day_id INTEGER NOT NULL REFERENCES attendance_days(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      present INTEGER DEFAULT 0,
      UNIQUE(day_id, student_id)
    );
    CREATE TABLE IF NOT EXISTS evidences(
      id SERIAL PRIMARY KEY,
      period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
      trait_type TEXT NOT NULL, name TEXT NOT NULL, position INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS evidence_grades(
      id SERIAL PRIMARY KEY,
      evidence_id INTEGER NOT NULL REFERENCES evidences(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      grade REAL,
      UNIQUE(evidence_id, student_id)
    );
    CREATE TABLE IF NOT EXISTS calendar_events(
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id INTEGER,
      class_name TEXT NOT NULL, day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL,
      color TEXT DEFAULT '#c0185a'
    );
  `)

  // Seed demo user (hashed NIP) if the users table is empty.
  const existing = await get('SELECT id FROM users WHERE employee_number=$1', ['12345'])
  if (!existing) {
    const hash = bcrypt.hashSync('0000', 10)
    const code = genRecoveryCode()
    await run('INSERT INTO users(employee_number,nip,name,recovery_code) VALUES($1,$2,$3,$4)', ['12345', hash, 'Francisco Paulín', code])
    console.log(`Usuario demo creado - Clave 12345, NIP 0000. Codigo de recuperacion: ${code}`)
  }
  console.log('Esquema PostgreSQL listo.')
}

module.exports = { pool, query, get, all, run, init, genRecoveryCode }
