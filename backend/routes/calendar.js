const express=require('express'),router=express.Router(),db=require('../db/database')
router.get('/',async(req,res)=>{
  try{res.json(await db.all('SELECT * FROM calendar_events WHERE user_id=$1',[req.query.user_id]))}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.post('/',async(req,res)=>{
  try{
    const{user_id,class_id,class_name,day_of_week,start_time,end_time,color}=req.body
    const r=await db.run('INSERT INTO calendar_events(user_id,class_id,class_name,day_of_week,start_time,end_time,color)VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[user_id,class_id||null,class_name,day_of_week,start_time,end_time,color||'#c0185a'])
    res.json(await db.get('SELECT * FROM calendar_events WHERE id=$1',[r.rows[0].id]))
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.delete('/:id',async(req,res)=>{
  try{await db.run('DELETE FROM calendar_events WHERE id=$1',[req.params.id]);res.json({success:true})}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
