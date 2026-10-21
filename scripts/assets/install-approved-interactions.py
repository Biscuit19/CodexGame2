#!/usr/bin/env python3
"""Install the user's Oct 22 selections, including explicitly cross-category picks.
Only fixed gain/cuts and the two explicitly requested speed changes. No new sounds.
"""
import pathlib,json,hashlib,subprocess,re,tempfile,math
R=pathlib.Path(__file__).resolve().parents[2];P=R/'public/audio-review/interactions';A=R/'public/audio-review/actions';G=R/'src/assets/audio'
im=json.loads((P/'manifest-v1.json').read_text());am=json.loads((A/'manifest-v1.json').read_text());c={c['id']:c for g in im['groups'] for c in g['candidates']}
choices={'melee-first':'KN1','melee-second':'KN2','switch-melee':'KN3','open-box':'BX1','open-toolbox':'TB2','open-cooler':'TB1','open-trashcan':'GB1','open-basket':'NW5','open-litter':'LT4','open-cabinet':'CB5','open-medical':'MD2','open-weapon':'WX4','open-bed':'BD1','open-safe':'SF5','open-corpse':'BL2','discover-3':'D12-1','discover-4':'D4-3','discover-5':'D5-3','pack':'PK4'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def measure(p):
 q=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','apad=whole_dur=1,loudnorm=I=-30:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True)
 return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',q.stderr.decode(),re.S)[0])
tracks={};sources={};packs={}
with tempfile.TemporaryDirectory(prefix='tricat-selected-') as tmp:
 def install(key,src,meta,filters='',duration=None):
  assert sha(src)==meta['sourceHash'],key
  base=pathlib.Path(tmp)/(key+'.flac')
  cmd=['ffmpeg','-v','error','-y','-i',str(src),'-ar','44100','-ac','2']
  if filters:cmd+=['-af',filters]
  subprocess.run(cmd+['-c:a','flac','-compression_level','8',str(base)],check=True)
  measured=measure(base);gain=min(-30-float(measured['input_i']),-1-float(measured['input_tp']));dest=G/(key+'.flac')
  for attempt in range(6):
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(base),'-af',f'volume={gain}dB','-c:a','flac','-compression_level','8',str(dest)],check=True)
   final=measure(dest);delta=-30-float(final['input_i'])
   if abs(delta)<=.15:break
   change=min(delta,-1-float(final['input_tp']))
   if abs(change)<.01:break
   gain+=change
  assert math.isfinite(float(final['input_i'])) and abs(float(final['input_i'])+30)<=.75 and float(final['input_tp'])<=-.95,(key,final)
  seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest)]))
  tracks[key]=dict(**meta,file=dest.name,sha256=sha(dest),duration=seconds,gainDb=gain,lufs=float(final['input_i']),truePeakDbfs=float(final['input_tp']),filters=filters)
 for key,cid in choices.items():
  candidate=c[cid];v=candidate['versions'][0];speed=v['duration']/.3 if key=='switch-melee' else 1
  filters=f'asetrate=44100*{speed:.10f},aresample=44100,apad=whole_dur=0.3,atrim=duration=0.3' if key=='switch-melee' else ''
  install(key,P/v['url'],dict(candidate=cid,sourceFile='audio-review/interactions/'+v['url'],sourceHash=v['sha256'],license=candidate['license'],parts=v['parts']),filters)
  for p in v['parts']:
   sid=p['source'];sources['interactions:'+sid]=im['sources'][sid];pk=im['sources'][sid]['pack'];packs[pk]=im['sourcePacks'][pk]
 for key,sid,filters in [('food-fries','sb-chips','atrim=start=0:end=1.8,asetpts=PTS-STARTPTS'),('food-tier4','bsb-0352',f'asetrate=44100*{am["sources"]["bsb-0352"]["duration"]/3:.10f},aresample=44100,apad=whole_dur=3,atrim=duration=3')]:
  s=am['sources'][sid];install(key,A/s['url'],dict(candidate=s['name'],sourceFile='audio-review/actions/'+s['url'],sourceHash=s['sha256'],license=s['license'],parts=[dict(source=sid,label=s['name'])]),filters)
  sources['actions:'+sid]=s;packs[s['pack']]=am['sourcePacks'][s['pack']]
meta=dict(version=1,date='2026-10-22 Asia/Shanghai',tracks=tracks,sources=sources,sourcePacks=packs,foodMap={'c1_10':'food-fries','c4_8':'food-fries','f4':'food-tier4','c4_11':'food-tier4'},containerMap={k.removeprefix('open-'):k for k in choices if k.startswith('open-')},processing='Fixed gain to -30 LUFS (within 0.75 LU on short gated clips), true peak <= -1 dBTP; no compression, EQ or new layering. KN3 speeds to 0.3 s, full mouth-noises-1 speeds to 3 s as requested. Eating Chips cut to current 1.8 s food action, no wrapper. KN1/KN2 separate alternating swings. Rarity 1/2 and guns/reloads unchanged.',retained='T4/W4/A3/S4/L4/D5/C1 and all eight shot/reload files byte-identical; new reload/search/cat candidates not installed.')
(G/'approved-interactions.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
actions=json.loads((G/'approved-actions.json').read_text());actions['tracks'].pop('food-fries',None);actions['foodMap'].pop('c1_10',None);actions['foodMap'].pop('c4_8',None);actions['superseded']='food-fries replaced by Eating Chips in approved-interactions.json; tier-4 food now also selected';(G/'approved-actions.json').write_text(json.dumps(actions,ensure_ascii=False,indent=2)+'\n')
legacy=json.loads((G/'foley-sources.json').read_text());legacy['tracks']={};legacy['sources']={};legacy['superseded']='Legacy melee replaced by separately selected KN1/KN2 in approved-interactions.json';(G/'foley-sources.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n');(G/'melee.ogg').unlink(missing_ok=True)
main=json.loads((G/'sources.json').read_text());main['approvedActions']={'metadata':'approved-actions.json','tracks':actions['tracks']};main['approvedInteractions']={'metadata':'approved-interactions.json','tracks':tracks};main['retainedFoley']={'metadata':'foley-sources.json','tracks':{}};(G/'sources.json').write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n')
print('Installed',len(tracks),'explicitly selected tracks, matched -30 LUFS. Gunshots/reloads unchanged.')
