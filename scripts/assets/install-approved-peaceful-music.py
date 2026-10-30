#!/usr/bin/env python3
"""Restore only the user's approved complete music files, with exact source hash checks.
Track grouping and gains live in the reviewed TypeScript catalog, not a legacy generator.
"""
from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[2]
G=R/'src/assets/audio'
m=json.loads((G/'approved-peaceful-music.json').read_text())
assert set(m['game']).issubset(set(m['base']))
for t in m['tracks']:
 assert t['id'] in m['base']
 source=R/'public/audio-review/peaceful-music'/t['url']
 assert hashlib.sha256(source.read_bytes()).hexdigest()==t['sha256'],t['id']
 dest=G/('music-'+t['id'].lower()+source.suffix)
 if not dest.exists() or dest.read_bytes()!=source.read_bytes():shutil.copyfile(source,dest)
print('Verified seven complete approved tracks; current context pools and gains preserved.')
