"""Composes one character from the Quaternius Universal Base Characters kit (CC0).

The kit ships two base bodies and a set of head pieces, all on the same 65-joint Unreal-style
skeleton, so any hairstyle fits any body. This script picks one combination and writes a single
GLB the game can load.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      -P tools/characters/build-quaternius.py -- \
      --pack "models/Universal Base Characters[Standard]" \
      --body female --skin light --hair Hair_Long --brows Eyebrows_Female \
      --out models/work/quaternius/woman-long-light.glb

`--beard` adds Hair_Beard, `--hair none` leaves the head bald. The pack has no animations and no
clothing: these are underwear base bodies, fit for beach and club roles, not for a uniform.
"""
import bpy
import os
import sys


def parse(argv):
    args = argv[argv.index('--') + 1:]
    out = {'hair': 'none', 'brows': 'none', 'beard': False, 'skin': 'light', 'body': 'female'}
    i = 0
    while i < len(args):
        key = args[i].lstrip('-')
        if key == 'beard':
            out['beard'] = True
            i += 1
            continue
        out[key] = args[i + 1]
        i += 2
    for required in ('pack', 'out'):
        if required not in out:
            raise SystemExit(f'--{required} fehlt')
    return out


opts = parse(sys.argv)
PACK = opts['pack']
BODIES = os.path.join(PACK, 'Base Characters', 'Godot - UE')
HEADS = os.path.join(PACK, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)')
TEXTURES = os.path.join(PACK, 'Base Characters', 'Textures')

bpy.ops.wm.read_factory_settings(use_empty=True)


def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in set(bpy.data.objects) - before]


body_file = 'Superhero_Female_FullBody' if opts['body'] == 'female' else 'Superhero_Male_FullBody'
body_objects = import_gltf(os.path.join(BODIES, body_file + '.gltf'))
armature = next(o for o in body_objects if o.type == 'ARMATURE')
print(f'Körper: {body_file}, Armature {armature.name}, {len(armature.data.bones)} Bones')

# The kit's glTF files point at "<name>_png.png" variants that are not in the folder. Relink every
# missing image to the real file, which lives one level up under Textures/.
search = [TEXTURES, BODIES, HEADS, os.path.join(TEXTURES, 'Normals Unity - Godot')]
for image in bpy.data.images:
    if image.name == 'Render Result' or image.has_data:
        continue
    stem = os.path.splitext(os.path.basename(image.filepath or image.name))[0]
    for candidate in (stem, stem.replace('_png', '')):
        for folder in search:
            guess = os.path.join(folder, candidate + '.png')
            if os.path.exists(guess):
                image.filepath = guess
                image.reload()
                print(f'  Textur neu verknüpft: {image.name} → {os.path.basename(guess)}')
                break
        if image.has_data:
            break

# Skin tone: the kit ships a light and a dark base colour per body.
tone = 'Dark' if opts['skin'] == 'dark' else 'Light'
skin_names = {
    ('female', 'Light'): 'T_Superhero_Female_Light_BaseColor.png',
    ('female', 'Dark'): 'T_Superhero_Female_Dark_BaseColor.png',
    ('male', 'Light'): 'T_Superhero_Male_Ligh.png',
    ('male', 'Dark'): 'T_Superhero_Male_Dark.png',
}
skin_file = os.path.join(TEXTURES, skin_names[(opts['body'], tone)])
if os.path.exists(skin_file):
    skin = bpy.data.images.load(skin_file, check_existing=True)
    for material in bpy.data.materials:
        if 'Superhero' not in material.name:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image and 'BaseColor' in (node.image.name or ''):
                node.image = skin
        # Also catch the node feeding Base Color directly.
        bsdf = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        link = bsdf.inputs['Base Color'].links[0] if bsdf and bsdf.inputs['Base Color'].links else None
        if link and link.from_node.type == 'TEX_IMAGE':
            link.from_node.image = skin
    print(f'  Hautton: {os.path.basename(skin_file)}')

# Head pieces ride the same skeleton, so they only need re-parenting to this body's armature.
pieces = [name for name in (opts['hair'], opts['brows']) if name and name != 'none']
if opts['beard']:
    pieces.append('Hair_Beard')
for piece in pieces:
    path = os.path.join(HEADS, piece + '.gltf')
    if not os.path.exists(path):
        print(f'  ÜBERSPRUNGEN, nicht im Pack: {piece}')
        continue
    added = import_gltf(path)
    for obj in added:
        if obj.type == 'MESH':
            obj.parent = armature
            for modifier in obj.modifiers:
                if modifier.type == 'ARMATURE':
                    modifier.object = armature
        elif obj.type == 'ARMATURE' and obj is not armature:
            bpy.data.objects.remove(obj, do_unlink=True)
    print(f'  Kopfteil: {piece}')

# Drop anything orphaned by removing the duplicate armatures.
for obj in [o for o in bpy.data.objects if o.type == 'EMPTY' and not o.children]:
    bpy.data.objects.remove(obj, do_unlink=True)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
tris = 0
for mesh in meshes:
    mesh.data.calc_loop_triangles()
    tris += len(mesh.data.loop_triangles)
print(f'Ergebnis: {len(meshes)} Meshes, {tris:,} Dreiecke')

os.makedirs(os.path.dirname(os.path.abspath(opts['out'])), exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=opts['out'],
    export_format='GLB',
    export_skins=True,
    export_animations=False,
    export_yup=True,
    export_image_format='JPEG',
    export_jpeg_quality=90,
)
print(f'geschrieben: {opts["out"]} ({os.path.getsize(opts["out"]) // 1024} KiB)')
