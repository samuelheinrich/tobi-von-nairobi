"""Bakes a normal map from a high-poly GLB onto its reduced counterpart.

Optional extra step after `reduce.mjs`. Worth it when the source ships no normal map of its own —
most Sketchfab sculpts do not — because then every bit of surface detail lives in geometry the
decimation throws away. Skip it for models that already have one; theirs survives untouched.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        -P tools/models/bake-normals.py -- models/nina-dancer.glb models/nina-dancer-game.glb \
        /tmp/nina-normal.png 2048

The result is a PNG next to whatever path is given. Wiring it into the material is a manual step
in Blender — this script only produces the map, because re-exporting the GLB from Blender would
undo the WebP textures and the attribute cleanup `reduce.mjs` did.
"""
import bpy
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
if len(args) < 3:
    raise SystemExit('Aufruf: -- <high.glb> <low.glb> <out.png> [groesse=2048]')
HIGH, LOW, OUT = args[0], args[1], args[2]
SIZE = int(args[3]) if len(args) > 3 else 2048

bpy.ops.wm.read_factory_settings(use_empty=True)


def import_one(path, name):
    """Imports a GLB and flattens it to a single object; Sketchfab nests meshes under empties."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in set(bpy.data.objects) - before if o.type == 'MESH']
    if not new:
        raise SystemExit(f'{path}: kein Mesh gefunden')
    bpy.ops.object.select_all(action='DESELECT')
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    bpy.ops.object.select_all(action='DESELECT')
    return obj


high = import_one(HIGH, 'HIGH')
low = import_one(LOW, 'LOW')
print(f'HIGH: {len(high.data.vertices):,} verts')
print(f'LOW : {len(low.data.vertices):,} verts, UV={[u.name for u in low.data.uv_layers]}')
if not low.data.uv_layers:
    raise SystemExit('Das reduzierte Mesh hat keine UV-Koordinaten; backen unmöglich.')

image = bpy.data.images.new('baked_normal', SIZE, SIZE, alpha=False, is_data=True)
image.generated_color = (0.5, 0.5, 1.0, 1.0)
material = low.data.materials[0]
node = material.node_tree.nodes.new('ShaderNodeTexImage')
node.image = image
material.node_tree.nodes.active = node

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = True
    scene.cycles.device = 'GPU'
    print('Cycles auf GPU')
except Exception as exc:  # noqa: BLE001 — any GPU problem just means CPU baking
    print('Cycles bleibt auf CPU:', exc)

scene.cycles.samples = 1
scene.cycles.use_denoising = False
bake = scene.render.bake
bake.use_selected_to_active = True
bake.cage_extrusion = 0.02
bake.max_ray_distance = 0.05
bake.margin = 8
bake.use_clear = True

bpy.ops.object.select_all(action='DESELECT')
high.select_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low

print(f'Backe {SIZE}² …')
bpy.ops.object.bake(type='NORMAL')
image.filepath_raw = OUT
image.file_format = 'PNG'
image.save()
print(f'gespeichert: {OUT} ({os.path.getsize(OUT) // 1024} KiB)')
