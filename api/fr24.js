export default async function handler(req,res){
 const token=process.env.FR24_API_TOKEN;if(!token)return res.status(503).json({error:'FR24_API_TOKEN non configuré'});
 const airport=String(req.query.airport||'').toUpperCase();
 try{const r=await fetch(`https://fr24api.flightradar24.com/api/live/flight-positions/full?airports=${encodeURIComponent('both:'+airport)}&limit=100`,{headers:{Accept:'application/json','Accept-Version':'v1',Authorization:`Bearer ${token}`}});const text=await r.text();res.status(r.status).setHeader('Content-Type','application/json').send(text);}catch(e){res.status(502).json({error:'FR24 indisponible'});}
}
