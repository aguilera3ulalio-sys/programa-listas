const express=require('express'),router=express.Router(),db=require('../db/database')

// ---- Weekly recurring events (the timetable) ----
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

// ---- One-off meetings (dated events) ----
// GET /api/calendar/meetings?user_id=1&from=2026-08-01&to=2026-08-31
router.get('/meetings/list',async(req,res)=>{
  try{
    const{user_id,from,to}=req.query
    let rows
    if(from&&to){
      rows=await db.all(
        "SELECT id,user_id,class_id,title,to_char(meeting_date,'YYYY-MM-DD') AS meeting_date,start_time,end_time,color,notes FROM calendar_meetings WHERE user_id=$1 AND meeting_date BETWEEN $2 AND $3 ORDER BY meeting_date,start_time NULLS FIRST",
        [user_id,from,to])
    }else{
      rows=await db.all(
        "SELECT id,user_id,class_id,title,to_char(meeting_date,'YYYY-MM-DD') AS meeting_date,start_time,end_time,color,notes FROM calendar_meetings WHERE user_id=$1 ORDER BY meeting_date,start_time NULLS FIRST",
        [user_id])
    }
    res.json(rows)
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.post('/meetings',async(req,res)=>{
  try{
    const{user_id,class_id,title,meeting_date,start_time,end_time,color,notes}=req.body
    if(!user_id||!title||!meeting_date)return res.status(400).json({error:'Titulo y fecha son requeridos'})
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(meeting_date)))return res.status(400).json({error:'Fecha invalida'})
    if(start_time&&end_time&&parseInt(end_time)<=parseInt(start_time))
      return res.status(400).json({error:'La hora fin debe ser mayor que la de inicio'})
    const r=await db.run(
      'INSERT INTO calendar_meetings(user_id,class_id,title,meeting_date,start_time,end_time,color,notes)VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [user_id,class_id||null,String(title).trim().slice(0,80),meeting_date,start_time||null,end_time||null,color||'#c0185a',notes?String(notes).slice(0,300):null])
    const row=await db.get(
      "SELECT id,user_id,class_id,title,to_char(meeting_date,'YYYY-MM-DD') AS meeting_date,start_time,end_time,color,notes FROM calendar_meetings WHERE id=$1",
      [r.rows[0].id])
    res.json(row)
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.delete('/meetings/:id',async(req,res)=>{
  try{await db.run('DELETE FROM calendar_meetings WHERE id=$1',[req.params.id]);res.json({success:true})}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

module.exports=router
