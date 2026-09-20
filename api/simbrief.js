export default async function handler(req,res){
 const user=String(req.query.user||'').trim(); if(!user) return res.status(400).json({error:'Pilot ID/Alias requis'});
 const q=/^\d+$/.test(user)?`userid=${encodeURIComponent(user)}`:`username=${encodeURIComponent(user)}`;
 try{const r=await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${q}&json=1`);if(!r.ok)return res.status(r.status).json({error:'SimBrief a refusé la requête'});const j=await r.json();res.setHeader('Cache-Control','no-store');res.json(j);}catch(e){res.status(502).json({error:'SimBrief indisponible'});}
}
