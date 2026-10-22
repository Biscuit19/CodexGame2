#!/usr/bin/env python3
"""Forty purchase/sell/discard/click auditions. No new sound design or game install."""
from pathlib import Path
import argparse,json,hashlib,subprocess,re
import numpy as np
R=Path(__file__).resolve().parents[2];SR=44100
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',type=Path,required=True);args=ap.parse_args();m=json.loads((R/'scripts/assets/commerce-audio-sources.json').read_text());out=R/'public/audio-review/commerce'
 for name in ['audio','originals','licenses']:(out/name).mkdir(parents=True,exist_ok=True)
 def encode(a,name,folder):
  b=subprocess.check_output(['ffmpeg','-v','error','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','flac','-compression_level','8','-sample_fmt','s32','-f','flac','-'],input=a.astype('<f4').tobytes());sha=hashlib.sha256(b).hexdigest();url=f'{folder}/{name}-{sha[:10]}.flac';(out/url).write_bytes(b);return dict(url=url,sha256=sha,bytes=len(b),duration=len(a)/SR)
 for g in m['groups']:
  assert len(g['candidates'])==10 and len({c['author'] for c in g['candidates']})==10
  for c in g['candidates']:
   s=m['sources'][c['source']];p=args.cache/s['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==s['sourceSha256'];a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-']),'<f4').reshape(-1,2).copy();peak=float(np.max(abs(a)));assert peak>.0001 and np.isfinite(a).all();safety=min(1,.96/peak)
   s.update(encode(a*safety,c['id'],'originals'));s['referenceSafetyGain']=safety
   if c.get('cut'):start,length=c['cut'];start=round(start*SR);end=min(len(a),start+round(length*SR))
   else:
    # Cut only excess leading/trailing silence, retain at least 250ms after detected tail.
    win=441;env=np.array([np.sqrt(np.mean(a[i:i+win]**2)) for i in range(0,len(a),win)]);idx=np.flatnonzero(env>max(.0001,float(env.max())*.005));start=max(0,int(idx[0])*win-250);end=min(len(a),int(idx[-1]+1)*win+round(.25*SR))
   clip=a[start:end].copy();assert len(clip)>50
   measure=subprocess.run(['ffmpeg','-hide_banner','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-af','apad=whole_dur=1,loudnorm=I=-26:TP=-1:LRA=11:print_format=json','-f','null','-'],input=clip.astype('<f4').tobytes(),capture_output=True,check=True);stats=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',measure.stderr.decode(),re.S)[0]);gain=10**(min(-26-float(stats['input_i']),-1-float(stats['input_tp']))/20);clip*=gain
   ramp=min(round(.003*SR),len(clip)//2);clip[:ramp]*=np.linspace(0,1,ramp)[:,None];clip[-ramp:]*=np.linspace(1,0,ramp)[:,None]
   v=encode(clip,c['id'],'audio');v.update(id='natural',name='原速动作',gain=1,whole=False,start=start/SR,end=end/SR,fixedGain=gain,peak=float(np.max(abs(clip))))
   c['versions']=[v];s['previewGain']=min(gain/safety,.89/(peak*safety))
 m['processing']='40 authored recordings; fixed gain, documented excerpts or silence trims only, 3ms cut-edge ramps; no pitch/EQ/compression/new layers. Full original recordings retained with fixed clipping-safety gain.'
 (out/'manifest-v1.json').write_text(json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
 used={s['url'] for s in m['sources'].values()}|{c['versions'][0]['url'] for g in m['groups'] for c in g['candidates']}
 for folder in ['audio','originals']:
  for p in (out/folder).iterdir():
   if folder+'/'+p.name not in used:p.unlink()
 print('Built40 candidates,10 different authors per group; game unmodified.')
if __name__=='__main__':main()
