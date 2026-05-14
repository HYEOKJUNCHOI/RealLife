const targets = await fetch('http://127.0.0.1:9222/json').then(r=>r.json());
const page = targets.find(t=>t.type==='page') ?? targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id=0;
const pending=new Map();
ws.onmessage=(ev)=>{const msg=JSON.parse(ev.data); if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg); pending.delete(msg.id);}};
await new Promise(res=>ws.onopen=res);
const send=(method,params={})=>new Promise(resolve=>{const mid=++id; pending.set(mid,resolve); ws.send(JSON.stringify({id:mid,method,params}));});
await send('Page.enable');
await send('Runtime.enable');
const cmd = process.argv[2];
if(cmd==='nav'){
  await send('Page.navigate',{url:process.argv[3]});
  await new Promise(r=>setTimeout(r,3000));
  console.log('navigated');
}
if(cmd==='shot'){
  await send('Page.bringToFront');
  const res=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const fs=await import('node:fs');
  fs.writeFileSync(process.argv[3]||'cdp-shot.png', Buffer.from(res.result.data,'base64'));
  console.log(process.argv[3]||'cdp-shot.png');
}
if(cmd==='eval'){
  const expr=process.argv.slice(3).join(' ');
  const res=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  console.log(JSON.stringify(res.result.result?.value ?? res.result.exceptionDetails ?? res,null,2));
}
ws.close();
