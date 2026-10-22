#!/usr/bin/env python3
"""Install explicit SM1 rifle, D3-4 reveal and four complete BGM selections."""
from pathlib import Path
import json,subprocess,re,hashlib,shutil
R=Path(__file__).resolve().parents[2];G=R/'src/assets/audio'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
roots={'shots-music':R/'public/audio-review/shots-music','interactions':R/'public/audio-review/interactions'}
ms={k:json.loads((p/'manifest-v1.json').read_text()) for k,p in roots.items()}
cs={k:{c['id']:c for g in m['groups'] for c in g['candidates']} for k,m in ms.items()}
tracks={};sources={};packs={}
for key,page,cid in [('shot-rifle','shots-music','SM1'),('discover-4','interactions','D3-4')]:
 c=cs[page][cid];v=c['versions'][0];p=roots[page]/v['url'];assert sha(p)==v['sha256'];dest=G/(key+'.flac')
 def measure(p):
  out=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','apad=whole_dur=1,loudnorm=I=-30:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True)
  return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',out.stderr.decode(),re.S)[0])
 a=measure(p);gain=min(-30-float(a['input_i']),-1-float(a['input_tp']))
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af',f'volume={gain}dB','-c:a','flac','-compression_level','8',str(dest)],check=True)
 tracks[key]=dict(candidate=cid,file=dest.name,sha256=sha(dest),sourceFile=str(p.relative_to(R/'public')),sourceHash=sha(p),gainDb=gain,duration=v['duration'],license=c['license'],author=c.get('author') or ' / '.join(ms[page]['sources'][x['source']]['author'] for x in v.get('parts',[])),sourceUrl=c.get('sourceUrl') or ms[page]['sources'][v['parts'][0]['source']]['source'],parts=v.get('parts'))
 sids=[x['source'] for x in v.get('parts',[])] if 'parts' in v else [c['source']]
 for sid in sids:
  s=ms[page]['sources'][sid];sources[page+':'+sid]=s;packs[page+':'+s['pack']]=ms[page]['sourcePacks'][s['pack']]
for cid in ['BG3','BG5','BG6','BG10']:
 c=cs['shots-music'][cid];v=c['versions'][0];p=roots['shots-music']/v['url'];assert sha(p)==v['sha256'];s=ms['shots-music']['sources'][c['source']]
 dest=G/('music-'+cid.lower()+p.suffix);shutil.copyfile(p,dest);assert sha(dest)==s['sourceSha256']
 tracks[cid]=dict(candidate=cid,file=dest.name,sha256=sha(dest),sourceHash=s['sourceSha256'],duration=v['duration'],playbackGain=v['gain'],license=c['license'],author=c['author'],sourceUrl=c['sourceUrl'],name=c['name'])
 sources['shots-music:'+c['source']]=s;packs['shots-music:'+s['pack']]=ms['shots-music']['sourcePacks'][s['pack']]
m=dict(version=1,date='2026-10-22 Asia/Shanghai',tracks=tracks,sources=sources,sourcePacks=packs,processing='SM1 rifle and D3-4 constant gain only; complete BGM original bytes unchanged, playback gain only. Overall master x1.3, gunshots x0.7, discovery still x1.2, enemy shots still x0.5 of player. Defaults BG5 loop.')
(G/'approved-music.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
p=G/'sources.json';s=json.loads(p.read_text());s['approvedMusic']={'metadata':'approved-music.json','tracks':tracks};s['gunSounds']['shot-rifle']=tracks['shot-rifle'];p.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
print('Installed rifle SM1, D3-4 and four complete original music tracks.')

# Remove superseded current choice from earlier metadata, while preserving history in docs.
p=G/'approved-feedback.json';prior=json.loads(p.read_text());prior['tracks'].pop('discover-4',None);prior['supersededDiscovery4']='D3-4 now in approved-music.json';p.write_text(json.dumps(prior,ensure_ascii=False,indent=2)+'\n')
p=G/'sources.json';main=json.loads(p.read_text());main['approvedFeedback']={'metadata':'approved-feedback.json','tracks':prior['tracks']};p.write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n')

if (G/"approved-raid-audio.json").exists():
 subprocess.run(["python",str(R/"scripts/assets/install-approved-raid-audio.py")],check=True)
