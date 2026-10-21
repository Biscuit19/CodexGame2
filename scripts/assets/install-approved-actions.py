#!/usr/bin/env python3
"""Install only the explicitly selected action/food audition tracks; constant gain only."""
import json,pathlib,subprocess,hashlib,re,math
R=pathlib.Path(__file__).resolve().parents[2];P=R/'public/audio-review/actions';G=R/'src/assets/audio'
m=json.loads((P/'manifest-v1.json').read_text());c={x['id']:x for g in m['groups'] for x in g['candidates']}
choices={'roll':('T4','roll'),'equip-weapon':('W4','equip'),'equip-gear':('A3','equip'),'food-fish':('S4','fish'),'food-paste':('L4','paste'),'food-ice':('L4','ice'),'food-water':('D5','water'),'food-milk':('D5','milk'),'food-can':('C1','can'),'food-fries':('F1','fries')}
def measure(p):
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-30.0:TP=-1.0:LRA=11:print_format=json','-f','null','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
 return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr.decode(),re.S)[0])
tracks={}
for key,(cid,vid) in choices.items():
 v=next(v for v in c[cid]['versions'] if v['id']==vid);src=P/v['url'];assert hashlib.sha256(src.read_bytes()).hexdigest()==v['sha256']
 a=measure(src);lufs=float(a['input_i']);tp=float(a['input_tp']);assert math.isfinite(lufs)
 gain=min(-30.0-lufs,-1-tp);dest=G/(key+'.flac')
 for attempt in range(5):
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-af',f'volume={gain}dB','-c:a','flac','-compression_level','8',str(dest)],check=True)
  final=measure(dest)
  delta=-30.0-float(final['input_i'])
  if abs(delta)<=.15:break
  correction=min(delta,-1-float(final['input_tp']))
  if abs(correction)<.01:break
  gain+=correction
 # Sub-second/short gated R128 windows can jump about 0.6 LU across a gate.
 # Keep their natural dynamics; within 0.75 LU avoids compression just to force a meter.
 assert abs(float(final['input_i'])+30.0)<=.75 and float(final['input_tp'])<=-.95,(key,final)
 tracks[key]=dict(file=dest.name,candidate=cid,version=vid,sourceFile=v['url'],auditionSha256=v['sha256'],sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),duration=v['duration'],gainDb=gain,lufs=float(final['input_i']),truePeakDbfs=float(final['input_tp']),license=c[cid]['license'],parts=v['parts'])
ids={p['source'] for t in tracks.values() for p in t['parts']}
data=dict(version=1,date='2026-10-21 Asia/Shanghai',tracks=tracks,sources={k:m['sources'][k] for k in ids},sourcePacks={k:v for k,v in m['sourcePacks'].items() if any(m['sources'][s]['pack']==k for s in ids)},foodMap={'f1':'food-fish','f2':'food-paste','c3_1':'food-ice','c1_9':'food-water','c1_1':'food-milk','f3':'food-can','c1_10':'food-fries','c4_8':'food-fries'},processing='User-selected audition versions; original per-component fixed gain matching and cut/assembly retained. Only one additional constant gain per complete asset to match current gun bank near current -28.4 LUFS gun bank at -30.0 LUFS; true-peak ceiling -1 dBTP. No new effects or time stretching.',retained='Gunshots, reloads, melee and tier-4 food unchanged.')
(G/'approved-actions.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
legacy=json.loads((G/'foley-sources.json').read_text());legacy['tracks']={k:v for k,v in legacy['tracks'].items() if k=='melee'};ids={s for t in legacy['tracks'].values() for s in t['layers']};legacy['sources']={k:v for k,v in legacy['sources'].items() if k in ids};(G/'foley-sources.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
main=json.loads((G/'sources.json').read_text());main['approvedActions']={'metadata':'approved-actions.json','tracks':tracks};main['retainedFoley']={'metadata':'foley-sources.json','tracks':legacy['tracks']};main['license']='Mixed CC0, CC BY 3.0, CC BY-SA 3.0 and FilmCow royalty-free; see credits and per-track metadata';(G/'sources.json').write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n')
for k in ['roll','equip-weapon','equip-gear']:(G/(k+'.ogg')).unlink(missing_ok=True)
print('Installed',len(tracks),'approved action/food tracks; matched -30.0 LUFS (1.6 dB below current gun bank); guns/reloads/melee unchanged')
