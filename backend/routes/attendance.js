const express=require('express'),router=express.Router(),db=require('../db/database')
async function buildRecords(days){
  const records={}
  for(const d of days){
    const rs=await db.all('SELECT * FROM attendance_records WHERE day_id=$1',[d.id])
    rs.forEach(r=>{records[`${r.day_id}_${r.student_id}`]=r.present})
  }
  return records
}
router.get('/',async(req,res)=>{
  try{
    const days=await db.all('SELECT * FROM attendance_days WHERE period_id=$1 ORDER BY position,id',[req.query.period_id])
    res.json({days,records:await buildRecords(days)})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.post('/save',async(req,res)=>{
  try{
    const{period_id,records,new_day}=req.body
    if(new_day){
      const p=await db.get('SELECT class_id FROM periods WHERE id=$1',[period_id])
      const sts=await db.all('SELECT id FROM students WHERE class_id=$1',[p.class_id])
      // insert_after: id of the day this one goes after. Null/absent = append at the end.
      let pos
      if(new_day.insert_after){
        const ref=await db.get('SELECT position FROM attendance_days WHERE id=$1 AND period_id=$2',[new_day.insert_after,period_id])
        if(ref){
          pos=ref.position+1
          // push every later day one slot to the right so ordering stays correct
          await db.run('UPDATE attendance_days SET position=position+1 WHERE period_id=$1 AND position>=$2',[period_id,pos])
        }
      }
      if(pos===undefined){
        const cntRow=await db.get('SELECT COUNT(*)::int AS c FROM attendance_days WHERE period_id=$1',[period_id])
        pos=cntRow.c
      }
      const r=await db.run('INSERT INTO attendance_days(period_id,day,month,date_label,position)VALUES($1,$2,$3,$4,$5) RETURNING id',[period_id,new_day.day,new_day.month,`${new_day.day} ${new_day.month}`,pos])
      const dayId=r.rows[0].id
      for(const st of sts)await db.run('INSERT INTO attendance_records(day_id,student_id,present)VALUES($1,$2,0) ON CONFLICT(day_id,student_id) DO NOTHING',[dayId,st.id])
    }
    if(records){
      for(const [k,v] of Object.entries(records)){
        const[d,st]=k.split('_')
        await db.run('INSERT INTO attendance_records(day_id,student_id,present)VALUES($1,$2,$3) ON CONFLICT(day_id,student_id) DO UPDATE SET present=EXCLUDED.present',[parseInt(d),parseInt(st),v?1:0])
      }
    }
    const days=await db.all('SELECT * FROM attendance_days WHERE period_id=$1 ORDER BY position,id',[period_id])
    res.json({days,records:await buildRecords(days)})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.delete('/day/:id',async(req,res)=>{
  try{await db.run('DELETE FROM attendance_days WHERE id=$1',[req.params.id]);res.json({success:true})}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
