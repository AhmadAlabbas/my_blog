import {createApp} from './app.mjs';
const {app,db}=await createApp();
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const server=app.listen(port,'0.0.0.0',()=>console.log(`Node blog listening on port ${port}`));
async function stop(){server.close(async()=>{await db.close();process.exit(0);});}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
