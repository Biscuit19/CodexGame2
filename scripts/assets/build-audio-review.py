#!/usr/bin/env python3
"""Build the second audition from author recordings. No synthesis, EQ, pitch or edits.

python scripts/assets/build-audio-review.py --cache /tmp/audio-research-v2
Sources and exact archive members: audio-review-sources.json.
Official-only demos stay on the authors' players; they are never downloaded here.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/audio-review'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def media_info(path, group):
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_format', '-show_streams', '-of', 'json', str(path)]))
    stream = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    pcm = array.array('f', subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-acodec', 'pcm_f32le', '-']))
    peak = max(map(abs, pcm), default=0)
    active = [v for v in pcm if abs(v) >= peak * .04]
    rms = math.sqrt(sum(v*v for v in active) / max(1, len(active)))
    # Playback gain only; raw/copied files retain their full original samples.
    target = .013 if group == 'shot' else .009
    gain = min(1, target / max(rms, 1e-9), .10 / max(peak, 1e-9))
    return dict(duration=float(info['format']['duration']), channels=stream['channels'], peak=peak, activeRms=rms, previewGain=gain)

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--cache', type=Path, required=True)
    cache = args.parse_args().cache
    recipe = json.loads((ROOT / 'scripts/assets/audio-review-sources.json').read_text())
    for archive in recipe['sourceArchives']:
        path = cache / archive['file']
        if path.stat().st_size != archive['bytes']:
            raise ValueError('Source size mismatch: ' + str(path))
        h = hashlib.sha256()
        with path.open('rb') as f:
            for b in iter(lambda: f.read(1048576), b''):
                h.update(b)
        if h.hexdigest() != archive['sha256']:
            raise ValueError('Source hash mismatch: ' + str(path))
    if not (cache / 'firearms/Prepared SFX Library').exists():
        import py7zr
        with py7zr.SevenZipFile(cache / 'firearms.7z') as z:
            z.extractall(cache / 'firearms')
    with tempfile.TemporaryDirectory(dir=cache) as temporary:
        temp = Path(temporary)
        audio = temp / 'audio'
        audio.mkdir()
        tracks = []
        for entry in recipe['tracks']:
            t = dict(entry)
            if t['container'].endswith('.zip'):
                with zipfile.ZipFile(cache / t['container']) as z:
                    source = z.read(t['member'])
            elif t['container'] == 'firearms':
                source = (cache / 'firearms' / t['member']).read_bytes()
            else:
                source = (cache / t['member']).read_bytes()
            filename = t['set'] + '-' + t['id'] + '.mp3'
            output = audio / filename
            if t['member'].lower().endswith('.mp3'):
                output.write_bytes(source)
                processing = '原始 MP3 逐字节复制；无音频处理'
            else:
                original = temp / 'original.wav'
                original.write_bytes(source)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-q:a', '2', str(output)], check=True)
                processing = '完整 WAV 转 MP3；保留原时长、声道、音高和尾音；无剪辑、滤波、混合、时间拉伸或动态处理'
            t.update(url='audio/' + filename, sourceSha256=sha(source), sha256=sha(output.read_bytes()), bytes=output.stat().st_size, processing=processing)
            t.update(media_info(output, t['group']))
            tracks.append(t)
        retained = PUBLIC / 'audio/A-shot-smg.mp3'
        ref = dict(id='retained-A-smg', name='保留参考：旧方案 A 冲锋枪', url='audio/A-shot-smg.mp3', sha256=sha(retained.read_bytes()), note='用户要求保留；文件与上一轮完全一致。不是本轮未经处理的原声。')
        ref.update(media_info(retained, 'shot'))
        manifest = dict(version=2, previewOnly=True, date=recipe['date'], sets=recipe['sets'], alternatives=recipe.get('alternatives', []), bonus=recipe['bonus'], tracks=tracks, references=[ref], sourceArchives=recipe['sourceArchives'])
        # Only the named audition directory is updated. Game assets remain untouched.
        for old in (PUBLIC / 'audio').glob('*.mp3'):
            if old.name not in recipe['retained']:
                old.unlink()
        for old in PUBLIC.glob('方案*.zip'):
            old.unlink()
        for p in audio.iterdir():
            shutil.copyfile(p, PUBLIC / 'audio' / p.name)
        payload = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
        (PUBLIC / 'manifest.json').write_text(payload)
        # A new path avoids the previous worker returning its cached first-round manifest.
        (PUBLIC / 'manifest-v2.json').write_text(payload)
        print(f'Built {len(tracks)} author recordings + 1 retained reference. Five firearm authors + separate FilmCow action supplement. No game audio changed.')

if __name__ == '__main__':
    main()
