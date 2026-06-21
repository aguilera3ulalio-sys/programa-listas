const express=require('express'),router=express.Router(),db=require('../db/database')
router.get('/',(req,res)=>res.json(db.prepare('SELECT * FROM calendar_events WHERE user_id=?').all(req.query.user_id)))
router.post('/',(req,res)=>{const{user_id,class_id,class_name,day_of_week,start_time,end_time,color}=req.body;const r=db.prepare('INSERT INTO calendar_events(user_id,class_id,class_name,day_of_week,start_time,end_time,color)VALUES(?,?,?,?,?,?,?)').run(user_id,class_id||null,class_name,day_of_week,start_time,end_time,color||'#c0185a');res.json(db.prepare('SELECT * FROM calendar_events WHERE id=?').get(r.lastInsertRowid))})
router.delete('/:id',(req,res)=>{db.prepare('DELETE FROM calendar_events WHERE id=?').run(req.params.id);res.json({success:true})})
module.exports=router
