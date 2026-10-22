// Re-render the original base score from 2ed2bb4:src/audio.ts, including its
// original oscillator types, 320ms steps and envelopes. No new composition.
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
const out=process.argv[2] || '/tmp/original-game-score';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/google-chrome',args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const files=await page.evaluate(async()=>{
  const rate=44100,period=192*.32;
  const encode=(a)=>{
   const b=new Uint8Array(44+a.length*2),v=new DataView(b.buffer);
   const str=(at,s)=>{for(let i=0;i<s.length;i++)b[at+i]=s.charCodeAt(i);};
   str(0,'RIFF');v.setUint32(4,b.length-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,a.length*2,true);
   for(let i=0;i<a.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,a[i]))*32767),true);
   let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);
  };
  const note=(ctx,f,dur,type,vol,now)=>{
   const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,now);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(vol,now+.008);g.gain.exponentialRampToValueAtTime(.001,now+dur);o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+dur+.01);
  };
  // Three exact score periods; extract the middle period to retain crossing tails.
  const ctx=new OfflineAudioContext(1,Math.round(period*3*rate),rate);
  for(let n=0;n<192*3;n++){
   const now=n*.32,root=[130.81,110,146.83,98][Math.floor(n/16)%4];
   if(n%8===0)[1,1.25,1.5,2].forEach((x,i)=>note(ctx,root*x,2.8,'sine',.13,now+i*.04));
   if(n%4===0)note(ctx,root/2,.75,'triangle',.16,now);
   const motif=[2,0,2.5,3,0,2.25,2,1.5,0,2.5,3,3.75,0,3,2.5,2];const m=motif[(n+(Math.floor(n/64)%3)*3)%16];if(m)note(ctx,root*m,.55,'sine',.13,now);
  }
  const b=await ctx.startRendering();const result={original:encode(b.getChannelData(0).slice(Math.round(period*rate),Math.round(2*period*rate)))};
  for(const [key,f]of[['discover-1',420],['discover-2',560]]){
   const c=new OfflineAudioContext(1,Math.round(.13*rate),rate);note(c,f,.12,'sine',.12,0);const a=await c.startRendering();result[key]=encode(a.getChannelData(0));
  }
  return result;
 });
 for(const [key,b64]of Object.entries(files))writeFileSync(`${out}/${key}.wav`,Buffer.from(b64,'base64'));
 console.log('Rendered original 61.44s base score and two original discovery tones.');
}finally{await browser.close();}
