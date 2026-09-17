"""Scene contract and coordinate conversion; authoring Z-up, Babylon GLTF AUTO left-handed."""
import json
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
# Blender -> glTF (x,z,-y), then Babylon AUTO mirrors glTF X.
BASIS = Matrix(((-1, 0, 0), (0, 0, 1), (0, -1, 0)))
COLLECTIONS = ('GEO_STATIC', 'GEO_DYNAMIC', 'COLLISION', 'BUILDINGS', 'INTERIORS',
               'PROPS', 'ROADS', 'ROOFS', 'STAIRS', 'RAILINGS', 'GAMEPLAY_MARKERS', 'EXPORT', 'DEBUG')

def arguments():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

def native(value):
    if hasattr(value, 'to_dict'):
        return {k: native(v) for k, v in value.to_dict().items()}
    if hasattr(value, 'to_list'):
        return [native(v) for v in value.to_list()]
    if isinstance(value, (list, tuple)):
        return [native(v) for v in value]
    return value

def props(obj):
    return {k: native(v) for k, v in obj.items() if not k.startswith('_')}

def point(value):
    return [round(v, 6) for v in BASIS @ Vector(value)]

def bounds(obj):
    vertices = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    return ([min(v[i] for v in vertices) for i in range(3)],
            [max(v[i] for v in vertices) for i in range(3)])

def signature(obj):
    import hashlib
    state = {'matrix': [round(v, 6) for row in obj.matrix_world for v in row],
             'props': props(obj), 'collections': sorted(c.name for c in obj.users_collection)}
    state['modifiers'] = [(m.name, m.type) for m in obj.modifiers]
    state['constraints'] = [(c.name, c.type) for c in obj.constraints]
    if obj.type == 'MESH':
        state['vertices'] = [[round(v, 6) for v in p.co] for p in obj.data.vertices]
        state['faces'] = [list(p.vertices) for p in obj.data.polygons]
        state['materials'] = [m.name if m else '' for m in obj.data.materials]
    return hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()

def collections():
    root = bpy.data.collections.get('POC_CITY')
    if root is None:
        root = bpy.data.collections.new('POC_CITY')
        bpy.context.scene.collection.children.link(root)
    out = {}
    for name in COLLECTIONS:
        col = bpy.data.collections.get(name)
        if col is None:
            col = bpy.data.collections.new(name)
            root.children.link(col)
        out[name] = col
    return out

def level_paths():
    if not bpy.data.filepath:
        raise ValueError('Open the saved level .blend master first.')
    master = Path(bpy.data.filepath)
    level_id = bpy.context.scene.get('level_id')
    if not level_id or master.stem != level_id:
        raise ValueError('Missing level_id or master filename does not match level_id.')
    return master.parent, ROOT / 'assets/game/levels' / level_id

def read_recipe():
    source, _ = level_paths()
    return json.loads((source / f'{bpy.context.scene["level_id"]}.recipe.json').read_text())

def objects(prefix):
    return sorted((o for o in bpy.context.scene.objects if o.name.startswith(prefix)), key=lambda o: o.name)

def collider_record(obj):
    shape = obj.get('collision', 'box')
    lo = Vector([min(v[i] for v in obj.bound_box) for i in range(3)])
    hi = Vector([max(v[i] for v in obj.bound_box) for i in range(3)])
    _, rotation, scale = obj.matrix_world.decompose()
    runtime_rotation = BASIS @ rotation.to_matrix() @ BASIS.inverted()
    quat = runtime_rotation.to_quaternion()
    size = (hi - lo) * scale
    result = {'id': obj.name, 'renderId': obj.get('render_id', ''), 'shape': shape,
              'walkable': bool(obj.get('walkable', False)), 'layer': obj.get('layer', 'WORLD_STATIC'),
              'position': point(obj.matrix_world @ ((lo + hi) / 2)),
              'size': [abs(size.x), abs(size.z), abs(size.y)],
              'rotation': [quat.x, quat.y, quat.z, quat.w]}
    if shape in ('convex', 'mesh'):
        obj.data.calc_loop_triangles()
        result['vertices'] = [n for v in obj.data.vertices for n in point(obj.matrix_world @ v.co)]
        # BASIS mirrors handedness: reverse triangle winding.
        result['indices'] = [n for p in obj.data.loop_triangles for n in reversed(p.vertices)]
    return result
