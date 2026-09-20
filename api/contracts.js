const FLEET=new Set(['A388','A359','A35K','A339','A343','B772','B77W','B78X','A20N','A21N','B738','B739','CRJ9','C25C']);
const IATA={RJAA:'NRT',RJTT:'HND',OMDB:'DXB',OTHH:'DOH',OMAA:'AUH',WSSS:'SIN',WMKK:'KUL',VTBS:'BKK',VHHH:'HKG',LFPG:'CDG',EGLL:'LHR',LSZH:'ZRH',LEBL:'BCN',LFRS:'NTE',LFMN:'NCE',YSSY:'SYD'};
function normAirLabs(f){return {flight:f.flight_iata||f.flight_icao||f.flight_number||'—',airline:f.airline_iata||f.airline_icao||'',originIata:f.dep_iata||'',originIcao:f.dep_icao||'',destinationIata:f.arr_iata||'',destinationIcao:f.arr_icao||'',stdLocal:f.dep_time||f.dep_estimated||'',stdUtc:f.dep_time_utc||f.dep_estimated_utc||'',stdTs:Number(f.dep_time_ts||f.dep_estimated_ts||0)*1000,aircraftIcao:String(f.aircraft_icao||'').toUpperCase(),registration:f.reg_number||'',depTerminal:f.dep_terminal||'',depGate:f.dep_gate||'',arrTerminal:f.arr_terminal||'',arrGate:f.arr_gate||'',durationMin:f.duration||null,status:f.status||'scheduled',dataStatus:'LIVE',source:'AirLabs Schedules'} }
export default async function handler(req,res){
 const origin=String(req.query.origin||'').toUpperCase();if(!/^[A-Z0-9]{4}$/.test(origin))return res.status(400).json({error:'Origin ICAO invalide'});
 const airKey=req.headers['x-gacs-airlabs-key']||process.env.AIRLABS_API_KEY||'';
 const generic=process.env.GACS_SCHEDULE_API_URL, genericToken=process.env.GACS_SCHEDULE_API_TOKEN;
 const cutoff=Date.now()+150*60000;
 try{
  let rows=[],provider='';
  if(airKey){const iata=IATA[origin]||'';const u=new URL('https://airlabs.co/api/v9/schedules');u.searchParams.set(iata?'dep_iata':'dep_icao',iata||origin);u.searchParams.set('api_key',airKey);u.searchParams.set('limit','100');const r=await fetch(u);const data=await r.json();if(!r.ok||data.error)throw new Error(data.error?.message||data.error?.code||('AirLabs HTTP '+r.status));rows=(data.response||[]).map(normAirLabs);provider='AirLabs Schedules';}
  else if(generic){const u=new URL(generic);u.searchParams.set('origin',origin);u.searchParams.set('from',new Date(cutoff).toISOString());u.searchParams.set('hours','24');const r=await fetch(u,{headers:genericToken?{Authorization:`Bearer ${genericToken}`}:{}});if(!r.ok)throw new Error('Schedule provider HTTP '+r.status);const data=await r.json();rows=Array.isArray(data)?data:(data.flights||[]);provider='Configured schedule provider';}
  else return res.status(200).json({setupRequired:true,contracts:[],message:'Ajoute une clé AirLabs dans LIVE Integrations (clé gratuite disponible) pour alimenter immédiatement le Contract Board.'});
  const contracts=rows.filter(f=>{const t=f.stdTs||Date.parse(f.stdUtc||f.scheduledDeparture||f.stdLocal);const ac=String(f.aircraftIcao||f.type||'').toUpperCase();return Number.isFinite(t)&&t>=cutoff&&FLEET.has(ac)&&!['cancelled','landed'].includes(String(f.status||'').toLowerCase())}).sort((a,b)=>(a.stdTs||Date.parse(a.stdUtc))-(b.stdTs||Date.parse(b.stdUtc))).slice(0,30);
  res.json({origin,provider,cutoff:new Date(cutoff).toISOString(),contracts,message:contracts.length?'':'La source LIVE répond, mais aucun départ dans sa fenêtre ne respecte à la fois +2h30 et ta flotte exacte.'});
 }catch(e){res.status(502).json({error:e.message});}
}
