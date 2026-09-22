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
parser.add_argument('--prune', action='store_true',
                    help='On --update, remove recipe objects deleted from the recipe if unedited.')
args = parser.parse_args(arguments())
if args.prune and not args.update:
    raise RuntimeError('--prune requires --update and its automatic backup.')
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
if args.prune:
    wanted = {spec['id'] for spec in recipe['objects']}
    for obsolete in list(scene.objects):
        if obsolete.get('_recipe_id') and obsolete['_recipe_id'] not in wanted:
            if obsolete.get('_generated_signature') != signature(obsolete):
                preserved.append(obsolete.name)
                continue
            collider = bpy.data.objects.get('COL_' + obsolete.name[4:]) if obsolete.name.startswith('GEO_') else None
            if collider and collider.get('_generated_signature') == signature(collider):
                bpy.data.objects.remove(collider, do_unlink=True)
            bpy.data.objects.remove(obsolete, do_unlink=True)
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
        if spec['kind'] == 'polyline_strip':
            points = spec['points']
            width, height = spec['width'], spec['height']
            offset, base = spec.get('offset', 0), spec.get('baseHeight', 0)
            if len(points) < 2 or width <= 0 or height <= 0:
                raise ValueError(f'Invalid polyline strip: {spec["id"]}')
            vertices, faces = [], []
            for index, point in enumerate(points):
                before = points[max(0, index-1)]
                after = points[min(len(points)-1, index+1)]
                previous = (point[0]-before[0], point[1]-before[1]) if index else (after[0]-point[0], after[1]-point[1])
                following = (after[0]-point[0], after[1]-point[1]) if index < len(points)-1 else previous
                def unit_normal(delta):
                    length = math.hypot(*delta)
                    if length < 1e-6:
                        raise ValueError(f'Repeated polyline point: {spec["id"]}')
                    return (delta[1]/length, -delta[0]/length)
                left, right = unit_normal(previous), unit_normal(following)
                tangent = (left[0]+right[0], left[1]+right[1])
                tangent_length = math.hypot(*tangent)
                if tangent_length < 1e-6:
                    raise ValueError(f'Polyline reverses direction: {spec["id"]}')
                tangent = (tangent[0]/tangent_length, tangent[1]/tangent_length)
                miter = 1 / max(.3, tangent[0]*left[0]+tangent[1]*left[1])
                for side, level in ((-1,0),(1,0),(-1,1),(1,1)):
                    distance = (offset + side*width/2)*miter
                    vertices.append((point[0]+tangent[0]*distance,
                                     point[1]+tangent[1]*distance,
                                     point[2]+base+level*height))
                if index:
                    a, b = (index-1)*4, index*4
                    faces.extend(((a+2,a+3,b+3,b+2),(a,b,b+1,a+1),
                                  (a,b,b+2,a+2),(a+1,a+3,b+3,b+1)))
            last = (len(points)-1)*4
            faces.extend(((0,2,3,1),(last,last+1,last+3,last+2)))
        elif spec['kind'] == 'box':
            sx, sy, sz = [v / 2 for v in spec['size']]
            vertices = [(x*sx,y*sy,z*sz) for x,y,z in
                        [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
            faces = [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
            faces = [tuple(reversed(face)) for face in faces]
        else:
            raise ValueError(f'Unsupported recipe object kind: {spec["kind"]}')
        mesh = bpy.data.meshes.new(spec['id'] + '_mesh')
        mesh.from_pydata(vertices, [], faces)
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
