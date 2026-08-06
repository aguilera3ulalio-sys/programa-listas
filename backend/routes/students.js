const express=require('express'),router=express.Router(),db=require('../db/database'),bcrypt=require('bcryptjs')
const nipMatches=(entered,stored)=>{if(stored==null)return false;if(typeof stored==='string'&&stored.startsWith('$2'))return bcrypt.compareSync(String(entered),stored);return String(entered)===String(stored)}
const ORDER_ES=`ORDER BY lower(translate(full_name,'áàäâãÁÀÄÂÃéèëêÉÈËÊíìïîÍÌÏÎóòöôõÓÒÖÔÕúùüûÚÙÜÛñÑçÇ','aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUnNcC')) ASC, id ASC`

router.get('/',async(req,res)=>{
  try{res.json(await db.all(`SELECT * FROM students WHERE class_id=$1 ${ORDER_ES}`,[req.query.class_id]))}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.post('/',async(req,res)=>{
  try{
    const{class_id,full_name}=req.body
    if(!class_id||!full_name)return res.status(400).json({error:'class_id y full_name requeridos'})
    const r=await db.run('INSERT INTO students(class_id,full_name)VALUES($1,$2) RETURNING id',[class_id,full_name.trim()])
    res.json({id:r.rows[0].id,class_id,full_name:full_name.trim()})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.post('/bulk',async(req,res)=>{
  try{
    const{class_id,names}=req.body
    if(!class_id||!Array.isArray(names))return res.status(400).json({error:'class_id y names requeridos'})

    const existing=await db.all('SELECT lower(full_name) as ln FROM students WHERE class_id=$1',[class_id])
    const existingSet=new Set(existing.map(r=>r.ln))

    const seen=new Set()
    const toAdd=[]
    let skipped=0
    for(const name of names){
      const trimmed=String(name).trim()
      if(!trimmed){skipped++;continue}
      const lower=trimmed.toLowerCase()
      if(existingSet.has(lower)||seen.has(lower)){skipped++;continue}
      seen.add(lower)
      toAdd.push(trimmed)
    }

    if(toAdd.length===0)return res.json({added:0,skipped,students:[]})

    const values=toAdd.map((n,i)=>`($${i*2+1}, $${i*2+2})`).join(',')
    const params=toAdd.flatMap(n=>[class_id,n])
    await db.run(`INSERT INTO students (class_id, full_name) VALUES ${values}`,params)

    const students=await db.all(`SELECT * FROM students WHERE class_id=$1 ${ORDER_ES}`,[class_id])
    res.json({added:toAdd.length,skipped,students})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.patch('/:id',async(req,res)=>{
  try{
    await db.run('UPDATE students SET full_name=$1 WHERE id=$2',[req.body.full_name.trim(),req.params.id])
    res.json(await db.get('SELECT * FROM students WHERE id=$1',[req.params.id]))
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.delete('/:id',async(req,res)=>{
  try{
    const{user_id,nip}=req.body
    const u=await db.get('SELECT nip FROM users WHERE id=$1',[user_id])
    if(!u||!nipMatches(nip,u.nip))return res.status(403).json({error:'NIP incorrecto'})
    await db.run('DELETE FROM students WHERE id=$1',[req.params.id])
    res.json({success:true})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
