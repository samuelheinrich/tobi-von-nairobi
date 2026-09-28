"""Read saved Blender master, validate, export render GLB + engine-neutral sidecars. Never save master."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from collections import defaultdict
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import level_paths, read_recipe, objects, props, point, bounds, collider_record, write_json
from validate_level import validate

report=validate()
if report['status']=='ERROR':raise RuntimeError('Export stopped: fix validation errors first.')
source,target=level_paths()
recipe=read_recipe()
level_id=recipe['id']
target.mkdir(parents=True,exist_ok=True)
geo=objects('GEO_')
export_geo=geo
render_names={o.name:o.name for o in geo}
if recipe.get('mergeRenderMeshes'):
    groups=defaultdict(list)
    for obj in geo:
        sector=obj.get('sector','unassigned')
        material=obj.data.materials[0]
        cutaway=any(c.name=='ROOFS' for c in obj.users_collection)
        groups[(sector,material.name,cutaway)].append(obj)
    export_geo=[]
    for index,((sector,material_name,cutaway),members) in enumerate(sorted(groups.items())):
        verts=[];faces=[]
        for member in members:
            start=len(verts)
            verts.extend(tuple(member.matrix_world @ v.co) for v in member.data.vertices)
            faces.extend(tuple(start+i for i in face.vertices) for face in member.data.polygons)
        name=f'GEO_EXPORT_{index:03}_{sector}_{material_name}'
        mesh=bpy.data.meshes.new(name+'_mesh')
        mesh.from_pydata(verts,[],faces)
        mesh.update()
        mesh.materials.append(bpy.data.materials[material_name])
        merged=bpy.data.objects.new(name,mesh)
        bpy.context.scene.collection.objects.link(merged)
        export_geo.append(merged)
        for member in members:render_names[member.name]=name
bpy.ops.object.select_all(action='DESELECT')
for obj in export_geo:
    obj.hide_set(False)
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(target/f'{level_id}.glb'),export_format='GLB',use_selection=True,
    export_animations=False,export_cameras=False,export_lights=False,export_extras=False,export_yup=True)
metadata=dict(schemaVersion=1,levelId=level_id,units='metres',coordinateSystem='babylon-left-handed-y-up',
              worldDimensions=recipe['worldDimensions'],renderNodes=[o.name for o in export_geo],
              cutawayNodes=list(dict.fromkeys(render_names[o.name] for o in geo
                  if any(c.name=='ROOFS' for c in o.users_collection))),
              environment=recipe.get('environment'),
              sectors={},
              doors=[],bottleSpawns=[],vehicleSpawns=[],vehicleRoutes=[],roofAccess=[],missionTriggers=[],
              playerSpawns=[],navigationRoutes=[],walkableAreas=[])
keys={'door':'doors','bottle_spawn':'bottleSpawns','vehicle_spawn':'vehicleSpawns','vehicle_route':'vehicleRoutes',
      'roof_access':'roofAccess','mission_trigger':'missionTriggers','player_spawn':'playerSpawns','navigation_route':'navigationRoutes'}
for obj in objects('MARK_'):
    fields=props(obj)
    kind=fields.pop('type')
    if kind not in keys:raise ValueError('Unknown marker type: '+kind)
    # Route points are marker-local when routeSpace=local, otherwise authoring world points.
    if 'points' in fields:
        fields['points']=[point(obj.matrix_world @ Vector(p) if fields.get('routeSpace')=='local' else p) for p in fields['points']]
    if 'normal' in fields:fields['normal']=point(obj.matrix_world.to_3x3() @ Vector(fields['normal']))
    metadata[keys[kind]].append(dict(id=obj.name,position=point(obj.matrix_world.translation),**fields))
for obj in geo:
    if obj.get('sector'):
        names=metadata['sectors'].setdefault(obj['sector'], [])
        render_name=render_names[obj.name]
        if render_name not in names:names.append(render_name)
    if obj.get('walkable'):
        lo,hi=bounds(obj)
        vertices=[point(obj.matrix_world @ Vector(p)) for p in obj.bound_box]
        metadata['walkableAreas'].append(dict(id=obj.name,min=[min(p[i] for p in vertices) for i in range(3)],
                                             max=[max(p[i] for p in vertices) for i in range(3)]))
collisions=dict(schemaVersion=1,levelId=level_id,coordinateSystem=metadata['coordinateSystem'],
                colliders=[{**collider_record(o),
                            'renderId':render_names[o.get('render_id','')]}
                           for o in objects('COL_')])
write_json(target/f'{level_id}.runtime.json',metadata)
write_json(target/f'{level_id}.collision.json',collisions)
write_json(source/'metadata/gameplay.json',metadata)
write_json(source/'metadata/collision.json',collisions)
print('Export complete; master untouched:',bpy.data.filepath)
