"""Small project contract for editing the open level through Blender MCP.

MCP handles live inspection and scene edits. This module keeps those edits inside an
editable level master and reuses the existing collider/validator code. GLB export stays
a separate background command against the saved master.
"""

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import shutil

import bpy

from common import ROOT, objects, signature
from generate_collision import generate
from validate_level import validate


def _master():
    path = Path(bpy.data.filepath).resolve() if bpy.data.filepath else None
    levels = (ROOT / 'assets/blender/levels').resolve()
    if not path or not path.is_file() or path.parent.parent != levels or path.stem != path.parent.name:
        raise ValueError('Open a saved assets/blender/levels/<id>/<id>.blend master first.')
    if bpy.context.scene.get('level_id') != path.stem:
        raise ValueError('Open scene level_id does not match the master filename.')
    return path


def inspect_live():
    """Read the currently open scene, including unsaved edits, without writing files."""
    master = _master()
    render, colliders, markers = objects('GEO_'), objects('COL_'), objects('MARK_')
    edited = [obj.name for obj in render + colliders + markers
              if obj.get('_generated_signature') and obj['_generated_signature'] != signature(obj)]
    stale = [col.name for col in colliders
             if (source := bpy.data.objects.get(col.get('render_id', ''))) is None
             or (col.get('_source_signature') and col['_source_signature'] != signature(source))]
    return {
        'levelId': master.stem,
        'master': str(master),
        'counts': {'render': len(render), 'colliders': len(colliders), 'markers': len(markers)},
        'collections': dict(Counter(c.name for obj in render + colliders + markers
                                    for c in obj.users_collection)),
        'editedObjects': edited,
        'staleColliders': stale,
        'routeMarkers': [obj.name for obj in markers if obj.get('type') == 'vehicle_route'],
    }


def validate_live():
    """Run the same validator against unsaved GUI geometry, with no report write."""
    _master()
    return validate(save=False)


def sync_colliders_live():
    """Refresh generated colliders in memory; manually edited colliders stay untouched."""
    _master()
    generate()
    return inspect_live()


def save_master_with_backup():
    """Back up the master before explicitly saving the current GUI scene."""
    master = _master()
    backup = master.parent / 'backups' / (
        'mcp-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f') + '.blend')
    backup.parent.mkdir(exist_ok=True)
    shutil.copy2(master, backup)
    bpy.ops.wm.save_as_mainfile(filepath=str(master))
    return {'master': str(master), 'backup': str(backup), 'validation': validate(save=False)['status']}
