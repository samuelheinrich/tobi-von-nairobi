"""Blender background --python tools/blender/inspect_level.py (with saved .blend opened)."""
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import objects, props, bounds
print(json.dumps({'master':bpy.data.filepath,'blenderVersion':bpy.app.version_string,
 'objects':[{'name':o.name,'collections':[c.name for c in o.users_collection],
             'bounds':bounds(o) if o.type=='MESH' else None,'properties':props(o)}
            for o in objects('GEO_')+objects('COL_')+objects('MARK_')]},indent=2))
