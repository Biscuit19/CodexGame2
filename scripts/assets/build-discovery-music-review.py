#!/usr/bin/env python3
"""Build 20 isolated auditions from unmodified source files; playback gain only."""
from pathlib import Path
import argparse,json,hashlib,subprocess,re,shutil,math
R=Path(__file__).resolve().parents[2]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',type=Path,required=True);args=ap.parse_args();m=json.loads((R/'scripts/assets/discovery-music-sources.json').read_text());out=R/'public/audio-review/discovery-music';(out/'audio').mkdir(parents=True,exist_ok=True)
 for sid,s in m['sources'].items():
  p=args.cache/s['path'];b=p.read_bytes();sha=hashlib.sha256(b).hexdigest();assert sha==s['sourceSha256'],sid
  url=f'audio/{sid}-{sha[:10]}{p.suffix.lower()}';(out/url).write_bytes(b)
  measure=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','apad=whole_dur=1,loudnorm=I=-24:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True)
  stats=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',measure.stderr.decode(),re.S)[0]);db=min(-24-float(stats['input_i']),-1-float(stats['input_tp']));assert math.isfinite(db)
  s.update(url=url,sha256=sha,bytes=len(b),duration=s['sourceDuration'],previewGain=10**(db/20),playbackGainDb=db)
 for g in m['groups']:
  assert len(g['candidates'])==10 and len({c['author'] for c in g['candidates']})==10
  for c in g['candidates']:
   s=m['sources'][c['source']];c['versions']=[dict(id='whole' if s['whole'] else 'natural',name='完整原曲' if s['whole'] else '完整发现原声',url=s['url'],sha256=s['sha256'],duration=s['duration'],bytes=s['bytes'],gain=s['previewGain'],whole=s['whole'])]
 m['installedToGame']=(R/'src/assets/audio/approved-raid-audio.json').exists()
 if m['installedToGame']:m['installedSelections']={k:'battle music settings' for k in ['NB2','NB3','NB5','NB6','NB10']}
 (out/'manifest-v1.json').write_text(json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
 used={s['url'] for s in m['sources'].values()}
 for p in (out/'audio').iterdir():
  if 'audio/'+p.name not in used:p.unlink()
 print('Built 10 discovery sounds + 10 complete BGM; all original bytes unmodified; no game changes.')
if __name__=='__main__':main()
