const Database=require('better-sqlite3'),path=require('path')
const db=new Database(path.join(__dirname,'listas.db'))
db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON')
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,employee_number TEXT UNIQUE NOT NULL,nip TEXT NOT NULL,name TEXT NOT NULL,theme TEXT DEFAULT 'pink',created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,name TEXT NOT NULL,color TEXT DEFAULT '#c0185a',highlight_field1 TEXT,highlight_field2 TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS class_details(id INTEGER PRIMARY KEY AUTOINCREMENT,class_id INTEGER NOT NULL,label TEXT NOT NULL,value TEXT NOT NULL,FOREIGN KEY(class_id)REFERENCES classes(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,class_id INTEGER NOT NULL,full_name TEXT NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(class_id)REFERENCES classes(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS evaluation_models(id INTEGER PRIMARY KEY AUTOINCREMENT,class_id INTEGER NOT NULL,name TEXT NOT NULL,FOREIGN KEY(class_id)REFERENCES classes(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS model_traits(id INTEGER PRIMARY KEY AUTOINCREMENT,model_id INTEGER NOT NULL,trait_type TEXT NOT NULL,weight REAL NOT NULL DEFAULT 0,FOREIGN KEY(model_id)REFERENCES evaluation_models(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS periods(id INTEGER PRIMARY KEY AUTOINCREMENT,class_id INTEGER NOT NULL,name TEXT NOT NULL,start_date TEXT,end_date TEXT,weight REAL DEFAULT 33.33,model_id INTEGER,position INTEGER DEFAULT 0,FOREIGN KEY(class_id)REFERENCES classes(id)ON DELETE CASCADE,FOREIGN KEY(model_id)REFERENCES evaluation_models(id)ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS attendance_days(id INTEGER PRIMARY KEY AUTOINCREMENT,period_id INTEGER NOT NULL,day TEXT NOT NULL,month TEXT NOT NULL,date_label TEXT NOT NULL,position INTEGER DEFAULT 0,FOREIGN KEY(period_id)REFERENCES periods(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS attendance_records(id INTEGER PRIMARY KEY AUTOINCREMENT,day_id INTEGER NOT NULL,student_id INTEGER NOT NULL,present INTEGER DEFAULT 0,UNIQUE(day_id,student_id),FOREIGN KEY(day_id)REFERENCES attendance_days(id)ON DELETE CASCADE,FOREIGN KEY(student_id)REFERENCES students(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS evidences(id INTEGER PRIMARY KEY AUTOINCREMENT,period_id INTEGER NOT NULL,trait_type TEXT NOT NULL,name TEXT NOT NULL,position INTEGER DEFAULT 0,FOREIGN KEY(period_id)REFERENCES periods(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS evidence_grades(id INTEGER PRIMARY KEY AUTOINCREMENT,evidence_id INTEGER NOT NULL,student_id INTEGER NOT NULL,grade REAL,UNIQUE(evidence_id,student_id),FOREIGN KEY(evidence_id)REFERENCES evidences(id)ON DELETE CASCADE,FOREIGN KEY(student_id)REFERENCES students(id)ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS calendar_events(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,class_id INTEGER,class_name TEXT NOT NULL,day_of_week TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,color TEXT DEFAULT '#c0185a',FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);
`)
// Migration: older databases have a legacy calendar_events table (missing user_id/color,
// class_id wrongly NOT NULL). CREATE TABLE IF NOT EXISTS won't update it, so rebuild it here.
{
  const cols=db.prepare("PRAGMA table_info(calendar_events)").all().map(c=>c.name)
  if(cols.length&&!cols.includes('user_id')){
    db.pragma('foreign_keys = OFF')
    db.exec(`
      CREATE TABLE calendar_events_new(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,class_id INTEGER,class_name TEXT NOT NULL,day_of_week TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,color TEXT DEFAULT '#c0185a',FOREIGN KEY(user_id)REFERENCES users(id)ON DELETE CASCADE);
      INSERT INTO calendar_events_new(id,user_id,class_id,class_name,day_of_week,start_time,end_time,color)
        SELECT ce.id,COALESCE(c.user_id,(SELECT id FROM users ORDER BY id LIMIT 1)),ce.class_id,ce.class_name,ce.day_of_week,ce.start_time,ce.end_time,'#c0185a'
        FROM calendar_events ce LEFT JOIN classes c ON c.id=ce.class_id;
      DROP TABLE calendar_events;
      ALTER TABLE calendar_events_new RENAME TO calendar_events;
    `)
    db.pragma('foreign_keys = ON')
  }
}
if(!db.prepare("SELECT id FROM users WHERE employee_number='12345'").get())
  db.prepare("INSERT INTO users(employee_number,nip,name)VALUES(?,?,?)").run('12345','0000','Francisco Paulín')
// Migration: add recovery_code column to users (for NIP recovery) and backfill existing accounts.
// ALTER TABLE ADD COLUMN is safe on an existing table; guarded so it only runs once.
{
  const crypto=require('crypto')
  const genRecoveryCode=()=>{const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<12;i++){if(i&&i%4===0)s+='-';s+=a[crypto.randomInt(a.length)]}return s}
  const ucols=db.prepare("PRAGMA table_info(users)").all().map(c=>c.name)
  if(!ucols.includes('recovery_code'))db.exec("ALTER TABLE users ADD COLUMN recovery_code TEXT")
  const need=db.prepare("SELECT id,employee_number,name FROM users WHERE recovery_code IS NULL OR recovery_code=''").all()
  if(need.length){
    const upd=db.prepare("UPDATE users SET recovery_code=? WHERE id=?")
    console.log('🔑 Códigos de recuperación generados (guárdalos en un lugar seguro):')
    for(const u of need){const code=genRecoveryCode();upd.run(code,u.id);console.log(`   • Clave ${u.employee_number} (${u.name}): ${code}`)}
  }
}
module.exports=db
