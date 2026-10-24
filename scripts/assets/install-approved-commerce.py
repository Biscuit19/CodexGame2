#!/usr/bin/env python3
"""Install only the user's BU3/SE1/DP1; fixed loudness gain, no redesign."""
import json,subprocess,hashlib,re
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=R/'public/audio-review/commerce';G=R/'src/assets/audio'
m=json.loads((O/'manifest-v1.json').read_text());cs={c['id']:c for g in m['groups'] for c in g['candidates']};tracks={}
for key,cid in [('buy','BU3'),('sell','SE1'),('discard','DP1')]:
 c=cs[cid];v=c['versions'][0];p=O/v['url'];assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256']
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','apad=whole_dur=1,loudnorm=I=-30:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True);a=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr.decode(),re.S)[0]);db=min(-30-float(a['input_i']),-1-float(a['input_tp']));dest=G/(key+'.flac')
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af',f'volume={db}dB','-c:a','flac',str(dest)],check=True)
 tracks[key]=dict(candidate=cid,file=dest.name,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),gainDb=db,source=c,original=m['sources'][c['source']],pack=m['sourcePacks'][m['sources'][c['source']]['pack']])
(G/'approved-commerce.json').write_text(json.dumps(dict(version=1,date='2026-10-23',tracks=tracks),ensure_ascii=False,indent=2)+'\n')
print('Installed BU3 SE1 DP1, fixed common -30 LUFS base')

p=G/"sources.json";v=json.loads(p.read_text());v["approvedCommerce"]={"metadata":"approved-commerce.json","tracks":tracks};p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n")

if (G/"approved-click.json").exists():subprocess.run(["python",str(R/"scripts/assets/install-approved-click.py")],check=True)
