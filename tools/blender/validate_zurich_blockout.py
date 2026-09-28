"""Targeted topological preflight for the independent Zürich world blockout.

Runs after the generic validator. It checks the saved Blender scene, never mutates it.
This is intentionally a map-level blockout proof, not a replacement for Havok playtesting.
"""
import json
import math
import sys
from collections import defaultdict, deque
from pathlib import Path

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import level_paths, objects, read_recipe, write_json
from validate_level import validate


def inside(point, outline):
    x,y=point[:2]; hit=False
    j=len(outline)-1
    for i in range(len(outline)):
        xi,yi=outline[i];xj,yj=outline[j]
        if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:
            hit=not hit
        j=i
    return hit


def footprint_contains(obj, point, margin=0):
    local=obj.matrix_world.inverted() @ Vector((point[0],point[1],obj.matrix_world.translation.z))
    lo=[min(v[i] for v in obj.bound_box) for i in range(2)]
    hi=[max(v[i] for v in obj.bound_box) for i in range(2)]
    return all(lo[i]-margin<=local[i]<=hi[i]+margin for i in range(2))


def samples(a,b,spacing=4):
    length=math.dist(a,b)
    for i in range(math.ceil(length/spacing)+1):
        t=i/max(1,math.ceil(length/spacing))
        yield (a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)


def node(point):
    return tuple(round(v,2) for v in point[:2])


def run():
    source,_=level_paths()
    recipe=read_recipe()
    assert recipe['id']=='zurich-streetparade'
    generic=validate(save=True)
    issues=[]
    def issue(code, names, detail):
        issues.append(dict(code=code,objects=names,detail=detail))
    specs={s['id']:s for s in recipe['objects']}
    west=specs['GEO_west_bank_terrain']['outline']
    east=specs['GEO_east_bank_terrain']['outline']
    lake=specs['GEO_lake_water']['outline']
    river=specs['GEO_limmat_water']['outline']
    island=specs['GEO_bauschaenzli_island']['outline']
    bridge_ids=('GEO_quaibruecke_deck','GEO_bahnhofbruecke_deck',
                'GEO_bauschaenzli_footbridge','GEO_hafendamm_pier')
    bridges=[bpy.data.objects[name] for name in bridge_ids]
    def supported(p):
        return any(inside(p,polygon) for polygon in (west,east,island)) or any(
            footprint_contains(obj,p) for obj in bridges)
    buildings=[o for o in objects('GEO_') if o.name.startswith('GEO_city_block_') or
               o.name.startswith('GEO_hb_hall_') and 'roof' not in o.name or
               o.name in ('GEO_opera_house','GEO_fraumuenster_body',
                          'GEO_grossmuenster_body','GEO_stadelhofen_building',
                          'GEO_enge_building')]
    network=recipe['walkNetwork']
    graph=defaultdict(set)
    support_failures=[]; building_crossings=[]
    for name,points in network.items():
        for a,b in zip(points,points[1:]):
            graph[node(a)].add(node(b));graph[node(b)].add(node(a))
            for p in samples(a,b):
                if not supported(p): support_failures.append((name,p))
                for building in buildings:
                    if footprint_contains(building,p,margin=.7):
                        building_crossings.append((name,building.name,p))
    if support_failures:issue('unsupported_walk_path',[],str(support_failures[:8]))
    if building_crossings:issue('road_through_building',[],str(building_crossings[:8]))
    anchors=recipe['anchors']
    target_nodes={
        'hb':node(bpy.data.objects['MARK_first_spawn'].location),
        'stadelhofen':node(anchors['stadelhofen']),
        'enge':node(anchors['enge']),
        'bellevue':node(anchors['bellevue']),
        'quaibruecke':node((0,-27)),
        'buerkliplatz':node(anchors['buerkliplatz']),
        'utoquai':node(anchors['utoquai']),
        'opera':node((170,-190)),
        'hafendamm':node(anchors['hafendamm']),
        'bauschaenzli':node(anchors['bauschaenzli']),
    }
    seen={target_nodes['hb']};queue=deque(seen)
    while queue:
        for nxt in graph[queue.popleft()]-seen:
            seen.add(nxt);queue.append(nxt)
    disconnected=[name for name,p in target_nodes.items() if p not in seen]
    if disconnected:issue('disconnected_zone',disconnected,'Missing connected walking graph.')
    for name,p in target_nodes.items():
        if not supported(p):issue('unsupported_landmark',[name],f'{p} lacks walkable terrain/deck')
    for name in ('quaibruecke','bahnhofbruecke','bauschaenzli_footbridge'):
        obj=bpy.data.objects.get('GEO_'+name+'_deck' if name!='bauschaenzli_footbridge'
                                 else 'GEO_bauschaenzli_footbridge')
        if not obj or not bpy.data.objects.get('COL_'+obj.name[4:]):
            issue('bridge_without_collision',[name],'Bridge needs a solid, walkable collider.')
    rail_names=[o for o in objects('GEO_') if '_rail_' in o.name and
                (o.name.startswith('GEO_hb_rail_') or o.name.startswith('GEO_stadelhofen_rail_')
                 or o.name.startswith('GEO_enge_rail_'))]
    rail_crossings=[]
    for rail in rail_names:
        center=rail.matrix_world.translation
        ends=[rail.matrix_world @ Vector((x,0,0)) for x in
              (min(v[0] for v in rail.bound_box),max(v[0] for v in rail.bound_box))]
        for p in samples(ends[0],ends[1],6):
            for building in buildings:
                if footprint_contains(building,p,margin=1):
                    rail_crossings.append((rail.name,building.name,p))
    if rail_crossings:issue('rail_through_building',[],str(rail_crossings[:8]))
    for building in buildings:
        corners=[building.matrix_world @ Vector(v) for v in building.bound_box]
        if any(inside(p,lake) or inside(p,river) for p in corners):
            issue('building_in_water',[building.name],'Footprint intersects lake/river.')
    required=['west','east','north_west','north_east','south_west','south_east']
    for name in required:
        if not bpy.data.objects.get('COL_city_boundary_'+name):
            issue('open_world_edge',[name],'Missing physical perimeter mass.')
    track_counts={'hb':12,'hb_underground':4,'stadelhofen':3,'enge':2}
    found={name:len([o for o in objects('GEO_') if o.name.startswith('GEO_'+name+'_rail_') or
                     (name=='hb_underground' and o.name.startswith('GEO_hb_underground_track_'))])
           for name in track_counts}
    if found!=track_counts:issue('station_track_count',[],str(found))
    render=objects('GEO_');colliders=objects('COL_')
    triangles=sum(sum(len(face.vertices)-2 for face in o.data.polygons) for o in render)
    report=dict(levelId=recipe['id'],status='ERROR' if issues or generic['status']=='ERROR' else
                'WARNING' if generic['status']=='WARNING' else 'PASS',
                coordinateSystem='east/north/up metres, Bellevue origin',
                dimensions=recipe['worldDimensions'],anchors=anchors,
                counts=dict(render=len(render),colliders=len(colliders),markers=len(objects('MARK_')),
                            triangles=triangles,cityBlocks=len([o for o in render if o.name.startswith('GEO_city_block_')]),
                            stations=3,aboveGroundHbTracks=found['hb'],belowGroundHbTracks=found['hb_underground']),
                connectivity=dict(checked=list(target_nodes),allConnected=not disconnected),
                genericStatus=generic['status'],issues=issues,
                limitations=['Walking proof samples authored paths on geometric surfaces; it does not simulate Havok/player radius.',
                             'Underground HB outline and train loop are metadata/blockout, not yet enterable or animated.',
                             'Background silhouette/city edge visibility still requires in-game camera inspection.'])
    write_json(source/'metadata/world-validation.json',report)
    print(json.dumps({'status':report['status'],'issues':issues[:12],'counts':report['counts']},ensure_ascii=False))
    if report['status']=='ERROR':raise RuntimeError('Zürich blockout preflight failed.')

if __name__=='__main__':run()
