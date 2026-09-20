export default function handler(req,res){
 const i={
  fr24:{configured:!!process.env.FR24_API_TOKEN,detail:'Flightradar24 API token'},
  schedules:{configured:!!process.env.GACS_SCHEDULE_API_URL,detail:'Future departure schedule provider'},
  navigraph:{configured:!!(process.env.NAVIGRAPH_CLIENT_ID&&process.env.NAVIGRAPH_CLIENT_SECRET),detail:'OAuth/OIDC credentials'},
  simbrief:{configured:true,detail:'Latest OFP fetch available; generation key optional'},
  sayintentions:{configured:!!process.env.SAYINTENTIONS_API_KEY,detail:'SAPI key; local flight.json requires PC bridge'},
  msfs:{configured:false,detail:'Requires Windows SimConnect bridge'}
 };
 res.status(200).json({ok:true,liveReady:i.fr24.configured&&i.schedules.configured,integrations:i,serverTime:new Date().toISOString()});
}
