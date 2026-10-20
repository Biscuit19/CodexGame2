"""Build class-based CC0 sample mixes. Python stdlib + ffmpeg; pinned source URLs.
Use --source-dir /tmp/tricat-audio-sources to reuse downloaded candidates.
"""
import argparse,array,json,math,subprocess,tempfile,urllib.request,urllib.parse,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'src/assets/audio';OUT.mkdir(exist_ok=True)
args=argparse.ArgumentParser();args.add_argument('--source-dir',default='/tmp/tricat-audio-sources');cache=Path(args.parse_args().source_dir);cache.mkdir(parents=True,exist_ok=True)
WAR=('TeamForbiddenLLC/warfork-free-soundpacks','8005f47869cbac20608f1d606621e4b8fcdec574')
COL=('lavenderdotpet/CC0-Public-Domain-Sounds','f2b6264f9ab89fabc266914c3654685d68c5a39b')
IMP=('Boyquotes/kenney-impact-sounds-for-godot','999dd1684873f8b020a3aa5b26e713da21688924')
sources={}
def add(key,repo,path):
 url=f'https://raw.githubusercontent.com/{repo[0]}/{repo[1]}/'+urllib.parse.quote(path)
 p=cache/(key+Path(path).suffix)
 if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=30).read())
 sources[key]={'repository':repo[0],'revision':repo[1],'path':path,'url':url,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 return p
paths={}
for n in ['machinegun_fire','riotgun_fire_strong','instagun_strong','weapon_switch']:
 paths['war-'+n]=add('war-'+n,WAR,'cc0/sounds/weapons/'+n+'.ogg')
for n in ['metalClick','metalLatch','cloth1','cloth4','clothBelt2','beltHandle1','handleSmallLeather','dropLeather','drawKnife1','drawKnife2']:
 paths['rpg-'+n]=add('rpg-'+n,COL,'kenney_rpgaudio/Audio/'+n+'.ogg')
for n in ['Gentle Swish','Classic Swish 1','Slash','Thunk 1']:
 paths['organic-'+n]=add('organic-'+n,COL,'Micro Pack - Organic Wooshes/'+n+'.wav')
for n in ['impact_soft_heavy_000','impact_metal_light_000']:
 paths['impact-'+n]=add('impact-'+n,IMP,'addons/kenney impact sounds/'+n+'.ogg')
SR=44100
tracks={}
def layer(key,at=0,gain=1,pitch=1,lowpass=8500,limit=None):
 # Resampling changes the pitch only for offline sound-design; reload runtime fitting is separate.
 filters=f'aresample={SR},asetrate={round(SR*pitch)},aresample={SR},highpass=f=65,lowpass=f={lowpass}'
 if limit:filters+=f',atrim=duration={limit}'
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(paths[key]),'-af',filters,'-ac','1','-ar',str(SR),'-f','f32le','-'])
 a=array.array('f');a.frombytes(b);peak=max(map(abs,a),default=1) or 1
 return at,[x/peak*gain for x in a],key

def mix(name,duration,layers,peak=.70):
 a=[0.] * round(duration*SR)
 for at,values,key in layers:
  offset=round(at*SR)
  for n,v in enumerate(values):
   i=n+offset
   if i<len(a):a[i]+=v
 # Gentle compression and 6ms fade-out keep transients clear without brittle clipping.
 a=[math.tanh(x*1.1) for x in a];p=max(map(abs,a),default=1) or 1
 fade=round(SR*.006)
 for i in range(len(a)):
  a[i]=a[i]/p*peak*min(1,(len(a)-1-i)/fade,i/(SR*.0006))
 floats=array.array('f',a)
 subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ac','1','-ar',str(SR),'-i','pipe:0','-c:a','libvorbis','-q:a','5',str(OUT/(name+'.ogg'))],input=floats.tobytes(),check=True)
 tracks[name]={'duration':duration,'layers':[x[2] for x in layers],'peakTarget':peak,'sha256':hashlib.sha256((OUT/(name+'.ogg')).read_bytes()).hexdigest()}

mix('shot-smg',.22,[layer('war-machinegun_fire',gain=.8,pitch=1.16,lowpass=7600)],.60)
mix('shot-rifle',.36,[layer('war-machinegun_fire',gain=.85,pitch=.88,lowpass=7000),layer('impact-impact_metal_light_000',.01,.14,1.2,4500,.12)],.73)
mix('shot-sniper',.74,[layer('war-instagun_strong',gain=1,pitch=.88,lowpass=6200,limit=.70),layer('organic-Thunk 1',0,.16,.8,900,.17)],.85)
mix('shot-shotgun',.68,[layer('war-riotgun_fire_strong',gain=1,pitch=.88,lowpass=5800,limit=.67),layer('organic-Thunk 1',0,.24,.73,750,.22)],.9)
# Full mechanical sequences: remove magazine, insert, chamber/bolt; no electronic beeps.
mix('reload-smg',1.7,[layer('rpg-metalClick',0,.35,1.15,6000,.16),layer('rpg-handleSmallLeather',.35,.2,1.1,4000),layer('rpg-metalLatch',.96,.5,1.1,6500),layer('rpg-metalClick',1.41,.4,1.15,6000,.2)],.6)
mix('reload-rifle',2.1,[layer('rpg-metalLatch',0,.5,1,6500),layer('rpg-cloth4',.42,.18,1,4500),layer('rpg-metalClick',1.15,.55,.9,5500,.22),layer('rpg-metalLatch',1.73,.6,.9,6000)],.66)
mix('reload-sniper',2.8,[layer('rpg-drawKnife2',0,.35,.85,5000),layer('rpg-metalLatch',.58,.5,.8,5000),layer('rpg-handleSmallLeather',1.17,.22,.95,4500),layer('rpg-metalClick',2.03,.55,.8,5000),layer('rpg-metalLatch',2.45,.5,.85,5500)],.68)
mix('reload-shotgun',2.8,[layer('rpg-metalClick',.02,.3,.8,4500),*[layer('rpg-metalLatch',at,.4,1.1,5000,.22) for at in [.45,.87,1.29,1.71]],layer('rpg-drawKnife1',2.20,.4,.8,5000),layer('rpg-metalClick',2.56,.5,.85,5500,.22)],.68)
mix('equip-weapon',.34,[layer('war-weapon_switch',0,.4,1,6000),layer('rpg-metalLatch',.06,.55,1,6000)],.58)
mix('equip-gear',.46,[layer('rpg-clothBelt2',0,.45,1,5000,.32),layer('rpg-beltHandle1',.17,.5,1,5000,.28)],.55)
mix('roll',.35,[layer('organic-Gentle Swish',0,.35,1.1,4500,.25),layer('rpg-cloth4',.02,.5,1.15,4200,.25),layer('impact-impact_soft_heavy_000',.21,.35,1.1,2200,.14)],.58)
mix('melee',.25,[layer('organic-Slash',0,.5,1,6500,.24)],.5)
(OUT/'sources.json').write_text(json.dumps({'license':'CC0-1.0','sampleRate':SR,'sources':sources,'tracks':tracks},indent=2)+'\n')
print(json.dumps({k:round((OUT/(k+'.ogg')).stat().st_size/1024,1) for k in tracks}))
