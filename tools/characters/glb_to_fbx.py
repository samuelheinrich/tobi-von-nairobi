#!/usr/bin/env python3

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from blender_common import parse_paths, export_new, reset_scene, summary, check_operator, prepare_textures


def import_glb(input_path: Path):
    check_operator(bpy.ops.import_scene.gltf(filepath=str(input_path)))


def select_export_objects():
    bpy.ops.object.select_all(action="DESELECT")

    export_objects = []

    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "ARMATURE", "EMPTY"}:
            obj.select_set(True)
            export_objects.append(obj)

    if export_objects:
        bpy.context.view_layer.objects.active = export_objects[0]

    return export_objects


def export_fbx(output_path: Path):
    select_export_objects()
    prepare_textures(output_path.parent)

    check_operator(bpy.ops.export_scene.fbx(
        filepath=str(output_path),

        use_selection=True,

        # Mixamo / allgemeine Character-Kompatibilität
        axis_forward="-Z",
        axis_up="Y",

        # Transform
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_ALL",
        bake_space_transform=False,

        # Mesh
        use_mesh_modifiers=True,
        mesh_smooth_type="FACE",

        # Armature
        add_leaf_bones=False,
        use_armature_deform_only=False,

        # Animationen mitnehmen, falls vorhanden
        bake_anim=True,
        bake_anim_use_all_bones=True,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=True,

        # Texturen möglichst einbetten
        path_mode="COPY",
        embed_textures=True,
    ))


def main():
    input_path, output_path = parse_paths(".glb", ".fbx")

    print(f"Importiere: {input_path}")

    reset_scene()
    import_glb(input_path)
    summary()

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]

    print(f"Meshes: {len(meshes)}")
    print(f"Armatures: {len(armatures)}")

    # Import/export axis conversion preserves mesh/armature bind relationships.
    # Never apply mesh-only transforms to an existing rig.

    print(f"Exportiere: {output_path}")
    export_new(input_path, output_path, export_fbx)

    print("Fertig.")
    print(f"FBX: {output_path}")


if __name__ == "__main__":
    main()
