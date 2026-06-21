const express=require('express'),router=express.Router(),db=require('../db/database')
router.get('/',(req,res)=>res.json(db.prepare('SELECT * FROM students WHERE class_id=? ORDER BY full_name').all(req.query.class_id)))
router.post('/',(req,res)=>{const{class_id,full_name}=req.body;if(!class_id||!full_name)return res.status(400).json({error:'class_id y full_name requeridos'});const r=db.prepare('INSERT INTO students(class_id,full_name)VALUES(?,?)').run(class_id,full_name.trim());res.json({id:r.lastInsertRowid,class_id,full_name:full_name.trim()})})
router.patch('/:id',(req,res)=>{db.prepare('UPDATE students SET full_name=? WHERE id=?').run(req.body.full_name.trim(),req.params.id);res.json(db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id))})
router.delete('/:id',(req,res)=>{const{user_id,nip}=req.body;if(!db.prepare('SELECT id FROM users WHERE id=? AND nip=?').get(user_id,nip))return res.status(403).json({error:'NIP incorrecto'});db.prepare('DELETE FROM students WHERE id=?').run(req.params.id);res.json({success:true})})
module.exports=router
