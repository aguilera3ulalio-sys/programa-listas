const express=require('express'),router=express.Router(),db=require('../db/database'),bcrypt=require('bcryptjs')
const nipMatches=(entered,stored)=>{if(stored==null)return false;if(typeof stored==='string'&&stored.startsWith('$2'))return bcrypt.compareSync(String(entered),stored);return String(entered)===String(stored)}

router.get('/',async(req,res)=>{
  try{res.json(await db.all('SELECT * FROM students WHERE class_id=$1 ORDER BY full_name',[req.query.class_id]))}
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
