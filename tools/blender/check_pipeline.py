"""Small local negative-fixture audit. Mutates memory only; never saves the opened master."""
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_level import validate
from common import write_json, ROOT

baseline=validate(save=False)
assert baseline['status']=='PASS',baseline
results=[]
def check(code, mutate, restore):
    try:
        mutate()
        bpy.context.view_layer.update()
        report=validate(save=False)
        assert any(f['code']==code and f['severity']!='PASS' for f in report['findings']),code
        results.append(code)
    finally:
        restore()
        bpy.context.view_layer.update()

coll=bpy.data.objects['COL_table_top']; old=coll['render_id']
check('orphan_collider',lambda:coll.__setitem__('render_id','missing'),lambda:coll.__setitem__('render_id',old))
check('missing_collision',lambda:coll.__setitem__('render_id','missing'),lambda:coll.__setitem__('render_id',old))
marker=bpy.data.objects['MARK_bottle_bar_01'];previous=marker.location.copy()
check('marker_outside',lambda:setattr(marker,'location',(80,0,0)),lambda:setattr(marker,'location',previous))
wall=bpy.data.objects['COL_wall'];previous=wall.location.copy()
check('blocked_door',lambda:setattr(wall,'location',(-12,2.15,1.5)),lambda:setattr(wall,'location',previous))
roof=bpy.data.objects['MARK_roof_access_01'];previous=roof['target']
check('roof_without_access',lambda:roof.__setitem__('target','missing'),lambda:roof.__setitem__('target',previous))
rail=bpy.data.objects['GEO_rail_roof_back'];previous=rail['protects']
check('unguarded_edge',lambda:rail.__setitem__('protects','missing'),lambda:rail.__setitem__('protects',previous))
wall=bpy.data.objects['GEO_wall'];previous=wall.location.copy()
check('stale_collider',lambda:setattr(wall,'location',(2,2,2)),lambda:setattr(wall,'location',previous))
floor=bpy.data.objects['GEO_ground'];previous=floor['ground_coverage']
check('ground_gaps',lambda:floor.__setitem__('ground_coverage',False),lambda:floor.__setitem__('ground_coverage',previous))
copy=floor.copy();copy.data=floor.data.copy();bpy.context.scene.collection.objects.link(copy)
try:
 report=validate(save=False)
 for code in ('duplicate_floor','coplanar_faces','duplicate_name'):
  assert any(f['code']==code and f['severity']!='PASS' for f in report['findings']),code
  results.append(code)
finally:bpy.data.objects.remove(copy,do_unlink=True)
copy=floor.copy();copy.data=floor.data.copy();bpy.context.scene.collection.objects.link(copy)
try:
 import bmesh
 mesh=bmesh.new();mesh.from_mesh(copy.data);mesh.faces.ensure_lookup_table()
 bmesh.ops.delete(mesh,geom=[mesh.faces[0]],context='FACES_ONLY');mesh.to_mesh(copy.data);mesh.free()
 report=validate(save=False)
 assert any(f['code']=='open_geometry' and f['severity']=='WARNING' for f in report['findings'])
 results.append('open_geometry')
finally:bpy.data.objects.remove(copy,do_unlink=True)
assert validate(save=False)['status']=='PASS'
report={'status':'PASS','negativeFixtures':results,'masterSaved':False,'blenderVersion':bpy.app.version_string}
write_json(ROOT/'docs/development/blender-poc-validator-checks.json',report)
print(json.dumps(report))
