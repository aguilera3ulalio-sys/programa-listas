const express=require('express'),router=express.Router(),db=require('../db/database'),bcrypt=require('bcryptjs')
const nipMatches=(entered,stored)=>{if(stored==null)return false;if(typeof stored==='string'&&stored.startsWith('$2'))return bcrypt.compareSync(String(entered),stored);return String(entered)===String(stored)}
const getDetails=async id=>(await db.all('SELECT value FROM class_details WHERE class_id=$1 ORDER BY id',[id])).map(d=>d.value)
const getLinks=async id=>await db.all('SELECT id,label,url,position FROM class_links WHERE class_id=$1 ORDER BY position,id',[id])
const MAX_LINKS=2
// Only http(s) URLs are accepted. Blocks javascript:, data:, etc.
function normalizeUrl(raw){
  if(typeof raw!=='string')return null
  let u=raw.trim()
  if(!u)return null
  // If it already declares a scheme, it must be http(s). Reject javascript:, data:, file:, etc.
  const scheme=u.match(/^([a-z][a-z0-9+.-]*):/i)
  if(scheme){
    const p=scheme[1].toLowerCase()
    if(p!=='http'&&p!=='https')return null
  }else{
    u='https://'+u   // no scheme given: assume https
  }
  let parsed
  try{parsed=new URL(u)}catch{return null}
  if(parsed.protocol!=='http:'&&parsed.protocol!=='https:')return null
  if(!parsed.hostname||!parsed.hostname.includes('.'))return null  // needs a real domain
  return parsed.toString()
}

router.get('/',async(req,res)=>{
  try{
    const cls=await db.all('SELECT * FROM classes WHERE user_id=$1 ORDER BY created_at DESC',[req.query.user_id])
    const out=[];for(const c of cls)out.push({...c,details:await getDetails(c.id),links:await getLinks(c.id)})
    res.json(out)
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

router.get('/:id',async(req,res)=>{
  try{
    const c=await db.get('SELECT * FROM classes WHERE id=$1',[req.params.id])
    if(!c)return res.status(404).json({error:'Clase no encontrada'})
    res.json({...c,details:await getDetails(c.id),links:await getLinks(c.id)})
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
    res.json({...u,details:await getDetails(req.params.id),links:await getLinks(req.params.id)})
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
// --- Class links (max 2 per class) ---
// Replaces the whole set in one call; simpler and keeps ordering predictable.
router.put('/:id/links',async(req,res)=>{
  try{
    const cls=await db.get('SELECT id FROM classes WHERE id=$1',[req.params.id])
    if(!cls)return res.status(404).json({error:'Clase no encontrada'})
    const incoming=Array.isArray(req.body.links)?req.body.links:[]
    if(incoming.length>MAX_LINKS)return res.status(400).json({error:`Maximo ${MAX_LINKS} enlaces por clase`})
    const clean=[]
    for(const l of incoming){
      const label=(l.label||'').trim()
      const url=normalizeUrl(l.url)
      if(!label&&!l.url)continue                 // skip fully empty rows
      if(!label)return res.status(400).json({error:'Cada enlace necesita un nombre'})
      if(!url)return res.status(400).json({error:`La direccion de "${label}" no es valida`})
      clean.push({label:label.slice(0,40),url})
    }
    await db.run('DELETE FROM class_links WHERE class_id=$1',[req.params.id])
    for(let i=0;i<clean.length;i++)
      await db.run('INSERT INTO class_links(class_id,label,url,position)VALUES($1,$2,$3,$4)',[req.params.id,clean[i].label,clean[i].url,i])
    res.json(await getLinks(req.params.id))
  }catch(e){console.error(e);res.status(500).json({error:'Error en el servidor'})}
})

module.exports=router
