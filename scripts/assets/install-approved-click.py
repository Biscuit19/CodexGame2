#!/usr/bin/env python3
"""Install the explicitly selected SC1 without touching the user's gain configuration."""
from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[2];P=R/'public/audio-review/soft-clicks';G=R/'src/assets/audio'
m=json.loads((P/'manifest-v1.json').read_text());c=next(c for g in m['groups'] for c in g['candidates'] if c['id']=='SC1');p=P/c['audio']['url'];assert hashlib.sha256(p.read_bytes()).hexdigest()==c['audio']['sha256'];shutil.copyfile(p,G/'click.flac')
a=dict(date='2026-10-24',choice=c,processing='Byte-identical approved SC1 audition; playback gain comes from uploaded JSON',sha256=c['audio']['sha256']);(G/'approved-click.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
s=json.loads((G/'sources.json').read_text());s['approvedClick']={'metadata':'approved-click.json','choice':'SC1','sha256':c['audio']['sha256']};(G/'sources.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
print('Installed SC1 (exact approved audition bytes); volume configuration preserved')
