#!/usr/bin/env python3
"""Latest explicit reload, cat, pickup and discovery selections; fixed gain only."""
from pathlib import Path
import json,hashlib,subprocess,re,tempfile,math
R=Path(__file__).resolve().parents[2];G=R/'src/assets/audio';roots={'latest':R/'public/audio-review/reload-search-cats','interactions':R/'public/audio-review/interactions'}
ms={k:json.loads((p/'manifest-v1.json').read_text()) for k,p in roots.items()};cs={k:{c['id']:c for g in m['groups'] for c in g['candidates']} for k,m in ms.items()}
choices={'reload-smg':('latest','NR1'),'reload-rifle':('latest','NR3'),'reload-sniper':('latest','NR2'),'hurt':('latest','PH10'),'enemy-alert-1':('latest','EA5'),'enemy-alert-2':('latest','EA6'),'enemy-alert-3':('latest','EA7'),'enemy-alert-4':('latest','EA10'),'pack':('interactions','D12-3'),'discover-3':('interactions','D3-2'),'discover-4':('interactions','D4-1'),'discover-5':('interactions','D5-2')}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def measure(p):
 out=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','apad=whole_dur=1,loudnorm=I=-30:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True)
 return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',out.stderr.decode(),re.S)[0])
tracks={};sources={};packs={}
for key,(page,cid) in choices.items():
 c=cs[page][cid];v=c['versions'][0];p=roots[page]/v['url'];assert sha(p)==v['sha256'],key
 a=measure(p);gain=min(-30-float(a['input_i']),-1-float(a['input_tp']));dest=G/(key+'.flac')
 for attempt in range(6):
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af',f'volume={gain}dB','-c:a','flac','-compression_level','8',str(dest)],check=True)
  final=measure(dest);delta=-30-float(final['input_i'])
  if abs(delta)<=.15:break
  step=min(delta,-1-float(final['input_tp']))
  if abs(step)<.01:break
  gain+=step
 assert math.isfinite(float(final['input_i'])) and abs(float(final['input_i'])+30)<=.75 and float(final['input_tp'])<=-.95,(key,final)
 tracks[key]=dict(candidate=cid,file=dest.name,sourceFile='audio-review/'+roots[page].name+'/'+v['url'],sourceHash=v['sha256'],sha256=sha(dest),duration=v['duration'],gainDb=gain,lufs=float(final['input_i']),truePeakDbfs=float(final['input_tp']),license=c['license'],parts=v['parts'])
 for part in v['parts']:
  sid=part['source'];s=ms[page]['sources'][sid];sources[page+':'+sid]=s;packs[page+':'+s['pack']]=ms[page]['sourcePacks'][s['pack']]
m=dict(version=1,date='2026-10-22 Asia/Shanghai',tracks=tracks,sources=sources,sourcePacks=packs,runtimeGains={'enemyShot':.5,'enemyReload':.75,'discovery':1.2,'hurt':.5,'enemyAlert':.65},processing='Constant gain only, no pitch/filter/compression or new layering. Base -30 LUFS; <400ms clips measured with analysis-only silence pad. Discovery runtime x1.2; hurt and warning kept quiet. Three reloads synchronize with actual weapon duration as before. Shotgun reload and all four shots unchanged.',enemyAlerts=['enemy-alert-1','enemy-alert-2','enemy-alert-3','enemy-alert-4'])
(G/'approved-feedback.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
# Supersede old picks rather than keep conflicting current metadata.
p=G/'approved-interactions.json';prior=json.loads(p.read_text())
for key in ['pack','discover-3','discover-4','discover-5']:prior['tracks'].pop(key,None)
prior['superseded']='pack/discovery and reload/cat choices now in approved-feedback.json';p.write_text(json.dumps(prior,ensure_ascii=False,indent=2)+'\n')
p=G/'sources.json';main=json.loads(p.read_text());main['approvedFeedback']={'metadata':'approved-feedback.json','tracks':tracks};main['approvedInteractions']={'metadata':'approved-interactions.json','tracks':prior['tracks']}
for key in ['reload-smg','reload-rifle','reload-sniper']:main['gunSounds'][key]=tracks[key]
p.write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n');print('Installed',len(tracks),'latest selections. Four shot files and shotgun reload unchanged.')
