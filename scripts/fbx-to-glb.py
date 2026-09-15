#!/usr/bin/env python3
"""Compatibility entrypoint; maintained implementation lives in tools/characters."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[1] / "tools/characters/fbx_to_glb.py"), run_name="__main__")
