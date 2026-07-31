const express=require('express'),router=express.Router(),db=require('../db/database')

router.get('/pending',async(req,res)=>{
  try{
    const classes=await db.all('SELECT * FROM classes WHERE user_id=$1',[req.query.user_id])
    const result=[]
    for(const cls of classes){
      const details=await db.all('SELECT value FROM class_details WHERE class_id=$1 ORDER BY id LIMIT 2',[cls.id])
      const periods=await db.all('SELECT * FROM periods WHERE class_id=$1 ORDER BY position',[cls.id])
      const scRow=await db.get('SELECT COUNT(*)::int AS c FROM students WHERE class_id=$1',[cls.id])
      const studentCount=scRow.c
      if(studentCount===0)continue
      for(const period of periods){
        const evidences=await db.all('SELECT * FROM evidences WHERE period_id=$1 ORDER BY position',[period.id])
        for(const ev of evidences){
          const gRow=await db.get('SELECT COUNT(*)::int AS c FROM evidence_grades WHERE evidence_id=$1 AND grade IS NOT NULL',[ev.id])
          const missing=studentCount-gRow.c
          if(missing>0)result.push({
            evidence_id:ev.id,evidence_name:ev.name,trait_type:ev.trait_type,
            class_id:cls.id,class_name:cls.name,class_color:cls.color||'#c0185a',
            period_id:period.id,period_name:period.name,period_position:period.position,
            detail1:details[0]?.value||'',detail2:details[1]?.value||'',
            missing_count:missing,total_students:studentCount
          })
        }
      }
    }
    res.json(result)
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.get('/',async(req,res)=>{
  try{
    const evs=await db.all('SELECT * FROM evidences WHERE period_id=$1 ORDER BY position',[req.query.period_id])
    const grades={}
    for(const ev of evs){
      const gs=await db.all('SELECT * FROM evidence_grades WHERE evidence_id=$1',[ev.id])
      gs.forEach(g=>{grades[`${g.evidence_id}_${g.student_id}`]=g.grade})
    }
    res.json({evidences:evs,grades})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.post('/',async(req,res)=>{
  try{
    const{period_id,trait_type}=req.body
    const cRow=await db.get('SELECT COUNT(*)::int AS c FROM evidences WHERE period_id=$1 AND trait_type=$2',[period_id,trait_type])
    const count=cRow.c
    const period=await db.get('SELECT class_id FROM periods WHERE id=$1',[period_id])
    const students=await db.all('SELECT id FROM students WHERE class_id=$1',[period.class_id])
    const name=`${trait_type} ${count+1}`
    const r=await db.run('INSERT INTO evidences(period_id,trait_type,name,position)VALUES($1,$2,$3,$4) RETURNING id',[period_id,trait_type,name,count])
    const evId=r.rows[0].id
    for(const st of students)await db.run('INSERT INTO evidence_grades(evidence_id,student_id)VALUES($1,$2) ON CONFLICT(evidence_id,student_id) DO NOTHING',[evId,st.id])
    res.json({id:evId,period_id,trait_type,name,position:count})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.post('/:id/grades',async(req,res)=>{
  try{
    for(const {student_id,grade} of req.body.grades)await db.run('INSERT INTO evidence_grades(evidence_id,student_id,grade)VALUES($1,$2,$3) ON CONFLICT(evidence_id,student_id) DO UPDATE SET grade=EXCLUDED.grade',[req.params.id,student_id,grade])
    res.json({success:true})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.delete('/:id',async(req,res)=>{
  try{await db.run('DELETE FROM evidences WHERE id=$1',[req.params.id]);res.json({success:true})}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
