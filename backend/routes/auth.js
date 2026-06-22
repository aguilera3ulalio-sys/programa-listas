const express=require('express'),router=express.Router(),db=require('../db/database'),crypto=require('crypto'),bcrypt=require('bcryptjs')
const ROUNDS=10
const genRecoveryCode=()=>{const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<12;i++){if(i&&i%4===0)s+='-';s+=a[crypto.randomInt(a.length)]}return s}
// A stored NIP is hashed if it looks like a bcrypt hash ($2a$/$2b$/$2y$...).
const isHashed=(v)=>typeof v==='string'&&v.startsWith('$2')
// Verify an entered NIP against the stored value, supporting both hashed and (legacy) plain values.
const nipMatches=(entered,stored)=>{
  if(stored==null)return false
  if(isHashed(stored))return bcrypt.compareSync(String(entered),stored)
  return String(entered)===String(stored) // legacy plain-text fallback (pre-migration)
}

// ---- Simple in-memory rate limiter for sensitive auth endpoints ----
// Caps attempts per IP within a rolling window to make NIP brute-forcing impractical.
const attempts=new Map() // ip -> [timestamps]
const WINDOW_MS=60*1000, MAX_ATTEMPTS=10
function rateLimit(req,res,next){
  const ip=req.ip||req.connection?.remoteAddress||'unknown'
  const now=Date.now()
  const list=(attempts.get(ip)||[]).filter(t=>now-t<WINDOW_MS)
  if(list.length>=MAX_ATTEMPTS){
    return res.status(429).json({error:'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'})
  }
  list.push(now);attempts.set(ip,list)
  next()
}
// Clear a client's attempt counter after a successful auth.
function clearAttempts(req){const ip=req.ip||req.connection?.remoteAddress||'unknown';attempts.delete(ip)}

router.post('/login',rateLimit,(req,res)=>{
  const{employee_number,nip}=req.body
  const u=db.prepare('SELECT * FROM users WHERE employee_number=?').get(employee_number)
  if(!u||!nipMatches(nip,u.nip))return res.status(401).json({error:'Clave de trabajador o NIP incorrecto'})
  clearAttempts(req)
  res.json({user:{id:u.id,name:u.name,employee_number:u.employee_number,theme:u.theme}})
})

router.post('/register',(req,res)=>{
  const{employee_number,nip,name}=req.body
  if(!employee_number||!nip||!name)return res.status(400).json({error:'Todos los campos son requeridos'})
  if(db.prepare('SELECT id FROM users WHERE employee_number=?').get(employee_number))return res.status(409).json({error:'Clave de trabajador ya registrada'})
  const recovery_code=genRecoveryCode()
  const hash=bcrypt.hashSync(String(nip),ROUNDS)
  const r=db.prepare('INSERT INTO users(employee_number,nip,name,recovery_code)VALUES(?,?,?,?)').run(employee_number,hash,name,recovery_code)
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid)
  res.json({user:{id:u.id,name:u.name,employee_number:u.employee_number,theme:u.theme},recovery_code})
})

router.patch('/update',(req,res)=>{
  const{user_id,name,new_nip,current_nip,theme}=req.body
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(user_id)
  if(!u)return res.status(404).json({error:'Usuario no encontrado'})
  if(new_nip){
    if(!nipMatches(current_nip,u.nip))return res.status(403).json({error:'NIP actual incorrecto'})
    if(String(new_nip).length<4)return res.status(400).json({error:'El nuevo NIP debe tener al menos 4 dígitos'})
    db.prepare('UPDATE users SET nip=? WHERE id=?').run(bcrypt.hashSync(String(new_nip),ROUNDS),user_id)
  }
  if(name)db.prepare('UPDATE users SET name=? WHERE id=?').run(name,user_id)
  if(theme)db.prepare('UPDATE users SET theme=? WHERE id=?').run(theme,user_id)
  const updated=db.prepare('SELECT * FROM users WHERE id=?').get(user_id)
  res.json({user:{id:updated.id,name:updated.name,employee_number:updated.employee_number,theme:updated.theme}})
})

router.post('/recover',rateLimit,(req,res)=>{
  const{employee_number,recovery_code,new_nip}=req.body
  if(!employee_number||!recovery_code||!new_nip)return res.status(400).json({error:'Todos los campos son requeridos'})
  if(String(new_nip).length<4)return res.status(400).json({error:'El nuevo NIP debe tener al menos 4 dígitos'})
  const u=db.prepare('SELECT * FROM users WHERE employee_number=?').get(employee_number)
  const given=String(recovery_code).trim().toUpperCase()
  if(!u||!u.recovery_code||u.recovery_code.toUpperCase()!==given)return res.status(401).json({error:'Clave de trabajador o código de recuperación incorrecto'})
  db.prepare('UPDATE users SET nip=? WHERE id=?').run(bcrypt.hashSync(String(new_nip),ROUNDS),u.id)
  clearAttempts(req)
  res.json({success:true})
})

module.exports=router
