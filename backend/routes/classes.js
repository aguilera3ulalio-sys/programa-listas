const express=require('express'),router=express.Router(),db=require('../db/database'),bcrypt=require('bcryptjs')
const nipMatches=(entered,stored)=>{if(stored==null)return false;if(typeof stored==='string'&&stored.startsWith('$2'))return bcrypt.compareSync(String(entered),stored);return String(entered)===String(stored)}
const getDetails=async id=>(await db.all('SELECT value FROM class_details WHERE class_id=$1 ORDER BY id',[id])).map(d=>d.value)

router.get('/',async(req,res)=>{
  try{
    const cls=await db.all('SELECT * FROM classes WHERE user_id=$1 ORDER BY created_at DESC',[req.query.user_id])
    const out=[];for(const c of cls)out.push({...c,details:await getDetails(c.id)})
    res.json(out)
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.get('/:id',async(req,res)=>{
  try{
    const c=await db.get('SELECT * FROM classes WHERE id=$1',[req.params.id])
    if(!c)return res.status(404).json({error:'Clase no encontrada'})
    res.json({...c,details:await getDetails(c.id)})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.post('/',async(req,res)=>{
  try{
    const{user_id,name,details}=req.body
    if(!user_id||!name)return res.status(400).json({error:'user_id y name requeridos'})
    const r=await db.run('INSERT INTO classes(user_id,name)VALUES($1,$2) RETURNING id',[user_id,name])
    const cid=r.rows[0].id
    if(details&&Array.isArray(details)){
      for(const d of details){
        if(typeof d==='string')await db.run('INSERT INTO class_details(class_id,label,value)VALUES($1,$2,$3)',[cid,d,d])
        else await db.run('INSERT INTO class_details(class_id,label,value)VALUES($1,$2,$3)',[cid,d.label||d.value,d.value||d.label])
      }
    }
    const parciales=['Primer parcial','Segundo parcial','Tercer parcial']
    for(let i=0;i<parciales.length;i++)await db.run('INSERT INTO periods(class_id,name,weight,position)VALUES($1,$2,$3,$4)',[cid,parciales[i],33.33,i])
    const mr=await db.run('INSERT INTO evaluation_models(class_id,name)VALUES($1,$2) RETURNING id',[cid,'Modelo predeterminado'])
    const mid=mr.rows[0].id
    const traits=[['actividades',15],['tareas',15],['proyecto',30],['examen',40],['practicas',0],['asistencia',0],['trabajos',0]]
    for(const [t,w] of traits)await db.run('INSERT INTO model_traits(model_id,trait_type,weight)VALUES($1,$2,$3)',[mid,t,w])
    res.json({id:cid,user_id,name,color:'#c0185a',details:await getDetails(cid)})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.patch('/:id',async(req,res)=>{
  try{
    const{color,name,highlight_field1,highlight_field2,highlight_field3}=req.body
    const f=[],v=[];let n=1
    if(color!==undefined){f.push(`color=$${n++}`);v.push(color)}
    if(name!==undefined){f.push(`name=$${n++}`);v.push(name)}
    if(highlight_field1!==undefined){f.push(`highlight_field1=$${n++}`);v.push(highlight_field1)}
    if(highlight_field2!==undefined){f.push(`highlight_field2=$${n++}`);v.push(highlight_field2)}
    if(highlight_field3!==undefined){f.push(`highlight_field3=$${n++}`);v.push(highlight_field3)}
    if(f.length){v.push(req.params.id);await db.run(`UPDATE classes SET ${f.join(',')} WHERE id=$${n}`,v)}
    const u=await db.get('SELECT * FROM classes WHERE id=$1',[req.params.id])
    res.json({...u,details:await getDetails(req.params.id)})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.delete('/:id',async(req,res)=>{
  try{
    const{user_id,nip}=req.body
    const u=await db.get('SELECT nip FROM users WHERE id=$1',[user_id])
    if(!u||!nipMatches(nip,u.nip))return res.status(403).json({error:'NIP incorrecto'})
    await db.run('DELETE FROM classes WHERE id=$1 AND user_id=$2',[req.params.id,user_id])
    res.json({success:true})
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})
module.exports=router
