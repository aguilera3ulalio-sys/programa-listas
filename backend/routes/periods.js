const express=require('express'),router=express.Router(),db=require('../db/database')
router.get('/',async(req,res)=>{
  try{res.json(await db.all('SELECT * FROM periods WHERE class_id=$1 ORDER BY position',[req.query.class_id]))}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.post('/save',async(req,res)=>{
  try{
    const{class_id,periods}=req.body
    await db.run('DELETE FROM periods WHERE class_id=$1',[class_id])
    for(let i=0;i<periods.length;i++){const p=periods[i];await db.run('INSERT INTO periods(class_id,name,start_date,end_date,weight,model_id,position)VALUES($1,$2,$3,$4,$5,$6,$7)',[class_id,p.name,p.start_date||null,p.end_date||null,p.weight||33.33,p.model_id||null,i])}
    res.json(await db.all('SELECT * FROM periods WHERE class_id=$1 ORDER BY position',[class_id]))
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.patch('/:id',async(req,res)=>{
  try{
    const{name,weight,model_id,start_date,end_date}=req.body
    const f=[],v=[];let n=1
    if(name!==undefined){f.push(`name=$${n++}`);v.push(name)}
    if(weight!==undefined){f.push(`weight=$${n++}`);v.push(weight)}
    if(model_id!==undefined){f.push(`model_id=$${n++}`);v.push(model_id)}
    if(start_date!==undefined){f.push(`start_date=$${n++}`);v.push(start_date)}
    if(end_date!==undefined){f.push(`end_date=$${n++}`);v.push(end_date)}
    if(f.length){v.push(req.params.id);await db.run(`UPDATE periods SET ${f.join(',')} WHERE id=$${n}`,v)}
    res.json(await db.get('SELECT * FROM periods WHERE id=$1',[req.params.id]))
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.delete('/:id',async(req,res)=>{
  try{await db.run('DELETE FROM periods WHERE id=$1',[req.params.id]);res.json({success:true})}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.get('/models/list',async(req,res)=>{
  try{
    const ms=await db.all('SELECT * FROM evaluation_models WHERE class_id=$1',[req.query.class_id])
    const out=[];for(const m of ms)out.push({...m,traits:await db.all('SELECT * FROM model_traits WHERE model_id=$1',[m.id])})
    res.json(out)
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.post('/models',async(req,res)=>{
  try{
    const{class_id,name}=req.body
    const r=await db.run('INSERT INTO evaluation_models(class_id,name)VALUES($1,$2) RETURNING id',[class_id,name||'Nuevo modelo'])
    const mid=r.rows[0].id
    const traits=[['actividades',0],['tareas',0],['proyecto',0],['examen',0],['practicas',0],['asistencia',0],['trabajos',0]]
    for(const [t,w] of traits)await db.run('INSERT INTO model_traits(model_id,trait_type,weight)VALUES($1,$2,$3)',[mid,t,w])
    res.json({id:mid,class_id,name:name||'Nuevo modelo',traits:await db.all('SELECT * FROM model_traits WHERE model_id=$1',[mid])})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.put('/models/:id',async(req,res)=>{
  try{
    const{name,traits}=req.body
    if(name)await db.run('UPDATE evaluation_models SET name=$1 WHERE id=$2',[name,req.params.id])
    if(traits){for(const t of traits)await db.run('UPDATE model_traits SET weight=$1 WHERE model_id=$2 AND trait_type=$3',[t.weight,req.params.id,t.trait_type])}
    const m=await db.get('SELECT * FROM evaluation_models WHERE id=$1',[req.params.id])
    res.json({...m,traits:await db.all('SELECT * FROM model_traits WHERE model_id=$1',[req.params.id])})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
router.delete('/models/:id',async(req,res)=>{
  try{await db.run('DELETE FROM evaluation_models WHERE id=$1',[req.params.id]);res.json({success:true})}
  catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
