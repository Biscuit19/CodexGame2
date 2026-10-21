#!/usr/bin/env python3
"""Build the user-approved gun audio. Existing Foley recordings stay untouched.
The rejected pre-selection weapon synthesis lives only in Git history.
"""
from pathlib import Path
import subprocess
import sys

subprocess.run([
    sys.executable,
    str(Path(__file__).with_name("build-selected-audio.py")),
    "--install-game",
], check=True)
