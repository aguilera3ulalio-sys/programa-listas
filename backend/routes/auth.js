const express=require('express'),router=express.Router(),db=require('../db/database'),crypto=require('crypto'),bcrypt=require('bcryptjs')
const ROUNDS=10
const genRecoveryCode=db.genRecoveryCode
const isHashed=(v)=>typeof v==='string'&&v.startsWith('$2')
const nipMatches=(entered,stored)=>{
  if(stored==null)return false
  if(isHashed(stored))return bcrypt.compareSync(String(entered),stored)
  return String(entered)===String(stored)
}
const attempts=new Map()
const WINDOW_MS=60*1000, MAX_ATTEMPTS=10
function rateLimit(req,res,next){
  const ip=req.ip||req.connection?.remoteAddress||'unknown'
  const now=Date.now()
  const list=(attempts.get(ip)||[]).filter(t=>now-t<WINDOW_MS)
  if(list.length>=MAX_ATTEMPTS)return res.status(429).json({error:'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'})
  list.push(now);attempts.set(ip,list);next()
}
function clearAttempts(req){const ip=req.ip||req.connection?.remoteAddress||'unknown';attempts.delete(ip)}

router.post('/login',rateLimit,async(req,res)=>{
  try{
    const{employee_number,nip}=req.body
    const u=await db.get('SELECT * FROM users WHERE employee_number=$1',[employee_number])
    if(!u||!nipMatches(nip,u.nip))return res.status(401).json({error:'Clave de trabajador o NIP incorrecto'})
    clearAttempts(req)
    res.json({user:{id:u.id,name:u.name,employee_number:u.employee_number,theme:u.theme}})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.post('/register',async(req,res)=>{
  try{
    const{employee_number,nip,name}=req.body
    if(!employee_number||!nip||!name)return res.status(400).json({error:'Todos los campos son requeridos'})
    if(await db.get('SELECT id FROM users WHERE employee_number=$1',[employee_number]))return res.status(409).json({error:'Clave de trabajador ya registrada'})
    const recovery_code=genRecoveryCode()
    const hash=bcrypt.hashSync(String(nip),ROUNDS)
    const r=await db.run('INSERT INTO users(employee_number,nip,name,recovery_code)VALUES($1,$2,$3,$4) RETURNING id',[employee_number,hash,name,recovery_code])
    const u=await db.get('SELECT * FROM users WHERE id=$1',[r.rows[0].id])
    res.json({user:{id:u.id,name:u.name,employee_number:u.employee_number,theme:u.theme},recovery_code})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.patch('/update',async(req,res)=>{
  try{
    const{user_id,name,new_nip,current_nip,theme}=req.body
    const u=await db.get('SELECT * FROM users WHERE id=$1',[user_id])
    if(!u)return res.status(404).json({error:'Usuario no encontrado'})
    if(new_nip){
      if(!nipMatches(current_nip,u.nip))return res.status(403).json({error:'NIP actual incorrecto'})
      if(String(new_nip).length<4)return res.status(400).json({error:'El nuevo NIP debe tener al menos 4 dígitos'})
      await db.run('UPDATE users SET nip=$1 WHERE id=$2',[bcrypt.hashSync(String(new_nip),ROUNDS),user_id])
    }
    if(name)await db.run('UPDATE users SET name=$1 WHERE id=$2',[name,user_id])
    if(theme)await db.run('UPDATE users SET theme=$1 WHERE id=$2',[theme,user_id])
    const updated=await db.get('SELECT * FROM users WHERE id=$1',[user_id])
    res.json({user:{id:updated.id,name:updated.name,employee_number:updated.employee_number,theme:updated.theme}})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.post('/recover',rateLimit,async(req,res)=>{
  try{
    const{employee_number,recovery_code,new_nip}=req.body
    if(!employee_number||!recovery_code||!new_nip)return res.status(400).json({error:'Todos los campos son requeridos'})
    if(String(new_nip).length<4)return res.status(400).json({error:'El nuevo NIP debe tener al menos 4 dígitos'})
    const u=await db.get('SELECT * FROM users WHERE employee_number=$1',[employee_number])
    const given=String(recovery_code).trim().toUpperCase()
    if(!u||!u.recovery_code||u.recovery_code.toUpperCase()!==given)return res.status(401).json({error:'Clave de trabajador o código de recuperación incorrecto'})
    await db.run('UPDATE users SET nip=$1 WHERE id=$2',[bcrypt.hashSync(String(new_nip),ROUNDS),u.id])
    clearAttempts(req)
    res.json({success:true})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
