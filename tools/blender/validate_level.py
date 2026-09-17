"""Conservative geometric preflight; warnings are candidates for GUI review, never auto-repairs."""
import json
import re
import sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import bounds, objects, level_paths, read_recipe, signature, write_json

def overlap(a, b, tolerance=0):
    return all(min(a[1][i], b[1][i])-max(a[0][i], b[0][i]) > tolerance for i in range(3))

def validate(save=True):
    source, _ = level_paths()
    recipe = read_recipe()
    findings = []
    def note(severity, code, names, message):
        findings.append(dict(severity=severity,code=code,objects=names,message=message))
    geo, cols, markers = objects('GEO_'), objects('COL_'), objects('MARK_')
    linked = {}
    for col in cols:
        linked.setdefault(col.get('render_id',''), []).append(col)
        render = bpy.data.objects.get(col.get('render_id',''))
        if render is None or render not in geo:
            note('ERROR','orphan_collider',[col.name],'Collider has no render object.')
        elif col.get('_source_signature') and col['_source_signature'] != signature(render):
            note('ERROR','stale_collider',[col.name,render.name],'Render changed: explicitly sync colliders or review custom collider.')
        if col.get('collision') not in ('box','capsule','convex','mesh'):
            note('ERROR','collider_shape',[col.name],'Unsupported collider shape.')
        if any(v <= 0.00001 for v in col.dimensions):
            note('ERROR','collider_size',[col.name],'Zero collider extent.')
        # Sheared/mirrored primitives cannot be represented by position/rotation/positive size.
        scale = col.matrix_world.decompose()[2]
        axes = [col.matrix_world.to_3x3().col[i].normalized() for i in range(3)]
        if min(scale) <= 0 or any(abs(axes[i].dot(axes[j])) > .001 for i in range(3) for j in range(i)):
            note('ERROR','unsupported_transform',[col.name],'Apply negative scale/shear before export.')
    stable_ids = {}
    for obj in geo + cols + markers:
        stable = obj.get('export_id', obj.name)
        if stable in stable_ids or re.search(r'\.\d{3}$',obj.name):
            note('ERROR','duplicate_name',[obj.name],'Duplicate export identity or Blender numeric duplicate: rename deliberately.')
        stable_ids[stable]=obj.name
    for obj in geo:
        if obj.modifiers or obj.constraints:
            note('ERROR','unapplied_authoring_effect',[obj.name],'Apply modifiers/constraints before syncing collision and exporting.')
        if obj.type != 'MESH':
            note('ERROR','render_type',[obj.name],'Render objects must be meshes.')
            continue
        if obj.get('solid',False) and not linked.get(obj.name):
            note('ERROR','missing_collision',[obj.name],'solid=true requires a collider.')
        if not obj.get('solid',False) and not obj.get('decoration_reason'):
            note('WARNING','unclassified_decoration',[obj.name],'Non-solid render object needs an explicit reason.')
        edge_use={}
        for face in obj.data.polygons:
            for key in face.edge_keys: edge_use[key]=edge_use.get(key,0)+1
        if obj.get('solid') and any(count!=2 for count in edge_use.values()):
            note('WARNING','open_geometry',[obj.name],'Non-manifold/open render mesh; inspect gaps.')
    floors = [o for o in geo if o.get('walkable') and not o.get('stair')]
    for i,a in enumerate(floors):
        aa=bounds(a)
        for b in floors[i+1:]:
            bb=bounds(b)
            planar = all(min(aa[1][k],bb[1][k])-max(aa[0][k],bb[0][k]) > .01 for k in (0,1))
            if planar and abs(aa[1][2]-bb[1][2]) < .001:
                note('ERROR','duplicate_floor',[a.name,b.name],'Overlapping walkable tops differ by less than 1 mm.')
    # Detect coplanar box-like faces beyond floors (including decorative layers).
    for i,a in enumerate(geo):
        aa=bounds(a)
        for b in geo[i+1:]:
            bb=bounds(b)
            for axis in range(3):
                planar=all(min(aa[1][k],bb[1][k])-max(aa[0][k],bb[0][k])>.03 for k in range(3) if k!=axis)
                if planar and any(abs(aa[end][axis]-bb[end][axis])<.001 for end in (0,1)):
                    note('WARNING','coplanar_faces',[a.name,b.name],'Potential coincident faces; inspect overlap in GUI.')
                    break
    halfx,halfy=[n/2 for n in recipe['worldDimensions']]
    for marker in markers:
        p=marker.matrix_world.translation
        if abs(p.x)>halfx or abs(p.y)>halfy or p.z < -.5 or p.z>50:
            note('ERROR','marker_outside',[marker.name],'Marker outside playable world bounds.')
        for route_point in marker.get('points',[]):
            if abs(route_point[0])>halfx or abs(route_point[1])>halfy:
                note('ERROR','route_outside',[marker.name],'Route point outside world.')
        if marker.get('type')=='door':
            width,height=marker.get('width',0),marker.get('height',0)
            if width<1.2 or height<2.1:
                note('ERROR','door_clearance',[marker.name],'Door must fit player capsule: >=1.2 m wide and 2.1 m high.')
            # Swept doorway oriented with marker local X (width), Y (depth), Z (height).
            # AABB is conservative for rotated doorways, so potential obstructions need inspection.
            pts=[marker.matrix_world @ Vector((x*width/2,y*marker.get('depth',1)/2,z))
                 for x in (-.98,.98) for y in (-1,1) for z in (.08,height-.05)]
            volume=([min(v[k] for v in pts) for k in range(3)],[max(v[k] for v in pts) for k in range(3)])
            for col in cols:
                if overlap(volume,bounds(col),.01):
                    note('ERROR','blocked_door',[marker.name,col.name],'Collider intersects doorway clearance volume.')
    accesses={m.get('target') for m in markers if m.get('type')=='roof_access'}
    for obj in geo:
        if obj.get('requires_access') and obj.name not in accesses:
            note('ERROR','roof_without_access',[obj.name],'Walkable roof has no roof-access marker.')
        for edge in obj.get('safety_edges',[]):
            rails=[r for r in geo if r.get('protects')==obj.name]
            for step in range(11):
                t=(step+.5)/11
                local_x,local_y=edge[0]+(edge[2]-edge[0])*t,edge[1]+(edge[3]-edge[1])*t
                edge_world=obj.matrix_world @ Vector((local_x,local_y,obj.get('edge_height',0)))
                x,y,height=edge_world
                guarded=False
                for rail in rails:
                    lo,hi=bounds(rail)
                    if lo[0]-.2<=x<=hi[0]+.2 and lo[1]-.2<=y<=hi[1]+.2 and hi[2]>=height+1 and linked.get(rail.name):
                        guarded=True
                if not guarded:
                    note('WARNING','unguarded_edge',[obj.name],'Declared elevated edge lacks a solid >=1 m railing.')
                    break
    # Ray tests on the ground-coverage meshes find missing base tiles/holes on a 2 m grid.
    ground=[o for o in geo if o.get('ground_coverage')]
    gaps=[]
    for x in range(int(-halfx+1),int(halfx),2):
        for y in range(int(-halfy+1),int(halfy),2):
            supported=False
            for obj in ground:
                inverse=obj.matrix_world.inverted()
                hit,*_=obj.ray_cast(inverse @ Vector((x,y,1)),(inverse.to_3x3() @ Vector((0,0,-1))).normalized())
                supported |= hit
            if not supported:gaps.append([x,y])
    if gaps:note('ERROR','ground_gaps',[],'Uncovered ground samples: '+str(gaps[:12]))
    checks=['open_geometry','duplicate_floor','coplanar_faces','missing_collision','blocked_door','marker_outside',
            'roof_without_access','unguarded_edge','duplicate_name','orphan_collider','stale_collider','ground_gaps']
    for code in checks:
        if not any(f['code']==code for f in findings):note('PASS',code,[],'No issue detected by this check.')
    report=dict(schemaVersion=1,levelId=recipe['id'],blenderVersion=bpy.app.version_string,
                status='ERROR' if any(f['severity']=='ERROR' for f in findings) else 'WARNING' if any(f['severity']=='WARNING' for f in findings) else 'PASS',
                counts=dict(render=len(geo),colliders=len(cols),markers=len(markers)),findings=findings,
                limitations=['AABB face/door tests are conservative for rotations.',
                             'Ground holes smaller than the 2 m sample grid may be missed.',
                             'Edge safety only covers declared safety_edges; it is not an arbitrary-mesh fall detector.',
                             'Roof access markers do not prove reachability; exercise the Havok route in Level Studio.'])
    if save:write_json(source/'metadata/validation.json',report)
    return report

if __name__=='__main__':
    result=validate()
    print(json.dumps(result,indent=2))
    if result['status']=='ERROR':raise RuntimeError('Level validation failed; inspect metadata/validation.json')
