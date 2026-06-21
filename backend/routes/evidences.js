const express=require('express'),router=express.Router(),db=require('../db/database')

// MUST be before /:id
router.get('/pending',(req,res)=>{
  const classes=db.prepare('SELECT * FROM classes WHERE user_id=?').all(req.query.user_id)
  const result=[]
  classes.forEach(cls=>{
    const details=db.prepare('SELECT value FROM class_details WHERE class_id=? ORDER BY id LIMIT 2').all(cls.id)
    const periods=db.prepare('SELECT * FROM periods WHERE class_id=? ORDER BY position').all(cls.id)
    const studentCount=db.prepare('SELECT COUNT(*) as c FROM students WHERE class_id=?').get(cls.id).c
    if(studentCount===0)return
    periods.forEach(period=>{
      const evidences=db.prepare('SELECT * FROM evidences WHERE period_id=? ORDER BY position').all(period.id)
      evidences.forEach(ev=>{
        const graded=db.prepare('SELECT COUNT(*) as c FROM evidence_grades WHERE evidence_id=? AND grade IS NOT NULL').get(ev.id).c
        const missing=studentCount-graded
        if(missing>0)result.push({
          evidence_id:ev.id,evidence_name:ev.name,trait_type:ev.trait_type,
          class_id:cls.id,class_name:cls.name,class_color:cls.color||'#c0185a',
          period_id:period.id,period_name:period.name,period_position:period.position,
          detail1:details[0]?.value||'',detail2:details[1]?.value||'',
          missing_count:missing,total_students:studentCount
        })
      })
    })
  })
  res.json(result)
})

router.get('/',(req,res)=>{
  const evs=db.prepare('SELECT * FROM evidences WHERE period_id=? ORDER BY position').all(req.query.period_id)
  const grades={}
  evs.forEach(ev=>db.prepare('SELECT * FROM evidence_grades WHERE evidence_id=?').all(ev.id).forEach(g=>{grades[`${g.evidence_id}_${g.student_id}`]=g.grade}))
  res.json({evidences:evs,grades})
})

router.post('/',(req,res)=>{
  const{period_id,trait_type}=req.body
  const count=db.prepare('SELECT COUNT(*) as c FROM evidences WHERE period_id=? AND trait_type=?').get(period_id,trait_type).c
  const period=db.prepare('SELECT class_id FROM periods WHERE id=?').get(period_id)
  const students=db.prepare('SELECT id FROM students WHERE class_id=?').all(period.class_id)
  const r=db.prepare('INSERT INTO evidences(period_id,trait_type,name,position)VALUES(?,?,?,?)').run(period_id,trait_type,`${trait_type} ${count+1}`,count)
  const s=db.prepare('INSERT OR IGNORE INTO evidence_grades(evidence_id,student_id)VALUES(?,?)')
  students.forEach(st=>s.run(r.lastInsertRowid,st.id))
  res.json({id:r.lastInsertRowid,period_id,trait_type,name:`${trait_type} ${count+1}`,position:count})
})

router.post('/:id/grades',(req,res)=>{
  const s=db.prepare('INSERT OR REPLACE INTO evidence_grades(evidence_id,student_id,grade)VALUES(?,?,?)')
  req.body.grades.forEach(({student_id,grade})=>s.run(req.params.id,student_id,grade))
  res.json({success:true})
})

router.delete('/:id',(req,res)=>{
  db.prepare('DELETE FROM evidences WHERE id=?').run(req.params.id)
  res.json({success:true})
})

module.exports=router
