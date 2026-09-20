export default function handler(req,res){
 const i={
  schedules:{configured:!!(process.env.AIRLABS_API_KEY||process.env.GACS_SCHEDULE_API_URL),clientConfigurable:true,detail:'AirLabs key locale OU provider serveur'},
  fr24:{configured:!!process.env.FR24_API_TOKEN,clientConfigurable:true,optional:true,detail:'Optionnel · validation/tracking'},
  navigraph:{configured:!!(process.env.NAVIGRAPH_CLIENT_ID&&process.env.NAVIGRAPH_CLIENT_SECRET),clientConfigurable:false,detail:'Credentials développeur + OAuth/OIDC requis'},
  simbrief:{configured:true,detail:'Latest OFP fetch actif'},
  sayintentions:{configured:!!process.env.SAYINTENTIONS_API_KEY,localTest:true,detail:'flightJSON local testable sur PC'},
  msfs:{configured:false,bridgeRequired:true,detail:'Windows SimConnect bridge requis'}
 };
 res.status(200).json({ok:true,integrations:i,serverTime:new Date().toISOString()});
}
