"""Cheap local tests for the no-overwrite boundary; no Blender startup needed."""
import contextlib
import importlib.util
import io
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("conversion", Path(__file__).parents[1] / "blender_common.py")
conversion = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"bpy": types.SimpleNamespace(app=types.SimpleNamespace(background=True, version_string="test"))}):
    spec.loader.exec_module(conversion)


class ConversionPaths(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.source = self.folder / "original.glb"
        self.source.write_bytes(b"ORIGINAL")
        self.target = self.folder / "new.fbx"

    def parse(self, target):
        with patch.object(sys, "argv", ["blender", "--", str(self.source), str(target)]):
            with contextlib.redirect_stderr(io.StringIO()):
                return conversion.parse_paths(".glb", ".fbx")

    def test_accepts_new_path_without_creating_output(self):
        source, target = self.parse(self.folder / "new folder" / "new.fbx")
        self.assertEqual(source, self.source)
        self.assertFalse(target.parent.exists())

    def test_rejects_existing_file_and_keeps_bytes(self):
        self.target.write_bytes(b"KEEP")
        with self.assertRaises(SystemExit):
            self.parse(self.target)
        self.assertEqual(self.target.read_bytes(), b"KEEP")

    def test_rejects_dangling_symlink_and_wrong_extension(self):
        self.target.symlink_to(self.folder / "absent.fbx")
        with self.assertRaises(SystemExit):
            self.parse(self.target)
        with self.assertRaises(SystemExit):
            self.parse(self.folder / "mistyped.glb")

    def test_export_failure_leaves_no_partial_output(self):
        def failed(path):
            path.write_bytes(b"PARTIAL")
            raise RuntimeError("export failed")
        with self.assertRaises(RuntimeError):
            conversion.export_new(self.source, self.target, failed)
        self.assertFalse(self.target.exists())
        self.assertEqual(self.source.read_bytes(), b"ORIGINAL")
        self.assertFalse(list(self.folder.glob(".character-export-*")))

    def test_concurrent_output_is_never_replaced(self):
        def concurrent(path):
            path.write_bytes(b"GENERATED")
            self.target.write_bytes(b"OTHER PROCESS")
        with patch.object(conversion, "summary", return_value={}):
            with self.assertRaises(FileExistsError):
                conversion.export_new(self.source, self.target, concurrent)
        self.assertEqual(self.target.read_bytes(), b"OTHER PROCESS")
        self.assertFalse(self.target.with_name(self.target.name + ".conversion.json").exists())


if __name__ == "__main__":
    unittest.main()
