"""Create an editable master; --update only regenerates untouched recipe objects."""
import argparse
import json
import math
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import arguments, collections, signature
from generate_collision import generate

parser = argparse.ArgumentParser()
parser.add_argument('recipe')
parser.add_argument('--update', action='store_true')
args = parser.parse_args(arguments())
recipe_path = Path(args.recipe).resolve()
recipe = json.loads(recipe_path.read_text())
if recipe.get('blenderVersion', bpy.app.version_string) != bpy.app.version_string:
    raise RuntimeError('Recipe Blender version mismatch; use the pinned version or review the recipe upgrade.')
master = recipe_path.with_name(recipe['id'] + '.blend')
if master.exists():
    if not args.update:
        raise RuntimeError('Master already exists. Open it in Blender, or explicitly use --update (backup + preserve edits).')
    backup = master.parent / 'backups' / (master.stem + '-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f') + '.blend')
    backup.parent.mkdir(exist_ok=True)
    shutil.copy2(master, backup)
    bpy.ops.wm.open_mainfile(filepath=str(master))
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
cols = collections()
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
scene['level_id'] = recipe['id']
scene['world_dimensions'] = recipe['worldDimensions']
scene['seed'] = recipe['seed']
scene['pipeline_version'] = 1
scene['blender_version'] = bpy.app.version_string
materials = {}
for name, color in recipe['materials'].items():
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1)
        mat.use_nodes = True
        node = mat.node_tree.nodes.get('Principled BSDF')
        node.inputs['Base Color'].default_value = (*color, 1)
        node.inputs['Roughness'].default_value = 0.85
    materials[name] = mat
preserved = []
for spec in recipe['objects']:
    existing = bpy.data.objects.get(spec['id'])
    if existing:
        if existing.get('_generated_signature') != signature(existing):
            preserved.append(existing.name)
            continue
        bpy.data.objects.remove(existing, do_unlink=True)
    if spec['kind'] == 'marker':
        obj = bpy.data.objects.new(spec['id'], None)
        obj.empty_display_type = 'ARROWS'
        obj.empty_display_size = 0.5
    else:
        sx, sy, sz = [v / 2 for v in spec['size']]
        vertices = [(x*sx,y*sy,z*sz) for x,y,z in
                    [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        faces = [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
        mesh = bpy.data.meshes.new(spec['id'] + '_mesh')
        mesh.from_pydata(vertices, [], [tuple(reversed(face)) for face in faces])
        mesh.update()
        obj = bpy.data.objects.new(spec['id'], mesh)
        obj.data.materials.append(materials[spec['material']])
    cols[spec['collection']].objects.link(obj)
    obj.location = spec['position']
    obj.rotation_euler = [math.radians(v) for v in spec.get('rotation', [0,0,0])]
    for key, value in spec.get('properties', {}).items():
        obj[key] = value
    obj['_recipe_id'] = spec['id']
    bpy.context.view_layer.update()
    obj['_generated_signature'] = signature(obj)
generate()
# Wireframe collision is easy to inspect in the GUI, never part of the visual GLB.
cols['COLLISION'].hide_render = True
for obj in cols['COLLISION'].objects:
    obj.hide_set(True)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.clip_end = 250
            area.spaces.active.shading.color_type = 'MATERIAL'
            area.spaces.active.region_3d.view_distance = 65
bpy.ops.wm.save_as_mainfile(filepath=str(master))
print(json.dumps({'master': str(master), 'objects': len(scene.objects), 'preservedManualEdits': preserved}))
