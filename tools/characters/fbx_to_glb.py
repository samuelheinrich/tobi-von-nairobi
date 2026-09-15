#!/usr/bin/env python3

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from blender_common import parse_paths, export_new, reset_scene, summary, check_operator, copied_fbx


def import_fbx(input_path: Path):
    check_operator(bpy.ops.import_scene.fbx(
        filepath=str(input_path),
        use_anim=True,
        automatic_bone_orientation=False,
        use_image_search=False,
    ))


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


def export_glb(output_path: Path):
    select_export_objects()

    check_operator(bpy.ops.export_scene.gltf(
        filepath=str(output_path),

        # Eine einzelne binäre GLB-Datei erzeugen
        export_format="GLB",

        use_selection=True,

        # Mesh
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",

        # Skinning / Skeleton
        export_skins=True,
        export_all_influences=False,

        # Animationen
        export_animations=True,
        export_frame_range=False,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,

        # Shape Keys / Morph Targets behalten,
        # sofern im FBX vorhanden
        export_morph=True,
        export_morph_normal=True,

        # Keine Kameras/Lichter
        export_cameras=False,
        export_lights=False,

        # Y-Up ist glTF-Standard
        export_yup=True,
    ))


def main():
    input_path, output_path = parse_paths(".fbx", ".glb")

    print(f"Importiere FBX: {input_path}")

    reset_scene()
    with copied_fbx(input_path) as working_input:
        import_fbx(working_input)
        # Pack embedded/external images before the disposable extraction directory disappears.
        for image in bpy.data.images:
            if image.has_data and image.source == "FILE":
                image.pack()

    print("\nAnalyse nach Import:")
    summary()

    print(f"\nExportiere GLB: {output_path}")

    export_new(input_path, output_path, export_glb)

    print("\nFertig.")
    print(f"GLB: {output_path}")


if __name__ == "__main__":
    main()
