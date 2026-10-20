"""Independent audition assets only. Does not modify the game's src/assets/audio bank.
Dependencies: numpy, scipy, ffmpeg. Sources are pinned in audio-review-sources.json.
"""
import json,math,hashlib,subprocess,urllib.request,pathlib,argparse,zipfile
import numpy as np
from scipy.signal import butter,sosfiltfilt,resample_poly
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'public/audio-review';OUT.mkdir(exist_ok=True)
SR=44100
ap=argparse.ArgumentParser();ap.add_argument('--cache',default='/tmp/tricat-review-sources');CACHE=pathlib.Path(ap.parse_args().cache);CACHE.mkdir(exist_ok=True)
source_meta=json.loads(pathlib.Path(__file__).with_name('audio-review-sources.json').read_text())
raw={};used={}
for key,m in source_meta.items():
 p=CACHE/(key+pathlib.Path(m['path']).suffix)
 if not p.exists():p.write_bytes(urllib.request.urlopen(m['url'],timeout=30).read())
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-'])
 a=np.frombuffer(b,dtype='<f4').astype(float);a-=np.mean(a)
 ix=np.flatnonzero(np.abs(a)>max(np.max(np.abs(a))*.005,.0001))
 if len(ix):a=a[max(0,ix[0]-200):min(len(a),ix[-1]+700)]
 peak=np.max(np.abs(a)) or 1;raw[key]=a/peak
 m['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()

def smooth(a,cut=3200):
 if len(a)<50:return a
 return sosfiltfilt(butter(3,cut,fs=SR,output='sos'),sosfiltfilt(butter(2,45,btype='highpass',fs=SR,output='sos'),a))
def src(key,duration=None,pitch=1,cut=3200):
 a=raw[key].copy()
 if pitch!=1:a=resample_poly(a,100,round(100*pitch))
 if duration:a=a[:round(duration*SR)]
 a=smooth(a,cut)
 if len(a)>10:
  n=min(round(SR*.006),len(a)//4);a[:n]*=np.sin(np.linspace(0,np.pi/2,n))**2
  n=min(round(SR*.035),len(a)//3);a[-n:]*=np.cos(np.linspace(0,np.pi/2,n))**2
 return a,[key]
def blend(duration,*layers):
 a=np.zeros(round(duration*SR));keys=[]
 for at,gain,(x,names) in layers:
  i=round(at*SR);n=min(len(x),len(a)-i)
  if n>0:a[i:i+n]+=gain*x[:n]
  keys+=names
 return a,sorted(set(keys))
def tone(duration,freq,decay=20,amp=1,slide=0):
 t=np.arange(round(SR*duration))/SR
 phase=2*np.pi*(freq*t + slide*(1-np.exp(-35*t))/35)
 env=(1-np.exp(-t*750))*np.exp(-t*decay)
 return amp*np.sin(phase)*env
rng=np.random.default_rng(31947)
def airy(duration,decay=25,low=180,high=2200):
 t=np.arange(round(SR*duration))/SR
 a=sosfiltfilt(butter(2,[low,high],btype='bandpass',fs=SR,output='sos'),rng.normal(size=len(t)))
 return a*(1-np.exp(-t*500))*np.exp(-t*decay)
def generated_click(weight=1):
 d=.16;a=tone(d,310/weight,38,.6)+tone(d,670/weight,55,.14)+airy(d,40,250,1800)*.04
 return a,['original:sine-modal-click']
def generated_shot(kind):
 d={'smg':.15,'rifle':.22,'sniper':.36,'shotgun':.30}[kind]
 f={'smg':125,'rifle':103,'sniper':78,'shotgun':67}[kind]
 decay={'smg':35,'rifle':23,'sniper':14,'shotgun':17}[kind]
 a=tone(d,f,decay,.8,65)+tone(d,f*2.45,45,.12)+airy(d,55 if kind=='smg' else 33,280,2600)*(.07 if kind=='smg' else .11)
 # Small wood-like modal body, no square waves, crackle, clipping or saturator.
 a+=tone(d,420 if kind=='smg' else 330,60,.10)
 return smooth(a,3400),['original:modal-bass-and-filtered-air']
def generated_swish(d=.35):
 t=np.arange(round(SR*d))/SR
 a=sosfiltfilt(butter(3,[220,1700],btype='bandpass',fs=SR,output='sos'),rng.normal(size=len(t)))
 return a*np.sin(np.pi*np.minimum(1,t/d))**3*.12,['original:filtered-cloth-air']
CATEGORIES=[('shot-smg','冲锋枪射击','shot'),('shot-rifle','步枪射击','shot'),('shot-sniper','狙击枪射击','shot'),('shot-shotgun','霰弹枪射击','shot'),('reload-smg','冲锋枪换弹','reload'),('reload-rifle','步枪换弹','reload'),('reload-sniper','狙击枪换弹','reload'),('reload-shotgun','霰弹枪换弹','reload'),('equip-weapon','从容器装备武器','action'),('equip-gear','从容器装备护具','action'),('roll','翻滚','action'),('melee','挥刀','action')]
SETS=[{'id':'A','name':'圆润街机','origin':'Kenney 官方 FPS Starter Kit＋Interface','description':'短促、圆润，保留一点街机枪械的弹性；低频收住，不做真实枪炮的爆裂尾音。','kind':'素材方案'}, {'id':'B','name':'轻机械卡通','origin':'Kenney Impact＋Interface','description':'偏木质、轻金属与扣合感，电子感较少；动作声音更柔，接近日常小物件的精简触感。','kind':'素材方案'}, {'id':'C','name':'柔和电子','origin':'Kenney Sci-Fi Sounds＋Interface','description':'更干净的轻电子质感，柔化高频和长混响；保留四种枪不同的起音与重量。','kind':'素材方案'}, {'id':'D','name':'暖色原创','origin':'本次从零制作，无外部枪声采样','description':'沿原版方向重做：暖而短的低频、轻敲击与少量平滑气流，减少白噪声，四种枪分别设计。','kind':'原创方案'}]
manifest={'sampleRate':SR,'previewOnly':True,'sets':SETS,'categories':[{'id':k,'name':n,'group':g} for k,n,g in CATEGORIES],'sources':source_meta,'tracks':[],'normalization':'同类声音使用统一活动区间RMS目标及峰值上限；无失真压缩。只用于独立试听，不修改游戏音效。'}

def write(setid,key,a,keys,group):
 a=smooth(a,3900);a-=a.mean()
 # Normalize by active 20ms windows rather than silence between reload operations.
 window=882;energies=np.array([np.sqrt(np.mean(a[i:i+window]**2)) for i in range(0,len(a),window)])
 active=energies[energies>max(energies.max()*.08,1e-9)]
 rms=np.sqrt(np.mean(active**2)) if len(active) else 1
 target={'shot':.013,'reload':.0045,'action':.0055}[group]
 ceiling={'shot':.075,'reload':.035,'action':.035}[group]
 gain_factor=min(target/max(rms,1e-9),ceiling/max(np.abs(a).max(),1e-9))
 a=a*gain_factor
 # Every clip starts and ends smoothly; no hard limiting or overdrive.
 n=min(220,len(a)//4);a[:n]*=np.linspace(0,1,n);a[-n:]*=np.linspace(1,0,n)
 p=OUT/'audio'/f'{setid}-{key}.mp3';p.parent.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ac','1','-ar',str(SR),'-i','pipe:0','-c:a','libmp3lame','-b:a','128k',str(p)],input=a.astype('<f4').tobytes(),check=True)
 decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-']),dtype='<f4')
 decoded_rms=np.array([np.sqrt(np.mean(decoded[i:i+882]**2)) for i in range(0,len(decoded),882)])
 active_decoded=decoded_rms[decoded_rms>max(float(decoded_rms.max())*.08,1e-9)]
 row={'set':setid,'id':key,'url':'audio/'+p.name,'duration':len(a)/SR,'sources':keys,'peak':float(np.abs(a).max()),'activeRms':float(np.sqrt(np.mean(active_decoded**2))),'decodedPeak':float(np.max(np.abs(decoded))),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 manifest['tracks'].append(row)
 return a

for sid in ['A','B','C','D']:
 shots={}
 for key,label,group in CATEGORIES:
  if key.startswith('shot-'):
   kind=key[5:];i=['smg','rifle','sniper','shotgun'].index(kind);dur=[.15,.22,.36,.30][i]
   if sid=='A':a,keys=src(['fps-blaster_repeater','fps-blaster','fps-enemy_attack','fps-blaster'][i],dur,[1.05,.97,.86,.76][i],2600)
   elif sid=='B':a,keys=blend(dur,(0,.72,src('imp-impact_wood_light_000' if i==0 else 'imp-impact_wood_medium_000',dur,1.05-i*.1,2200)),(.004,.12,src('ui-click_001',.07,1-i*.08,2700)))
   elif sid=='C':a,keys=src(['sf-laser_small_000','sf-laser_small_002','sf-laser_large_003','sf-laser_large_000'][i],dur,[1,.95,.86,.82][i],2900)
   else:a,keys=generated_shot(kind)
   # Clip length is intentionally short and zero-padded only for consistent listening.
   a=blend(dur,(0,1,(a,keys)))[0]
   shots[kind]=write(sid,key,a,keys,group);continue
  if key.startswith('reload-'):
   kind=key[7:];i=['smg','rifle','sniper','shotgun'].index(kind);dur=[1.7,2.1,2.8,2.8][i]
   if sid=='D':
    positions=[.02,.43*dur,.85*dur] if kind!='shotgun' else [.02,.43,.86,1.29,1.72,2.42]
    a,keys=blend(dur,*[(t,.5,generated_click(.9+i*.13+(n%2)*.15)) for n,t in enumerate(positions)])
   else:
    first={'A':'fps-weapon_change','B':'ui-switch_001','C':'sf-door_open_000'}[sid]
    last={'A':'ui-switch_003','B':'imp-impact_metal_light_001','C':'sf-door_close_001'}[sid]
    positions=[.02,.45*dur,.84*dur] if kind!='shotgun' else [.02,.44,.88,1.32,1.76,2.4]
    a,keys=blend(dur,*[(t,.6,src(first if n==0 else last,.17 if kind=='shotgun' else .25,1.03-i*.08,2400)) for n,t in enumerate(positions)])
  elif key=='equip-weapon':
   a,keys=generated_click(1) if sid=='D' else src({'A':'fps-weapon_change','B':'ui-switch_003','C':'sf-impact_metal_001'}[sid],.22,1,2200)
  elif key=='equip-gear':
   a,keys=blend(.25,(0,.5,generated_swish(.23)),(.09,.28,generated_click(1.2))) if sid=='D' else src('ui-drop_002' if sid=='A' else 'imp-impact_soft_medium_001' if sid=='B' else 'ui-open_001',.25,1,2100)
  elif key=='roll':
   if sid=='D':a,keys=blend(.35,(0,.6,generated_swish(.3)),(.22,.25,generated_click(1.8)))
   else:a,keys=blend(.35,(0,.45,src({'A':'fps-jump_c','B':'imp-footstep_carpet_000','C':'sf-door_open_000'}[sid],.24,1.1,1700)),(.22,.25,src('fps-land' if sid=='A' else 'imp-impact_soft_medium_001',.13,1.1,1400)))
  else:
   a,keys=generated_swish(.22) if sid=='D' else src('fps-jump_c' if sid=='A' else 'ui-open_001' if sid=='B' else 'sf-door_close_001',.22,1.15,2000)
  write(sid,key,a,keys,group)
 # A one-second burst keeps sample overlap audible while protecting against unexpectedly loud playback.
 for kind,a in shots.items():
  interval={'smg':1/12,'rifle':.1,'sniper':.7,'shotgun':.65}[kind];d=1.1 if kind in ['smg','rifle'] else 1.5
  burst,_=blend(d,*[(at,1,(a,[])) for at in np.arange(0,d-len(a)/SR,interval)])
  write(sid,'burst-'+kind,burst,[], 'shot')

# Render original synthesized references at the game's default master/SFX settings.
# These are comparison-only and are never wired into the running game.
gain=.65*.7*.5
def old_note(freq,d,vol):
 t=np.arange(round(SR*d))/SR
 tri=2/np.pi*np.arcsin(np.sin(2*np.pi*freq*t));env=np.where(t<.008,vol*t/.008,vol*np.exp(np.log(.001/vol)*(t-.008)/(d-.008)))
 return tri*env
for key in ['shot','roll','equip','switch']:
 d={'shot':.1,'roll':.2,'equip':.07,'switch':.05}[key];t=np.arange(round(SR*d))/SR
 if key=='shot':
  a=blend(d,(0,1,(old_note(95,.08,.25),[])))[0];noise=rng.uniform(-1,1,len(t))*(np.maximum(0,1-t/.08))**2*.18;noise[t>.08]=0;a+=sosfiltfilt(butter(1,4000,fs=SR,output='sos'),noise)
 elif key=='roll':a=sosfiltfilt(butter(1,650,fs=SR,output='sos'),rng.uniform(-1,1,len(t))*(1-t/d)**2*.08)
 else:a=np.sin(2*np.pi*460*t)*(1-np.exp(-t*1000))*np.exp(-t*75)*.08
 a*=gain
 p=OUT/'audio'/f'original-{key}.mp3';subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ac','1','-ar',str(SR),'-i','pipe:0','-c:a','libmp3lame','-b:a','128k',str(p)],input=a.astype('<f4').tobytes(),check=True)
manifest['references']=[{'name':n,'url':f'audio/original-{k}.mp3'} for k,n in [('shot','原版合成枪声'),('roll','原版翻滚声'),('equip','原版轻提示'),('switch','切枪：安静参考')]]
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for sid in ['A','B','C','D']:
 with zipfile.ZipFile(OUT/f'方案{sid}.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted((OUT/'audio').glob(sid+'-*.mp3')):z.write(p,p.name)
  z.writestr('说明.txt','独立试听方案'+sid+'。尚未装入游戏。所有音频已做低音量、柔和化处理。原素材均为Kenney CC0；D为本次原创合成。来源、许可与参数见在线试听页。')
  for p in (OUT/'licenses').iterdir():z.write(p,'licenses/'+p.name)
print('Built',len(manifest['tracks']),'tracks + 4 references, preview only.')
