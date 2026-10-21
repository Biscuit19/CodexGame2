#!/usr/bin/env python3
"""Rebuild the isolated action/food audition. Never writes game audio or item data.

python scripts/assets/build-action-audio-review.py --cache /tmp/audio-actions-research
Source files, archive members, licenses and exact cut/mix recipes are pinned in
action-audio-sources.json. Only constant gain, cuts, scheduled layering and 4 ms
cut-edge ramps are applied. No generated sounds, EQ, pitch or time stretching.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/audio-review/actions'
SR = 44100


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(args, data=None):
    return subprocess.check_output(['ffmpeg', '-v', 'error', *args], input=data)


def decode(path):
    data = run(['-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(data, dtype='<f4').reshape(-1, 2).copy()


def active_gain(a):
    peak = float(np.max(np.abs(a)))
    # Fixed gain only. Active RMS avoids amplifying long recording-room silences.
    active = a[np.abs(a) >= max(peak * .04, .00001)]
    rms = float(np.sqrt(np.mean(active * active))) if len(active) else 0
    return min(.065 / max(rms, 1e-9), .88 / max(peak, 1e-9))


def encode(a, name, folder):
    data = run(['-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                '-c:a', 'flac', '-compression_level', '8', '-sample_fmt', 's32',
                '-f', 'flac', '-'], a.astype('<f4').tobytes())
    filename = name + '-' + sha(data)[:10] + '.flac'
    (OUT / folder / filename).write_bytes(data)
    return dict(url=folder + '/' + filename, sha256=sha(data), bytes=len(data),
                duration=round(len(a) / SR, 6), peak=round(float(np.max(np.abs(a))), 6))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    recipe = json.loads((ROOT / 'scripts/assets/action-audio-sources.json').read_text())
    for folder in ['audio', 'originals', 'licenses']:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    arrays, sources, checked_archives = {}, {}, set()
    for sid, source in recipe['sources'].items():
        entry = dict(source)
        path = args.cache / source['path']
        if source.get('archive'):
            archive_path = args.cache / source['archive']
            if source['archive'] not in checked_archives:
                assert sha(archive_path.read_bytes()) == source['archiveSha256'], sid
                checked_archives.add(source['archive'])
            if not path.exists():
                if archive_path.suffix == '.7z':
                    import py7zr
                    with py7zr.SevenZipFile(archive_path) as archive:
                        archive.extract(path.parent.parent, targets=[source['member']])
                else:
                    with zipfile.ZipFile(archive_path) as archive:
                        data = archive.read(source['member'])
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(data)
        assert sha(path.read_bytes()) == source['sourceSha256'], sid
        original = decode(path)
        # Apply a single safety gain if floating/decoded originals exceed full scale.
        # Nothing is clipped when making the full-length FLAC reference.
        safety = min(1, .97 / max(float(np.max(np.abs(original))), 1e-9))
        entry.update(encode(original * safety, sid, 'originals'))
        entry['referenceSafetyGain'] = safety
        entry['previewGain'] = active_gain(original * safety)
        arrays[sid] = original
        sources[sid] = entry

    groups = []
    for category in recipe['groups']:
        group = dict(category)
        group['candidates'] = []
        assert len(category['candidates']) == 5
        for candidate in category['candidates']:
            item = dict(candidate)
            source_ids = {p['source'] for v in candidate['versions'] for p in v['parts']}
            licenses = {sources[s]['license'] for s in source_ids}
            item['license'] = ('CC-BY-SA-3.0' if 'CC-BY-SA-3.0' in licenses else
                               ' + '.join(sorted(licenses)))
            item['versions'] = []
            for version in candidate['versions']:
                length = int(round(version['duration'] * SR))
                mixed = np.zeros((length, 2), dtype=np.float32)
                physical = mixed.copy()
                parts = []
                for part in version['parts']:
                    p = dict(part)
                    original = arrays[p['source']]
                    start = int(round(p.get('start', 0) * SR))
                    end = start + int(round(p['length'] * SR))
                    assert 0 <= start < end <= len(original) + 2, (candidate['id'], p)
                    clip = original[start:min(end, len(original))].copy()
                    # Tiny cut-boundary ramps avoid introducing a click in an edit;
                    # source references above remain full length without these ramps.
                    ramp = min(round(.004 * SR), len(clip) // 2)
                    if ramp:
                        clip[:ramp] *= np.linspace(0, 1, ramp)[:, None]
                        clip[-ramp:] *= np.linspace(1, 0, ramp)[:, None]
                    gain = active_gain(clip) * p.get('level', 1)
                    clip *= gain
                    at = int(round(p.get('at', 0) * SR))
                    assert at >= 0 and at + len(clip) <= length + 2, (candidate['id'], p)
                    available = min(len(clip), length - at)
                    mixed[at:at + available] += clip[:available]
                    if '恢复' not in p.get('label', ''):
                        physical[at:at + available] += clip[:available]
                    p['gain'] = gain
                    parts.append(p)
                assert np.isfinite(mixed).all() and np.max(np.abs(mixed)) > .002
                final_gain = active_gain(mixed)
                mixed *= final_gain
                assert np.max(np.abs(mixed)) <= .881
                info = encode(mixed, candidate['id'] + '-' + version['id'], 'audio')
                info.update(id=version['id'], name=version['name'], parts=parts,
                            finalGain=final_gain)
                if any('恢复' in p.get('label', '') for p in parts):
                    physical *= active_gain(physical)
                    info['physical'] = encode(physical, candidate['id'] + '-' + version['id'] + '-physical', 'audio')
                item['versions'].append(info)
            group['candidates'].append(item)
        groups.append(group)
    manifest = dict(version=1, previewOnly=True, installedToGame=False,
                    date=recipe['date'], processing=recipe['processing'],
                    sourcePacks=recipe['sourcePacks'], research=recipe['research'],
                    sources=sources, groups=groups)
    (OUT / 'manifest-v1.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    for folder in ['originals', 'audio']:
        used = {s['url'] for s in sources.values()} if folder == 'originals' else {
            v['url'] for g in groups for c in g['candidates'] for v in c['versions']}
        if folder == 'audio':
            used.update(v['physical']['url'] for g in groups for c in g['candidates'] for v in c['versions'] if 'physical' in v)
        for path in (OUT / folder).glob('*.flac'):
            if folder + '/' + path.name not in used:
                path.unlink()
    print(f'{len(groups)} categories, {sum(len(g["candidates"]) for g in groups)} candidates, '
          f'{len(sources)} source recordings. Game audio untouched.')


if __name__ == '__main__':
    main()
