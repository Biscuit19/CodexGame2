#!/usr/bin/env python3
"""Build isolated shooting auditions and copy ten complete music originals. Never installs game audio."""
from pathlib import Path
import json,argparse,hashlib,subprocess,re,shutil
import numpy as np
R=Path(__file__).resolve().parents[2];SR=44100

def sha(b):return hashlib.sha256(b).hexdigest()
def run(a,data=None):return subprocess.check_output(['ffmpeg','-v','error',*a],input=data)
def decode(p):return np.frombuffer(run(['-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-']),dtype='<f4').reshape(-1,2).copy()
def gain(a):
 peak=float(np.max(np.abs(a)));assert np.isfinite(a).all() and peak>.0001, 'Silent/invalid source';active=a[np.abs(a)>max(.00001,peak*.04)];rms=float(np.sqrt(np.mean(active*active)));return min(.065/max(rms,1e-9),.88/max(peak,1e-9))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',type=Path,required=True);args=ap.parse_args();m=json.loads((R/'scripts/assets/shots-music-sources.json').read_text());out=R/'public/audio-review/shots-music'
 for f in ['audio','originals','licenses']:(out/f).mkdir(parents=True,exist_ok=True)
 def encode(a,name,folder):
  b=run(['-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','flac','-compression_level','8','-sample_fmt','s32','-f','flac','-'],a.astype('<f4').tobytes());url=f'{folder}/{name}-{sha(b)[:10]}.flac';(out/url).write_bytes(b);return dict(url=url,sha256=sha(b),bytes=len(b),duration=round(len(a)/SR,6),peak=round(float(np.max(np.abs(a))),6))
 arrays={}
 for sid,s in m['sources'].items():
  p=args.cache/s['path'];assert sha(p.read_bytes())==s['sourceSha256'],sid
  if s.get('whole'):
   # Whole music source bytes, format, sample rate and duration are untouched.
   b=p.read_bytes();url=f'audio/{sid}-{sha(b)[:10]}{p.suffix.lower()}';(out/url).write_bytes(b)
   r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-24:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True);stats=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr.decode(),re.S)[0]);db=min(-24-float(stats['input_i']),-1-float(stats['input_tp']));s.update(url=url,sha256=sha(b),bytes=len(b),duration=s['sourceDuration'],previewGain=10**(db/20),whole=True,playbackGainDb=db)
  else:
   a=decode(p);arrays[sid]=a;safety=min(1,.97/max(float(np.max(np.abs(a))),1e-9));s.update(encode(a*safety,sid,'originals'));s['referenceSafetyGain']=safety;s['previewGain']=gain(a*safety)
 for g in m['groups']:
  assert len(g['candidates'])==10
  for c in g['candidates']:
   s=m['sources'][c['source']];c.update(author=s['author'],license=s['license'],sourceUrl=s['source'])
   if s.get('whole'):v={k:s[k] for k in ['url','sha256','bytes','duration']};v.update(id='whole',name='完整原曲 · 无截取',gain=s['previewGain'],whole=True)
   else:
    a=arrays[c['source']];blocks=np.array([np.sqrt(np.mean(a[i:i+441]**2)) for i in range(0,len(a),441)]);indices=np.flatnonzero(blocks>max(.0004,blocks.max()*.08));start=max(0,(indices[0]*441-250) if len(indices) else 0);end=min(len(a),start+round((c.get('cut') or (len(a)/SR))*SR));clip=a[start:end].copy();ramp=min(round(.004*SR),len(clip)//2)
    if ramp:clip[:ramp]*=np.linspace(0,1,ramp)[:,None];clip[-ramp:]*=np.linspace(1,0,ramp)[:,None]
    fixed=gain(clip);clip*=fixed;v=encode(clip,c['id'],'audio');v.update(id='shot',name='单次射击片段',gain=1,whole=False,start=start/SR,end=end/SR,fixedGain=fixed)
   c['versions']=[v]
 assert len({c['source'] for g in m['groups'][:2] for c in g['candidates']})==20
 m['previewOnly']=True;m['installedToGame']=(R/'src/assets/audio/approved-music.json').exists();
 if m['installedToGame']:m['installedSelections']={'SM1':'rifle shot','BG3':'music settings','BG5':'default loop music','BG6':'music settings','BG10':'music settings'}
 (out/'manifest-v1.json').write_text(json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n');used={s['url'] for s in m['sources'].values()}|{v['url'] for g in m['groups'] for c in g['candidates'] for v in c['versions']}
 for folder in ['audio','originals']:
  for p in (out/folder).iterdir():
   if p.is_file() and folder+'/'+p.name not in used:p.unlink()
 print('Built 20 distinct-author shot candidates and 10 byte-identical complete music tracks; game untouched.')
if __name__=='__main__':main()
