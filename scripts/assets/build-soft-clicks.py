#!/usr/bin/env python3
"""Rebuild from bundled exact originals + disclosed authorized synth parameters; ffmpeg/numpy required."""
from pathlib import Path
import json,hashlib,subprocess,re,shutil,numpy as np
R=Path(__file__).resolve().parents[2];O=R/'public/audio-review/soft-clicks';O.mkdir(exist_ok=True);(O/'audio').mkdir(exist_ok=True);(O/'originals').mkdir(exist_ok=True);(O/'licenses').mkdir(exist_ok=True)
prior=json.loads((O/'manifest-v1.json').read_text());SR=44100
pages={};downloads={}
for c in prior['groups'][0]['candidates']:
 slug=c['sourceUrl'].split('/')[-1];pages[slug]={'url':c['sourceUrl']};downloads[slug]=c['download']
selections=[('bubbles-pop','pop.ogg','farfadet46','轻轻啵一下','CC0-1.0','8852次下载；49收藏；有已采用游戏集合'),('3-pop-sounds','3pops/pop2.ogg','wubitog','圆圆小泡泡','CC0-1.0','4064次下载；20收藏；评论有游戏采用回报'),('pop-sounds','pop1.ogg','cogitollc','柔软嘴唇啵','CC0-1.0','此条968次下载；作者为自己的游戏制作'),('ui-audio','Audio/click2.ogg','Kenney','软软轻按','CC0-1.0','官网UI Audio共50条；开发者资源指南推荐Kenney；官网未公开下载量'),('pop-effect-sounds','p_1.ogg','trezegames','极短轻泡','CC0-1.0','此条404次下载；较小众的动作匹配补充'),('pop-sounds-0','pop1.wav','EZduzziteh','小巧气泡点按','CC0-1.0','此条963次下载；评论有游戏使用反馈'),('atmospheric-interaction-sound-pack','krank_sounds/summer/part.wav','legoluft','柔和游戏短音','CC0-1.0','包11066次下载；评论有实际UI游戏采用反馈'),('bubble-sound-effects','bubbles-single2.wav','Brian MacIntosh / BMacZero','单颗小水泡','CC0-1.0','此条2334次下载；14收藏'),('40-cc0-water-splash-slime-sfx','bubble_02.ogg','rubberduck','软弹水泡','CC0-1.0','包5509次下载；48收藏'),('sci-fi-ui-sfx','UI Sci-Fi SFXs Confirm Pack Vol 1/PM_SD_UI_MAGIC_CONFIRM_2.wav','Urizen Composer','轻巧魔法确认','OGA-BY-4.0','包380次下载；较小众的柔和短音补充')]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def encode(a,p):
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-c:a','flac',str(p)],input=a.astype('<f4').tobytes(),check=True)
 return dict(url=str(p.relative_to(O)),sha256=sha(p),duration=len(a)/SR)
def normalize(a):
 r=subprocess.run(['ffmpeg','-hide_banner','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-af','apad=whole_dur=1,loudnorm=I=-30:TP=-2:LRA=11:print_format=json','-f','null','-'],input=a.astype('<f4').tobytes(),capture_output=True,check=True);s=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr.decode(),re.S)[0]);g=min(-30-float(s['input_i']),-2-float(s['input_tp']));return a*10**(g/20),g
m=dict(version=1,date='2026-10-23',status='试听待选；游戏UI点击保持原样',processing='外部素材只做固定音量匹配、无损转码；不剪切、不变调、不滤波、不叠层。原创五条基于原460Hz正弦点击，明确为本次自制。试听共同-30LUFS基线，原始对照亦匹配试听基线。',research=prior['research'],groups=[dict(id='external',name='公开素材 · 10位作者',candidates=[]),dict(id='original',name='基于原点击 · 5条自制',candidates=[])])
rows=[]
for i,(slug,file,author,name,license,popularity)in enumerate(selections,1):
 cid=f'SC{i}';p=O/prior['groups'][0]['candidates'][i-1]['original']['url'];dest=p;a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ac','1','-ar',str(SR),'-f','f32le','-']),'<f4').copy();a,g=normalize(a);v=encode(a,O/'audio'/(cid+'.flac'));v['gainDb']=g
 c=dict(id=cid,name=name,author=author,sourceUrl=pages[slug]['url'],license=license,popularity=popularity,sourceFile=file,sourceSha256=sha(p),download=downloads[slug],original=dict(url=str(dest.relative_to(O)),sha256=sha(dest)),audio=v);m['groups'][0]['candidates'].append(c);rows.append(f'| {cid} {name} | {author} | [{license}]({pages[slug]["url"]}) | {popularity} |')
# Exact original is reference; only five explicitly-authorized variants are new designs.
for cid,freq,dur,attack,glide,second,name in [('REF',460,.05,.008,0,0,'现有原始点击 · 对照'),('OC1',440,.06,.012,0,0,'暖一点的轻点'),('OC2',520,.055,.010,-70,0,'小水滴轻落'),('OC3',390,.075,.014,45,0,'圆圆软点'),('OC4',480,.065,.012,0,.10,'带一点亮度的轻点'),('OC5',560,.05,.009,-120,0,'轻盈小啵')]:
 t=np.arange(round(SR*(dur+.01)))/SR;env=np.where(t<attack,.08*t/attack,.08*np.exp(np.log(.001/.08)*(t-attack)/(dur-attack)));env[t>dur]=0;phase=2*np.pi*(freq*t+.5*glide/dur*t*t);a=env*(np.sin(phase)+second*np.sin(2*phase));a,g=normalize(a);v=encode(a,O/'audio'/(cid+'.flac'));v['gainDb']=g;c=dict(id=cid,name=name,author='本项目 · 本次自制'if cid!='REF'else'原游戏点击',license='Project-original',sourceUrl='https://github.com/Biscuit19/CodexGame2/blob/main/scripts/assets/build-soft-clicks.py',design=dict(frequency=freq,duration=dur,attack=attack,glide=glide,secondHarmonic=second),audio=v)
 if cid=='REF':m['reference']=c
 else:m['groups'][1]['candidates'].append(c);rows.append(f'| {cid} {name} | 本项目自制 | 项目原创 | 基于原460Hz点击；非公开素材 |')
# Ensure these external originals are not any previously auditioned source bytes.
old=[]
for p in (R/'public/audio-review').rglob('manifest-v1.json'):
 if p.parent==O:continue
 old.append((str(p),p.read_text()))
for c in m['groups'][0]['candidates']:
 assert not any(c['sourceSha256']in t for p,t in old), 'Previously used original '+c['id']
(O/'manifest-v1.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
for lic in ['CC0-1.0','CC-BY-3.0','OGA-BY-4.0']:
 p=next((R/'public/audio-review').rglob(lic+'.txt'));shutil.copyfile(p,O/'licenses'/p.name) if p.resolve()!=(O/'licenses'/p.name).resolve() else None
(R/'docs/AUDIO_SOFT_CLICKS.md').write_text('# 柔软UI点击试听\n\n2026-10-23。10个公开原声来自10位作者，另有用户明确授权制作的5个原点击风格变体；均待选，不替换游戏点击。\n\n先搜索开发者推荐、itch分类和作者页，再核对OpenGameArt原页；Reddit本次仅返回空壳页面，未把它当推荐依据。热度为原页下载快照，不代表游戏采用数量；小众补充如实标注。试听只做固定响度匹配；不把泡泡录音称为原生UI设计。\n\n| 编号 | 作者 | 许可与发行页 | 热度/说明 |\n|---|---|---|---|\n'+'\n'.join(rows)+'\n\n逐文件来源、下载包SHA、原文件SHA、试听SHA、固定增益、原创参数见public/audio-review/soft-clicks/manifest-v1.json。未进入游戏离线预缓存。\n')
print('Built 10 new external originals + 5 original-style designs + original reference')
