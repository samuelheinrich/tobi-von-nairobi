"""Bakes parent transforms into the mesh and armature data of a character GLB.

Sketchfab exports stand a Z-up model upright with a rotation on a wrapper node instead of rotating
the geometry. The runtime measures a character to scale it to a configured height, and on those
files it measures the wrong axis: four parade dancers ended up between 3,4 and 4,4 metres tall
against a configured 1,7 to 1,86.

Flattening removes the wrapper and leaves plain Y-up data, which is what the well-behaved models in
this project already look like.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      -P tools/characters/flatten-transforms.py -- <in.glb> <out.glb>
"""
import bpy
import os
import sys
from mathutils import Vector

SRC, OUT = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)


def bounds():
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            lo = Vector(min(lo[i], world[i]) for i in range(3))
            hi = Vector(max(hi[i], world[i]) for i in range(3))
    return hi - lo


print(f'vorher  Weltmasse: {tuple(round(v, 3) for v in bounds())}')

# Drop the wrapper empties, keeping every object exactly where it appears.
armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = armature
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for empty in [o for o in bpy.data.objects if o.type == 'EMPTY']:
    bpy.data.objects.remove(empty, do_unlink=True)

# Bake the rotation into the armature's rest pose and into the mesh data. Doing the armature on
# its own matters: applying a rotation to an armature object rewrites its edit bones, which is what
# puts the skeleton upright instead of leaving it on its side under a rotating parent.
for obj in [armature, *meshes]:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# Re-attach the meshes so the skin survives the export.
for mesh in meshes:
    mesh.parent = armature
    mesh.matrix_parent_inverse = armature.matrix_world.inverted()
    if not any(m.type == 'ARMATURE' for m in mesh.modifiers):
        mesh.modifiers.new('Armature', 'ARMATURE').object = armature
    for modifier in mesh.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.object = armature

bone = armature.pose.bones[0] if armature.pose.bones else None
print(f'Armature-Rotation nach dem Backen: {tuple(round(v, 3) for v in armature.rotation_euler)}')

print(f'nachher Weltmasse: {tuple(round(v, 3) for v in bounds())}')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_skins=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_yup=True,
    export_image_format='JPEG',
    export_jpeg_quality=88,
)
print(f'geschrieben: {OUT} ({os.path.getsize(OUT) // 1024} KiB)')
