"""Splits a GLB that holds several rigged characters into one GLB per character.

Showcase downloads often pack a dozen figures into a single file, each with its own armature, all
driven by one long animation. Nothing can use that as it stands: a character is one skeleton.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      -P tools/characters/split-characters.py -- <input.glb> <out-dir> [prefix]

Each armature is exported with its own meshes and whatever part of the animation drives its bones.
Files are named `<prefix>-01.glb` upward, in the order the armatures appear.
"""
import bpy
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
if len(args) < 2:
    raise SystemExit('Aufruf: -- <input.glb> <out-dir> [prefix]')
SRC, OUT = args[0], args[1]
PREFIX = args[2] if len(args) > 2 else 'character'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
print(f'{len(armatures)} Armatures gefunden')
if not armatures:
    raise SystemExit('Keine Armature im File')

os.makedirs(OUT, exist_ok=True)


def family(armature):
    """The armature plus every mesh skinned to it, plus its parent empties."""
    members = {armature}
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        skinned = any(m.type == 'ARMATURE' and m.object is armature for m in obj.modifiers)
        if skinned or obj.parent is armature:
            members.add(obj)
    # Carry the empties above it so the export keeps the original orientation.
    for obj in list(members):
        parent = obj.parent
        while parent is not None:
            members.add(parent)
            parent = parent.parent
    return members


written = []
for index, armature in enumerate(armatures, start=1):
    members = family(armature)
    meshes = [o for o in members if o.type == 'MESH']
    tris = 0
    for mesh in meshes:
        mesh.data.calc_loop_triangles()
        tris += len(mesh.data.loop_triangles)
    if not meshes:
        print(f'  {index:02d} übersprungen: keine Meshes an {armature.name}')
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in members:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    path = os.path.join(OUT, f'{PREFIX}-{index:02d}.glb')
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_yup=True,
        export_image_format='JPEG',
        export_jpeg_quality=88,
    )
    size = os.path.getsize(path) // 1024
    print(f'  {index:02d} {armature.name:22} {len(meshes)} Meshes  {tris:>7,} Tri  {size:>6} KiB')
    written.append(path)

print(f'{len(written)} Dateien geschrieben nach {OUT}')
