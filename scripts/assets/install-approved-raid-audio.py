#!/usr/bin/env python3
"""Latest explicit discovery, unlock and music choices. No new composition/effect design."""
from pathlib import Path
import argparse,json,subprocess,hashlib,re,shutil,math
R=Path(__file__).resolve().parents[2];G=R/'src/assets/audio'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def measure(p,target=-30):
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af',f'apad=whole_dur=1,loudnorm=I={target}:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True)
 return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr.decode(),re.S)[0])
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--original',type=Path,default=R/'src/assets/audio/original-score');args=ap.parse_args()
 roots={'interactions':R/'public/audio-review/interactions','discovery-music':R/'public/audio-review/discovery-music'}
 ms={k:json.loads((p/'manifest-v1.json').read_text()) for k,p in roots.items()};cs={k:{c['id']:c for g in m['groups'] for c in g['candidates']} for k,m in ms.items()}
 tracks={};sources={};packs={}
 for key,cid in [('discover-3','D12-1'),('discover-4','D3-2'),('discover-5','D5-4'),('unlock-4','D4-1'),('unlock-5','D5-2')]:
  c=cs['interactions'][cid];v=c['versions'][0];p=roots['interactions']/v['url'];assert sha(p)==v['sha256'];dest=G/(key+'.flac');a=measure(p);gain=min(-30-float(a['input_i']),-1-float(a['input_tp']))
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af',f'volume={gain}dB','-c:a','flac','-compression_level','8',str(dest)],check=True)
  final=measure(dest);tracks[key]=dict(candidate=cid,file=dest.name,sha256=sha(dest),sourceFile=str(p.relative_to(R/'public')),sourceHash=sha(p),gainDb=gain,lufs=float(final['input_i']),duration=v['duration'],license=c['license'],parts=v['parts'])
  for part in v['parts']:
   s=ms['interactions']['sources'][part['source']];sources['interactions:'+part['source']]=s;packs['interactions:'+s['pack']]=ms['interactions']['sourcePacks'][s['pack']]
 # Preserve the original score/tone masters; generated directly from the old WebAudio score.
 orig=G/'original-score';orig.mkdir(exist_ok=True)
 for key in ['original','discover-1','discover-2']:
  source=args.original/(key+'.wav');p=orig/(key+'.wav')
  if source.resolve()!=p.resolve():shutil.copyfile(source,p)
  assert p.exists(), 'Run render-original-music.mjs first'
  a=measure(p,-24 if key=='original' else -30)
  if key=='original':
   dest=G/'music-original.flac';subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-c:a','flac','-compression_level','8',str(dest)],check=True)
   tracks['ORIGINAL']=dict(file=dest.name,sha256=sha(dest),sourceHash=sha(p),name='暖窝基地 · 原始配乐',duration=61.44,license='Project-original',author='三角猫行动原始配乐',sourceUrl='https://github.com/Biscuit19/CodexGame2/blob/2ed2bb4/src/audio.ts',inputLufs=float(a['input_i']),inputPeak=float(a['input_tp']))
  else:
   dest=G/(key+'.flac');gain=min(-30-float(a['input_i']),-1-float(a['input_tp']));subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-af',f'volume={gain}dB','-c:a','flac','-compression_level','8',str(dest)],check=True);final=measure(dest)
   tracks[key]=dict(file=dest.name,sha256=sha(dest),sourceHash=sha(p),gainDb=gain,lufs=float(final['input_i']),duration=.13,license='Project-original',author='原游戏420/560Hz发现提示')
 previous=json.loads((G/'approved-music.json').read_text())
 for cid in ['BG3','BG5','BG6','BG10']:
  t=dict(previous['tracks'][cid]);p=G/t['file'];a=measure(p,-24);t.update(inputLufs=float(a['input_i']),inputPeak=float(a['input_tp']));tracks[cid]=t
 for cid in ['NB2','NB3','NB5','NB6','NB10']:
  c=cs['discovery-music'][cid];v=c['versions'][0];s=ms['discovery-music']['sources'][c['source']];p=roots['discovery-music']/v['url'];assert sha(p)==v['sha256'];dest=G/('music-'+cid.lower()+p.suffix);shutil.copyfile(p,dest);assert sha(dest)==s['sourceSha256'];a=measure(dest,-24)
  tracks[cid]=dict(candidate=cid,file=dest.name,sha256=sha(dest),sourceHash=s['sourceSha256'],duration=v['duration'],name=c['name'],author=c['author'],sourceUrl=c['sourceUrl'],license=c['license'],inputLufs=float(a['input_i']),inputPeak=float(a['input_tp']))
  sources['discovery-music:'+c['source']]=s;packs['discovery-music:'+s['pack']]=ms['discovery-music']['sourcePacks'][s['pack']]
 music={k:t for k,t in tracks.items() if k in ['ORIGINAL','BG3','BG5','BG6','BG10','NB2','NB3','NB5','NB6','NB10']}
 # One shared attainable loudness target; no track is allowed to clip to meet it.
 target=min([-24]+[t['inputLufs']+(-1-t['inputPeak']) for t in music.values()])
 for t in music.values():t['targetLufs']=target;t['playbackGain']=10**((target-t['inputLufs'])/20)
 m=dict(version=1,date='2026-10-23 Asia/Shanghai',tracks=tracks,sources=sources,sourcePacks=packs,musicTargetLufs=target,processing='Original WebAudio score faithfully rendered as a seamless 61.44s loop. Other BGM files are original byte-identical copies; common playback-only loudness target. Discovery clips fixed -30 LUFS base incl original tier1/2; runtime x1.2x1.15. No pitch/filter/compression or new layers.')
 (G/'approved-raid-audio.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
 names={k:t['name'] for k,t in music.items()}
 (R/'src/music-catalog.ts').write_text('export const musicNames = '+json.dumps(names,ensure_ascii=False,indent=2)+' as const;\nexport type MusicTrack = keyof typeof musicNames;\n')
 code='import { musicNames } from "./music-catalog";\nexport type { MusicTrack } from "./music-catalog";\n'
 for k,t in music.items():code+=f'import {k.lower()} from "./assets/audio/{t["file"]}?url";\n'
 code+='export const musicTracks = {\n'
 for k,t in music.items():code+=f'  {k}: {{url:{k.lower()}, gain:{t["playbackGain"]}, name:musicNames.{k}}},\n'
 code+='} as const;\n';(R/'src/music.ts').write_text(code)
 # Remove superseded current entries from earlier manifests; history stays in docs.
 for name in ['approved-feedback.json','approved-music.json']:
  p=G/name;v=json.loads(p.read_text())
  for key in ['discover-3','discover-4','discover-5']:v['tracks'].pop(key,None)
  v['newestDiscoveryAndMusic']='approved-raid-audio.json';p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
 p=G/'sources.json';v=json.loads(p.read_text());v['approvedRaidAudio']={'metadata':'approved-raid-audio.json','tracks':tracks}
 for k,name in [('approvedFeedback','approved-feedback.json'),('approvedMusic','approved-music.json')]:v[k]={'metadata':name,'tracks':json.loads((G/name).read_text())['tracks']}
 p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print('Installed discovery/unlock choices, ten music choices; shared BGM target',target)
if __name__=='__main__':main()
