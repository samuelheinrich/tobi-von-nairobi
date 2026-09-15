"""Shared, offline Blender conversion helpers. Output publishing never replaces a file."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

import bpy


def parse_paths(source_suffix, target_suffix):
    parser = argparse.ArgumentParser(description="Non-destructive character conversion (Blender background).")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    if "--" not in sys.argv:
        parser.error("Expected: blender --background --python SCRIPT -- input output")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    # Do not resolve output symlinks away: even a dangling symlink counts as an existing output.
    source = args.input.expanduser().absolute()
    target = args.output.expanduser().absolute()
    if source.suffix.lower() != source_suffix or target.suffix.lower() != target_suffix:
        parser.error(f"Expected {source_suffix} input and {target_suffix} output")
    if not source.is_file():
        parser.error(f"Input not found: {source}")
    if source.resolve() == target.resolve() or os.path.lexists(target):
        parser.error(f"Output already exists or equals input; choose a new filename: {target}")
    report = target.with_name(target.name + ".conversion.json")
    if os.path.lexists(report):
        parser.error(f"Conversion report already exists: {report}")
    if not bpy.app.background:
        parser.error("Run in --background mode, not inside an open Blender project")
    return source, target


def check_operator(result):
    if "FINISHED" not in result:
        raise RuntimeError(f"Blender operation did not finish: {result}")


def reset_scene():
    # A background factory scene keeps the caller's .blend/user startup content out of exports.
    bpy.ops.wm.read_factory_settings(use_empty=True)


def summary():
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    armatures = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    if not meshes:
        raise ValueError("No mesh found. For the character workflow download FBX With Skin.")
    triangles = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            triangles += len(mesh.loop_triangles)
        finally:
            evaluated.to_mesh_clear()
    result = {
        "meshes": len(meshes), "triangles": triangles,
        "armatures": [{"name": a.name, "bones": len(a.data.bones)} for a in armatures],
        "actions": [{"name": a.name, "frames": list(a.frame_range)} for a in bpy.data.actions],
    }
    print(json.dumps(result, indent=2))
    return result


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def prepare_textures(directory):
    """Materialise packed GLB textures as PNGs in staging so FBX can embed their bytes.
    This edits only imported in-memory images, never original image files."""
    for index, image in enumerate(bpy.data.images):
        if image.type != "IMAGE" or not image.has_data:
            continue
        image.filepath_raw = str(directory / f"texture-{index}.png")
        image.file_format = "PNG"
        image.save()
        image.filepath = image.filepath_raw
        # FBX reads the temporary external PNG; don't leave stale packed WebP bytes.
        if image.packed_file:
            image.unpack(method="REMOVE")


@contextmanager
def copied_fbx(source):
    """FBX image extraction must not write next to the owner's source download."""
    with tempfile.TemporaryDirectory(prefix="tobi-fbx-import-") as directory:
        work = Path(directory) / source.name
        shutil.copyfile(source, work)
        # Standard sibling texture sidecar, if the download is not fully embedded.
        sidecar = source.with_suffix(".fbm")
        if sidecar.is_dir():
            shutil.copytree(sidecar, work.with_suffix(".fbm"))
        yield work


def export_new(source, target, exporter):
    before = sha256(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    report_path = target.with_name(target.name + ".conversion.json")
    # Keep staging on the destination volume; exclusive hard-link publication is atomic
    # and fails even if another process creates the target while Blender is exporting.
    with tempfile.TemporaryDirectory(prefix=".character-export-", dir=target.parent) as directory:
        working = Path(directory) / target.name
        exporter(working)
        if not working.is_file() or working.stat().st_size == 0:
            raise RuntimeError("Exporter did not produce a nonempty output")
        if before != sha256(source):
            raise RuntimeError("Source changed during conversion; output not published")
        report = {
            "blender": bpy.app.version_string,
            "source": str(source), "output": str(target),
            "sourceSha256": before, "outputSha256": sha256(working),
            "scene": summary(), "conversion": source.suffix.lower() + " -> " + target.suffix.lower(),
            "note": "Local format conversion only. Mixamo rigging and visual validation are manual.",
        }
        temporary_report = Path(directory) / "conversion.json"
        temporary_report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        # Link the report first, then publish the file. On output collision remove only our report.
        os.link(temporary_report, report_path)
        try:
            os.link(working, target)
        except BaseException:
            report_path.unlink()
            raise
    print(f"Created new output: {target}\nReport: {report_path}")
