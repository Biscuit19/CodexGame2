#!/usr/bin/env python3
"""Build the approved game/audition gun sounds.
Latest user revision: light high-shelf softening on rifle/shotgun shots only;
sniper reload is the original .308 sequence alone. Other processing remains
constant gain, exact cuts and the specified shotgun reload concatenation.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / 'public/audio-review'
OUT = REVIEW / 'selected'
RATE = 44100
CHANNELS = 2
PEAK_CEILING = -1.0
SOURCE_MANIFEST = json.loads((REVIEW / 'manifest-v2.json').read_text())
SELECTED = ['E-9mm', 'E-762', 'G-sbmksniper', 'G-sbshotgun', 'E-ar-reload', 'E-sniper-reload', 'G-sbmkreload', 'E-pump-reload']


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, **kw)


def decode(name):
    path = REVIEW / ('audio/' + name + '.mp3')
    entry = next(t for t in SOURCE_MANIFEST['tracks'] if t['url'] == 'audio/' + name + '.mp3')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], name
    # Decode the pinned author MP3 at the shared game/audition sample rate.
    return array.array('f', run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(RATE), '-ac', str(CHANNELS), '-f', 'f32le', '-']).stdout), entry


def encode(samples, path, codec="pcm_s24le"):
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', str(CHANNELS), '-i', '-', '-c:a', codec, str(path)], input=samples.tobytes())


def measure(samples, tmp):
    path = tmp / 'measure.wav'
    encode(samples, path, "pcm_f32le")
    result = run(['ffmpeg', '-hide_banner', '-i', str(path), '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']).stderr.decode()
    summary = result[result.rfind('Summary:'):]
    loudness = float(re.search(r'I:\s*([-\d.]+) LUFS', summary)[1])
    peak = float(re.search(r'Peak:\s*([-\d.]+) dBFS', summary)[1])
    assert math.isfinite(loudness) and loudness > -70
    return {'lufs': loudness, 'truePeakDbfs': peak}


def scale(samples, db):
    gain = 10 ** (db / 20)
    return array.array('f', (v * gain for v in samples))


def duration(samples):
    return len(samples) / CHANNELS / RATE


def safe_target(metrics):
    # A shared attainable loudness, retaining crest factors without any compression.
    return math.floor(min(-20, *(m['lufs'] + PEAK_CEILING - m['truePeakDbfs'] for m in metrics)) * 10) / 10 - .2


def soften(samples, filter_spec):
    return array.array('f', run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', str(CHANNELS), '-i', '-', '-af', filter_spec, '-f', 'f32le', '-'], input=samples.tobytes()).stdout)


TONE_FILTERS = {
    'shot-rifle': 'highshelf=f=4200:g=-3:t=q:w=0.707',
    'shot-shotgun': 'highshelf=f=3500:g=-3.5:t=q:w=0.707',
}


def install_game(manifest):
    game = ROOT / 'src/assets/audio'
    legacy = json.loads((game / 'foley-sources.json').read_text())
    for name, meta in legacy['tracks'].items():
        assert hashlib.sha256((game / (name + '.ogg')).read_bytes()).hexdigest() == meta['sha256'], name
    outputs = {}
    for key, track in manifest['tracks'].items():
        source = OUT / track['url']
        dest = game / (key + '.flac')
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-c:a', 'flac', '-compression_level', '8', str(dest)])
        # Lossless game packing: compare decoded samples to the exact audition WAV.
        pcm = lambda path: run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-']).stdout
        assert pcm(source) == pcm(dest), key
        outputs[key] = {'file':dest.name, 'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(), 'auditionSha256':track['sha256'], 'duration':track['duration'], 'lufs':track['after']['lufs']}
    for key in outputs:
        (game / (key + '.ogg')).unlink(missing_ok=True)
    data = {'license':'Mixed CC0-1.0 and CC-BY-3.0; see README.md and licenses', 'version':2, 'sampleRate':RATE, 'gunSounds':outputs, 'sources':manifest['sources'], 'processing':manifest['processing'], 'toneFilters':manifest['toneFilters'], 'cuts':manifest['cuts'], 'joins':manifest['joins'], 'retainedFoley':{'metadata':'foley-sources.json','tracks':legacy['tracks']}}
    if (game / 'approved-actions.json').exists():
        actions = json.loads((game / 'approved-actions.json').read_text())
        data['approvedActions'] = {'metadata':'approved-actions.json', 'tracks':actions['tracks']}
        data['license'] = 'Mixed CC0, CC BY 3.0, CC BY-SA 3.0 and FilmCow royalty-free; see per-track metadata'
    if (game / 'approved-interactions.json').exists():
        interactions = json.loads((game / 'approved-interactions.json').read_text())
        data['approvedInteractions'] = {'metadata':'approved-interactions.json', 'tracks':interactions['tracks']}
    (game / 'sources.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    if (game / 'approved-feedback.json').exists():
        subprocess.run(['python', str(ROOT / 'scripts/assets/install-approved-feedback.py')], check=True)
    print('Installed gun bank; preserved later explicit feedback/reload selections.')


def main(install=False):
    OUT.mkdir(exist_ok=True)
    (OUT / 'audio').mkdir(exist_ok=True)
    decoded = {name: decode(name) for name in SELECTED}
    parts = {name: pcm for name, (pcm, _) in decoded.items()}
    sniper_start = 2.03
    parts['G-sbmksniper-last'] = parts['G-sbmksniper'][round(sniper_start * RATE) * CHANNELS:]
    parts['G-sbmkreload-first18'] = parts['G-sbmkreload'][:round(1.8 * RATE) * CHANNELS]
    with tempfile.TemporaryDirectory() as directory:
        tmp = Path(directory)
        joins = {}
        composites = {}
        for kind, pair in [('shotgun', ['G-sbmkreload-first18', 'E-pump-reload'])]:
            metrics = [measure(parts[p], tmp) for p in pair]
            target = safe_target(metrics)
            matched = [scale(parts[p], target - m['lufs']) for p, m in zip(pair, metrics)]
            joined = array.array('f')
            details = []
            for p, original, samples in zip(pair, metrics, matched):
                details.append({'sourcePart': p, 'offset': duration(joined), 'duration': duration(samples), 'gainDb': round(target - original['lufs'], 2), 'before': original, 'matched': measure(samples, tmp)})
                joined.extend(samples)
            composites[kind] = joined
            joins[kind] = {'mode': 'sequential; no overlap, crossfade or added gap', 'matchedTargetLufs': target, 'segments': details}
        raw = {
            'shot-smg': parts['E-9mm'], 'shot-rifle': parts['E-762'],
            'shot-sniper': parts['G-sbmksniper-last'], 'shot-shotgun': parts['G-sbshotgun'],
            'reload-smg': parts['E-ar-reload'], 'reload-rifle': parts['E-ar-reload'],
            'reload-sniper': parts['E-sniper-reload'], 'reload-shotgun': composites['shotgun'],
        }
        for key, filter_spec in TONE_FILTERS.items():
            previous_length = len(raw[key])
            raw[key] = soften(raw[key], filter_spec)
            assert len(raw[key]) == previous_length, key
        before = {k: measure(v, tmp) for k, v in raw.items()}
        target = safe_target(list(before.values()))
        tracks = {}
        for key, pcm in raw.items():
            gain_db = target - before[key]['lufs']
            final = scale(pcm, gain_db)
            temporary = tmp / 'final.wav'
            encode(final, temporary)
            h = hashlib.sha256(temporary.read_bytes()).hexdigest()
            name = key + '-' + h[:10] + '.wav'
            (OUT / 'audio' / name).write_bytes(temporary.read_bytes())
            measurement = measure(final, tmp)
            assert abs(measurement['lufs'] - target) <= .15, (key, measurement, target)
            assert measurement['truePeakDbfs'] <= PEAK_CEILING + .05, (key, measurement)
            tracks[key] = {'url': 'audio/' + name, 'sha256': h, 'duration': duration(final), 'channels': CHANNELS, 'sampleRate': RATE, 'gainDb': round(gain_db, 2), 'before': before[key], 'after': measurement}
        valid = {Path(t['url']).name for t in tracks.values()}
        for old in (OUT / 'audio').glob('*.wav'):
            if old.name not in valid:
                old.unlink()
        weapons = [
            {'id':'smg', 'name':'冲锋枪', 'rpm':720, 'shotSource':'E · 9mm 单发｜轻型枪声候选', 'reloadSource':'E · AR 完整换弹'},
            {'id':'rifle', 'name':'步枪', 'rpm':600, 'shotSource':'E · 7.62×54R 单发｜栓动步枪（轻微柔化高频）', 'reloadSource':'E · AR 完整换弹'},
            {'id':'sniper', 'name':'狙击枪', 'rpm':45, 'shotSource':'G · .416 Barrett：最后一次击发至原录音结尾，含弹壳尾声', 'reloadSource':'E · .308 栓动完整换弹（已取消末尾 Mossberg 声）'},
            {'id':'shotgun', 'name':'霰弹枪', 'rpm':70, 'shotSource':'G · 10 Gauge 霰弹枪｜立体声（轻微柔化高频）', 'reloadSource':'G · 退出弹匣并换弹：前 1.8 秒 → E · 泵动霰弹枪完整换弹'},
        ]
        manifest = {'version':2, 'previewOnly':False, 'installedToGame':install, 'date':'2026-10-21', 'processing':'User-authorized gentle high-shelf cuts on rifle and shotgun shots only. Constant gain, exact cuts and sequential shotgun reload concatenation otherwise. Sniper reload: .308 only. No compressor, limiter, fades, reverb, pitch/tempo change, or added silence.', 'toneFilters':TONE_FILTERS, 'format':'24-bit PCM WAV, stereo, 44.1kHz. Game package uses sample-identical lossless FLAC.', 'targetLufs':round(target, 2), 'peakCeilingDbfs':PEAK_CEILING, 'weapons':weapons, 'tracks':tracks, 'joins':joins, 'cuts':{'shot-sniper':{'source':'G-sbmksniper', 'start':sniper_start, 'end':duration(parts['G-sbmksniper']), 'note':'Third and final shot onset at ~2.05s. Starts 20ms before attack and preserves every remaining sample, including casing tail.'}, 'reload-shotgun-first':{'source':'G-sbmkreload','start':0,'end':1.8}}, 'sources':{name:{'url':'../'+entry['url'], 'sha256':entry['sha256'], 'originalSource':entry['source']} for name, (_,entry) in decoded.items()}}
        payload = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
        (OUT / 'manifest.json').write_text(payload)
        (OUT / 'manifest-v2.json').write_text(payload)
        if install:
            install_game(manifest)
        print('8 selected sounds; common integrated loudness:', target, 'LUFS')
        for key, track in tracks.items():
            print(key, round(track['duration'], 3), 's', track['after'])
        print('Matched joins:', json.dumps(joins, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--install-game', action='store_true')
    main(parser.parse_args().install_game)
