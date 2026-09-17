"""Explicit collider sync; manual collider edits are preserved and reported, never guessed away."""
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import collections, objects, signature

def generate():
    col = collections()['COLLISION']
    for obj in objects('GEO_'):
        if not obj.get('solid', False):
            continue
        name = 'COL_' + obj.name[4:]
        collider = bpy.data.objects.get(name)
        if collider and collider.get('_generated_signature') != signature(collider):
            print('Preserved manually edited collider:', name)
            continue
        if collider:
            bpy.data.objects.remove(collider, do_unlink=True)
        collider = bpy.data.objects.new(name, obj.data.copy())
        col.objects.link(collider)
        collider.matrix_world = obj.matrix_world.copy()
        collider['render_id'] = obj.name
        collider['collision'] = obj.get('collision_shape', 'box')
        collider['walkable'] = bool(obj.get('walkable', False))
        collider['layer'] = 'WORLD_STATIC'
        collider['_source_signature'] = signature(obj)
        collider.display_type = 'WIRE'
        collider.hide_render = True
        bpy.context.view_layer.update()
        collider['_generated_signature'] = signature(collider)

if __name__ == '__main__':
    from common import level_paths
    import shutil
    from datetime import datetime, timezone
    source, _ = level_paths()
    backup = source / 'backups' / ('collision-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f') + '.blend')
    backup.parent.mkdir(exist_ok=True)
    shutil.copy2(bpy.data.filepath, backup)
    generate()
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
