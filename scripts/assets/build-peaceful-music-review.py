#!/usr/bin/env python3
"""Download complete, unmodified approved-for-audition originals; never install to game."""
from pathlib import Path
from urllib.parse import urlparse,unquote
import json,subprocess,hashlib,zipfile,re,math,concurrent.futures,shutil
R=Path(__file__).resolve().parents[2]
SOURCE=R/'scripts/assets/peaceful-music-sources.json'
OUT=R/'public/audio-review/peaceful-music'
CACHE=Path('/tmp/tricat-peaceful-music');CACHE.mkdir(exist_ok=True)
(OUT/'audio').mkdir(parents=True,exist_ok=True)
m=json.loads(SOURCE.read_text())
# No previously researched track may silently be presented as a new candidate.
prior=[]
for filename in ['shots-music-sources.json','discovery-music-sources.json']:
 prior.extend(s.get('downloadUrl') for s in json.loads((SOURCE.parent/filename).read_text())['sources'].values())
assert all(t['downloadUrl'] not in prior for t in m['tracks'])
def build(t):
 suffix=Path(unquote(urlparse(t['downloadUrl']).path)).suffix.lower()
 raw=CACHE/(t['id']+suffix)
 if not raw.exists():
  subprocess.run(['curl','-fsSL','--retry','2','--max-time','120',t['downloadUrl'],'-o',str(raw)],check=True,capture_output=True)
 data=raw.read_bytes();t['downloadSha256']=hashlib.sha256(data).hexdigest()
 if suffix=='.zip':
  with zipfile.ZipFile(raw) as z:
   files=[f for f in z.namelist() if f.lower().endswith(('.mp3','.ogg')) and '__MACOSX' not in f]
   files.sort(key=lambda f:('loop' in f.lower(),not f.lower().endswith('.mp3'),len(f)))
   assert files,t['id'];entry=files[0];data=z.read(entry);suffix=Path(entry).suffix.lower();t['archiveEntry']=entry
   raw=CACHE/(t['id']+'-whole'+suffix);raw.write_bytes(data)
 sha=hashlib.sha256(data).hexdigest()
 if t.get('sha256'):assert t['sha256']==sha,t['id']+' original changed'
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(raw)],text=True))
 assert duration>15,t['id']
 measured=subprocess.run(['ffmpeg','-hide_banner','-i',str(raw),'-af','loudnorm=I=-24:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,check=True)
 stats=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',measured.stderr.decode(),re.S)[0]);gain_db=min(-24-float(stats['input_i']),-1-float(stats['input_tp']));assert math.isfinite(gain_db)
 url=f'audio/{t["id"].lower()}-{sha[:10]}{suffix}';(OUT/url).write_bytes(data)
 t.update(url=url,sha256=sha,bytes=len(data),duration=duration,gain=10**(gain_db/20),gainDb=gain_db,inputLufs=float(stats['input_i']),inputPeakDb=float(stats['input_tp']),whole=True)
 print(t['id'],t['title'],round(duration,1),'seconds',len(data),'bytes',flush=True)
 return t
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:m['tracks']=list(ex.map(build,m['tracks']))
m['processing']='Complete original files, unchanged bytes. Loudness-matched using playback gain only; no excerpts, edits, filters, pitch, fade or compression.'
m['authorCount']=len(set(t['author'] for t in m['tracks']))
shutil.copyfile(R/'src/assets/audio/music-original.flac',OUT/'audio/original-reference.flac')
(OUT/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
# Keep source identities and exact hashes pinned for later rebuilds.
SOURCE.write_text(json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
used={t['url'] for t in m['tracks']}|{'audio/original-reference.flac'}
for file in (OUT/'audio').iterdir():
 if 'audio/'+file.name not in used:file.unlink()
print('Built 20 complete audition tracks; game music unchanged.')
