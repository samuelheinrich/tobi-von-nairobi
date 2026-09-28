"""Deterministic, independent Zürich Street Parade world blockout recipe.

All positions are metres in a local east/north/up frame. The rough landmark anchors
were measured from OpenStreetMap; urban footprints and rail corridors are authored
approximations, not imported GIS geometry. Run this before build_level.py.
"""
import json
import math
import random
from pathlib import Path
from planar_union import box_outline, subtract_previous

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/blender/levels/zurich-streetparade/zurich-streetparade.recipe.json'
SEED = 220926
rng = random.Random(SEED)
ORIGIN = (47.3669084, 8.5452016)  # Bellevueplatz, OSM, local (0,0)
METRES_LAT = 111_320
METRES_LON = 75_450

def xy(lat, lon):
    return [round((lon-ORIGIN[1])*METRES_LON, 2), round((lat-ORIGIN[0])*METRES_LAT, 2)]

# These are visual anchors only; route/shore geometry is deliberately hand-authored.
anchors = {
    'bellevue': [0, 0],
    'hb': xy(47.3781008, 8.5393635),
    'stadelhofen': xy(47.3665643, 8.5483858),
    'enge': xy(47.3640812, 8.5314607),
    'quaibruecke': xy(47.3669512, 8.5441732),
    'buerkliplatz': xy(47.3663783, 8.5411918),
    'bauschaenzli': xy(47.3678613, 8.5423935),
    'opera': xy(47.3649700, 8.5468315),
    'hafendamm': xy(47.3603124, 8.5357618),
}
anchors['utoquai'] = [320, -760]  # southern parade start, not the OSM street centroid
objects = []
road_segments = []
rail_corridors = []


def add(id, kind, collection, material=None, position=(0,0,0), properties=None, **geometry):
    spec = dict(id='GEO_'+id, kind=kind, collection=collection, position=list(position),
                material=material, properties=properties or {})
    spec.update(geometry)
    objects.append(spec)
    return spec


def box(id, collection, material, x, y, z, sx, sy, sz, *, solid=False, walkable=False,
        sector=None, rotation=0, **extra):
    props = dict(solid=solid, walkable=walkable, **extra)
    if sector: props['sector'] = sector
    if not solid: props['decoration_reason'] = extra.get('decoration_reason','visual_blockout')
    return add(id,'box',collection,material,(round(x,3),round(y,3),round(z,3)),props,
               size=[round(sx,3),round(sy,3),round(sz,3)],rotation=[0,0,rotation])


def polygon(id, collection, material, outline, *, top=0, height=.8, solid=False,
            walkable=False, sector=None, **extra):
    props = dict(solid=solid, walkable=walkable, **extra)
    if sector: props['sector'] = sector
    if not solid: props['decoration_reason'] = extra.get('decoration_reason','visual_blockout')
    return add(id,'polygon_prism',collection,material,(0,0,top-height),props,
               outline=outline,height=height)


def marker(id, type, point, **properties):
    objects.append(dict(id='MARK_'+id,kind='marker',collection='GAMEPLAY_MARKERS',
                        position=list(point),properties=dict(type=type,**properties)))


def segment(id, a, b, width, material='asphalt', sector='city_center',
            collection='ROADS', z=.015, solid=False, trim=0, height=.04):
    dx,dy=b[0]-a[0],b[1]-a[1]
    length=math.hypot(dx,dy)
    ux,uy=dx/length,dy/length
    start=(a[0]+ux*trim,a[1]+uy*trim)
    end=(b[0]-ux*trim,b[1]-uy*trim)
    span=length-2*trim
    if span<=0: raise ValueError(id)
    spec=box(id,collection,material,(start[0]+end[0])/2,(start[1]+end[1])/2,z,
             span,width,height,solid=solid,walkable=solid and collection!='RAILINGS',sector=sector,
             rotation=math.degrees(math.atan2(dy,dx)))
    return spec


def polyline(id, points, width, material, sector, collection, z=.02,
             solid=False, walkable=False, shape=None):
    props=dict(solid=solid,walkable=walkable,sector=sector)
    if shape:props['collision_shape']=shape
    if not solid:props['decoration_reason']='ground_or_background_support'
    return add(id,'polyline_strip',collection,material,(0,0,0),props,
               points=[[p[0],p[1],0] for p in points],width=width,height=.04,
               baseHeight=z-.02)

# The river flows north from the lake; two dry bank polygons leave an actual water gap.
west_shore=[(-720,-960),(-705,-760),(-650,-620),(-570,-460),(-475,-300),
            (-365,-135),(-285,-80),(-265,-30),(-285,120),(-285,330),
            (-255,570),(-255,860),(-160,1140),(-150,1650)]
east_shore=[(-65,1650),(-60,1140),(-55,860),(-65,570),(-70,330),
            (-55,120),(0,-30),(25,-80),(35,-145),(40,-250),
            (160,-420),(250,-620),(345,-960)]
west_land=[(-1550,-960),*west_shore,(-1550,1650)]
east_land=[*east_shore,(1120,-960),(1120,1650)]
river=[*west_shore[6:],*east_shore[:7]]
lake=[*west_shore[:7],*east_shore[6:]]
polygon('west_bank_terrain','TERRAIN','pavement',west_land,solid=True,walkable=True,
        sector='city_center',collision_shape='mesh',ground_coverage=True)
polygon('east_bank_terrain','TERRAIN','pavement',east_land,solid=True,walkable=True,
        sector='bellevue',collision_shape='mesh',ground_coverage=True)
polygon('limmat_water','WATER','river',river,top=-.24,height=.035,sector='limmat')
polygon('lake_water','WATER','lake',lake,top=-.25,height=.04,sector='lake')
# Islands are actual walkable land. A short bridge joins Bauschänzli to the west bank.
bx,by=anchors['bauschaenzli']
polygon('bauschaenzli_island','LANDMARKS','park',[(bx-45,by-32),(bx+44,by-29),
        (bx+60,by),(bx+43,by+34),(bx-40,by+38)],top=.08,height=.85,
        solid=True,walkable=True,sector='limmat',collision_shape='mesh')
# Harbour dam is a deliberate walkable spur into the lake.
hx,hy=anchors['hafendamm']
segment('hafendamm_pier',(hx-20,hy+50),(hx+50,hy-85),15,'quay','hafendamm',
        'LANDMARKS',z=.08,solid=True)
pd=(70,-135); pl=math.hypot(*pd); pn=(-pd[1]/pl,pd[0]/pl)
for side in (-1,1):
    segment(f'hafendamm_rail_{side}',
            (hx-20+pn[0]*side*7.6,hy+50+pn[1]*side*7.6),
            (hx+50+pn[0]*side*7.6,hy-85+pn[1]*side*7.6),
            .35,'stone','hafendamm','RAILINGS',z=.7,solid=True,height=1.25)

# Two bridge decks over the water, with railing. The main deck spans the Limmat mouth.
bridge_start=(-322,-27); bridge_end=(48,-27)
segment('quaibruecke_deck',bridge_start,bridge_end,25,'bridge','bellevue',
        'ROADS',z=.16,solid=True)
for side in (-1,1):
    box(f'quaibruecke_rail_{side}','RAILINGS','stone',-137,-27+side*12.2,.81,
        370,.45,1.25,solid=True,sector='bellevue')
segment('bauschaenzli_footbridge',(-288,by),(bx-25,by),7,'bridge','limmat',
        'ROADS',z=.16,solid=True)
for side in (-1,1):
    box(f'bauschaenzli_bridge_rail_{side}','RAILINGS','stone',-270,by+side*3.5,.8,
        42,.35,1.2,solid=True,sector='limmat')
# The HB crossing makes the east-bank Limmatquai reachable without stepping into water.
segment('bahnhofbruecke_deck',(-240,1050),(-30,1050),17,'bridge','zurich_hb',
        'ROADS',z=.16,solid=True)
for side in (-1,1):
    box(f'bahnhofbruecke_rail_{side}','RAILINGS','stone',-135,1050+side*8.2,.81,
        210,.4,1.25,solid=True,sector='zurich_hb')

# Promenade chains deliberately keep the bends and side connections of the real lake basin.
hb_gateway=[anchors['hb'][0]+203,anchors['hb'][1]]
opera_access=[170,-190]
route=[anchors['utoquai'],[195,-370],opera_access,anchors['bellevue'],
       [0,-27],[-300,-27],anchors['buerkliplatz'],[-405,-180],[-545,-360],
       [-640,-535],anchors['hafendamm']]
road_network={
 'parade':(route,23,'streetparade'),
 'bahnhofstrasse':([hb_gateway,[-237,1118],[-430,1080],[-430,1040],[-405,820],[-382,580],[-365,340],
                   [-332,125],anchors['buerkliplatz']],19,'city_center'),
 'limmatquai':([[-42,1140],[-42,1050],[-48,870],[-60,610],[-63,340],[-51,120],
                anchors['bellevue']],14,'limmat'),
 'hb_to_limmat':([hb_gateway,[-235,1050],[-42,1050]],17,'zurich_hb'),
 'stadelhofen_link':([anchors['bellevue'],[115,-8],anchors['stadelhofen']],19,'stadelhofen'),
 'stadelhofen_opera':([anchors['stadelhofen'],[170,-133],opera_access],17,'stadelhofen'),
 'enge_link':([anchors['buerkliplatz'],[-520,-85],[-765,-145],anchors['enge']],18,'enge'),
 'enge_harbour':([anchors['enge'],[-960,-440],[-850,-590],anchors['hafendamm']],16,'enge'),
 'hb_west':([hb_gateway,[-237,1118],[-700,950],[-930,650],[-1000,360],anchors['enge']],17,'city_center'),
 'bausch_connection':([[-332,125],[-288,by],[bx-25,by],[bx,by]],7,'limmat'),
}
for name,(path,width,sector) in road_network.items():
    for i,(a,b) in enumerate(zip(path,path[1:])):
        # Deck covers this connection; don't lay coplanar asphalt over it.
        if name=='parade' and i==4: continue
        if name=='hb_to_limmat' and i==1: continue
        if name=='bausch_connection' and i==1: continue
        segment(f'road_{name}_{i:02}',a,b,width,'asphalt',sector,trim=1.5)
        road_segments.append((a,b,width))
# Road surfaces are polygon-clipped against previous surfaces. This avoids the
# overlapping coplanar boxes that caused the old Zürich level to flicker.
road_specs=[spec for spec in objects if spec['id'].startswith('GEO_road_')]
objects[:]=[spec for spec in objects if not spec['id'].startswith('GEO_road_')]
previous=[]
for spec in road_specs:
    outline=box_outline(spec)
    for index,part in enumerate(subtract_previous(outline,previous)):
        add(spec['id'][4:]+f'_part_{index:02}','polygon_surface',spec['collection'],
            spec['material'],(0,0,.024),spec['properties'],outline=part)
    previous.append(outline)
# Street axis can cross bridge directly: add the bridge centreline as navigation only.
# Bridge is an explicit walkable deck, so the missing asphalt section is deliberate.
# Retain explicit future vehicle route and walking graph for future runtime use.
marker('streetparade_route','vehicle_route',(route[0][0],route[0][1],.1),
       points=[[x,y,.1] for x,y in route],stopIds=['utoquai','bellevue','buerkliplatz','hafendamm'])

# Water-edge guards only on the urban waterfront; distant shore is bounded by terrain and fog.
for name,chain,side in [('west',west_shore[:10],-1),('east',list(reversed(east_shore[-9:])),1)]:
    for i,(a,b) in enumerate(zip(chain,chain[1:])):
        # Fine railings are simplified continuous solids at world scale.
        dx,dy=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dy)
        nx,ny=-dy/length,dx/length
        center=((a[0]+b[0])/2+nx*side*1.4,(a[1]+b[1])/2+ny*side*1.4)
        box(f'{name}_quay_guard_{i:02}','RAILINGS','stone',center[0],center[1],.58,
            length,.4,1.16,solid=True,sector='lake',
            rotation=math.degrees(math.atan2(dy,dx)))

# Landmarks are separate silhouettes, not generic blocks. They remain editable in Blender.
ox,oy=anchors['opera']
box('opera_house','LANDMARKS','limestone',ox,oy-42,13,92,66,26,solid=True,sector='opera')
box('opera_portico','LANDMARKS','white',ox,oy-4,5,75,8,10,solid=True,sector='opera')
for i in range(7):
    box(f'opera_column_{i}','LANDMARKS','white',ox-32+i*10.5,oy+1,4,2,2,8,
        solid=True,sector='opera')
# Grossmünster and Fraumünster are deliberately low-detail orientation landmarks.
for name,x,y,h in [('grossmuenster',-12,325,58),('fraumuenster',-330,310,52)]:
    box(name+'_body','LANDMARKS','limestone',x,y,13,44,36,26,solid=True,sector='limmat')
    box(name+'_tower','LANDMARKS','stone',x+10,y,26+h/2,12,12,h,solid=True,sector='limmat')
# Bahnhof buildings and track bands; physical ground platforms, without simulated train yet.
stations={
 'zurich_hb':dict(pos=anchors['hb'],tracks=12,length=430,heading=0,sector='zurich_hb'),
 'stadelhofen':dict(pos=anchors['stadelhofen'],tracks=3,length=255,heading=64,sector='stadelhofen'),
 'enge':dict(pos=anchors['enge'],tracks=2,length=220,heading=-29,sector='enge'),
}
for name,s in stations.items():
    x,y=s['pos'];tracks=s['tracks'];length=s['length'];heading=s['heading']; sector=s['sector']
    if name=='zurich_hb':
        base_x=x-350; base_y=y-68
        hall_x=x+135
        # Open shell: the east/west doorways lead directly from forecourt to platforms.
        for face,wx in [('west',hall_x-42.5),('east',hall_x+42.5)]:
            for half,offset in [('south',-59),('north',59)]:
                box(f'hb_hall_{face}_{half}','STATIONS_HB','station',wx,y+offset,7,
                    1.2,87,14,solid=True,sector=sector)
        for face,wy in [('south',y-102.5),('north',y+102.5)]:
            box(f'hb_hall_{face}_wall','STATIONS_HB','station',hall_x,wy,7,
                85,1.2,14,solid=True,sector=sector)
        box('hb_hall_roof','STATIONS_HB','roof',hall_x,y,15,85,205,2,
            solid=True,sector=sector)
        box('hb_canopy','STATIONS_HB','roof',x-170,y,24,450,190,2,
            solid=True,sector=sector)
        for row,side in enumerate((-1,1)):
            for column in range(8):
                box(f'hb_canopy_column_{row}_{column}','STATIONS_HB','station',
                    base_x+34+column*55,y+side*90,12,1.2,1.2,24,
                    solid=True,sector=sector)
        for i in range(tracks):
            yy=base_y+i*11.5
            segment(f'hb_rail_{i:02}',(base_x,yy),(base_x+length,yy),2.2,'rail',sector,
                    'RAIL',z=.1,solid=False)
            if i%2==0:
                box(f'hb_platform_{i//2:02}','STATIONS_HB','platform',base_x+length/2,
                    yy+5.4,.11,length,6,.22,solid=True,walkable=True,sector=sector)
        # Underground level is marked and blocked out as a separate excavation volume;
        # its real entrances/stairs are deferred to station-detail phase.
        box('hb_subterranean_outline','STATIONS_HB','tunnel',x-95,y,-9,260,80,.25,
            solid=False,sector=sector)
        for i in range(4):
            box(f'hb_underground_track_{i}','RAIL','rail',x-95,y-23+i*15,-8.65,
                260,2,.2,solid=False,sector=sector)
        box('hb_station_clock','STATIONS_HB','clock',x+78,y,31,3,3,3,
            solid=False,sector=sector)
        rail_corridors.append(([base_x,base_y-6],[base_x+length,base_y+(tracks-1)*11.5+7]))
    else:
        angle=math.radians(heading)
        ux,uy=math.cos(angle),math.sin(angle)
        nx,ny=-uy,ux
        box(name+'_building','STATIONS_'+name.split('_')[-1].upper(),'station',
            x-ux*10-nx*45,y-uy*10-ny*45,8,55,32,16,solid=True,sector=sector,
            rotation=heading)
        for i in range(tracks):
            offset=(i-(tracks-1)/2)*12
            a=[x-ux*length/2+nx*offset,y-uy*length/2+ny*offset]
            b=[x+ux*length/2+nx*offset,y+uy*length/2+ny*offset]
            segment(f'{name}_rail_{i}',a,b,2.2,'rail',sector,'RAIL',z=.1)
            if i<max(1,tracks-1):
                px=x+nx*(offset+5)
                py=y+ny*(offset+5)
                box(f'{name}_platform_{i}','STATIONS_'+name.split('_')[-1].upper(),
                    'platform',px,py,.11,length,6,.22,solid=True,walkable=True,
                    sector=sector,rotation=heading)
        box(name+'_canopy','STATIONS_'+name.split('_')[-1].upper(),'roof',x,y,6.5,
            length*.7,tracks*12,1,solid=True,sector=sector,rotation=heading)
        for along in (-1,1):
            for side in (-1,1):
                distance=length*.3
                lateral=tracks*6-1
                box(f'{name}_canopy_column_{along}_{side}',
                    'STATIONS_'+name.split('_')[-1].upper(),'station',
                    x+ux*distance*along+nx*lateral*side,
                    y+uy*distance*along+ny*lateral*side,3,
                    1.2,1.2,6,solid=True,sector=sector)
        rail_corridors.append(([x-length*.6,y-tracks*8],[x+length*.6,y+tracks*8]))
    access=(x+203,y) if name=='zurich_hb' else (x,y)
    marker('station_'+name,'player_spawn',(*access,1.2),label=name,sector=sector)
# One continuous train route will later stream tunnel sections; this is metadata only.
marker('zurich_train_loop','vehicle_route',(anchors['hb'][0],anchors['hb'][1],-8.5),
       points=[[*anchors[k],-8.5] for k in ('hb','stadelhofen','enge','hb')],
       stopIds=['zurich_hb','stadelhofen','enge','zurich_hb'],sector='rail',underground=True)

# Public landmark/nav markers; direct foot paths remain in the walkable city terrain.
for name in ('bellevue','quaibruecke','buerkliplatz','bauschaenzli','opera','utoquai','hafendamm'):
    x,y=(opera_access if name=='opera' else [-77.59,-27] if name=='quaibruecke'
         else anchors[name])
    marker('landmark_'+name,'player_spawn',(x,y,1.2),label=name,sector='streetparade')
marker('first_spawn','player_spawn',(anchors['hb'][0]+203,anchors['hb'][1],1.2),
       label='Zürich HB',sector='zurich_hb')
marker('explore_hafendamm','mission_trigger',(*anchors['hafendamm'],.25),radius=12,
       label='Hafendamm Enge',sector='hafendamm')

# Stage/site footprints: first blockout only, no DJ/crowd or decorative detail.
for name,p,sx,sy in [
    ('utoquai',anchors['utoquai'],22,12),('opera',[ox+80,oy-3],32,18),
    ('bellevue',[20,45],29,16),('buerkliplatz',[-377,-95],37,17),
    ('bauschaenzli',[bx,by],25,15),('hafendamm',[hx-15,hy+34],30,16),
]:
    box(f'stage_{name}','STREETPARADE_'+name.upper(),'stage',p[0],p[1],.32,
        sx,sy,.62,solid=True,walkable=True,sector=name)
    marker(f'stage_{name}','mission_trigger',(p[0],p[1],.7),radius=14,
           label=f'{name} stage',sector=name)

# Building massing: deterministic blocks with street/rail clearance, no architectural details.
def in_polygon(p,outline):
    x,y=p; inside=False
    j=len(outline)-1
    for i in range(len(outline)):
        xi,yi=outline[i];xj,yj=outline[j]
        if ((yi>y)!=(yj>y)) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:
            inside=not inside
        j=i
    return inside

def segment_distance(p,a,b):
    vx,vy=b[0]-a[0],b[1]-a[1]
    t=max(0,min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy)))
    return math.hypot(p[0]-a[0]-t*vx,p[1]-a[1]-t*vy)

special_clearances=[(anchors['hb'],(480,255)),(anchors['stadelhofen'],(235,170)),
                    (anchors['enge'],(235,160)),(anchors['opera'],(155,135)),
                    (anchors['bellevue'],(85,80)),(anchors['buerkliplatz'],(100,80))]
blocks=[]
for side,land in [('west',west_land),('east',east_land)]:
    for gy in range(-875,1560,145):
        for gx in range(-1390,1040,145):
            x=gx+rng.uniform(-7,7);y=gy+rng.uniform(-7,7)
            if not all(in_polygon(c,land) for c in ((x-48,y-42),(x+48,y-42),
                                                      (x-48,y+42),(x+48,y+42))):
                continue
            if any(abs(x-p[0])<w and abs(y-p[1])<h for p,(w,h) in special_clearances):
                continue
            if any(segment_distance((x,y),a,b)<width/2+63 for a,b,width in road_segments):
                continue
            if any(a[0]-80<x<b[0]+80 and a[1]-80<y<b[1]+80 for a,b in rail_corridors):
                continue
            height=rng.choice([14,18,20,24,27])
            sector=('zurich_hb' if y>900 else 'city_center' if y>50 else
                    'enge' if x< -700 else 'stadelhofen' if x>100 else 'streetparade')
            blocks.append((x,y,height,sector))
            box(f'city_block_{len(blocks):03}','BUILDINGS','facade_'+str(len(blocks)%3),
                x,y,height/2,88,77,height,solid=True,sector=sector)
# A second ring of very cheap silhouettes visually extends streets to the horizon.
for i in range(48):
    angle=2*math.pi*i/48
    x=math.cos(angle)*1750-170; y=math.sin(angle)*1740+260
    h=16+rng.randrange(0,9)*4
    box(f'distant_city_{i:02}','BACKGROUND','distant',x,y,h/2-1,
        85,120,h,solid=False,sector='background_city')
for i in range(16):
    x=-1550+i*190
    box(f'distant_hill_{i:02}','BACKGROUND','hill',x,2140,60,175,180,120,
        solid=False,sector='background_city')
# Physical outer edges look like retaining walls/building backs, with more city beyond.
for name,x,y,sx,sy in [
    ('west',-1545,345,10,2610),('east',1115,345,10,2610),
    ('north_west',-905,1645,1290,10),('north_east',525,1645,1190,10),
    ('south_west',-1135,-955,830,10),('south_east',735,-955,770,10),
]:
    box(f'city_boundary_{name}','BUILDINGS','stone',x,y,3,sx,sy,6,
        solid=True,sector='background_city')

recipe={
 'id':'zurich-streetparade','blenderVersion':'5.2.2 LTS','seed':SEED,
 'rootCollection':'ZURICH_STREETPARADE',
 'mergeRenderMeshes':True,
 'collections':['GENERATED','MANUAL','TERRAIN','WATER','RAIL','STATIONS_HB',
                'STATIONS_STADELHOFEN','STATIONS_ENGE','LANDMARKS','STREETPARADE_UTOQUAI',
                'STREETPARADE_OPERA','STREETPARADE_BELLEVUE','STREETPARADE_BUERKLIPLATZ',
                'STREETPARADE_BAUSCHAENZLI','STREETPARADE_HAFENDAMM','BACKGROUND'],
 'worldDimensions':[3600,4600],
 'groundCoverageRegions':[], # complex shoreline checked by world-specific walk graph
 'description':'New independent Zürich Street Parade geographic world blockout; metres, east/north/up, Bellevue origin.',
 'originWgs84':{'latitude':ORIGIN[0],'longitude':ORIGIN[1]},
 'anchors':anchors,
 'walkRoutes':{
   'hb_buerkliplatz':['hb','buerkliplatz'],
   'hb_stadelhofen':['hb','buerkliplatz','quaibruecke','bellevue','stadelhofen'],
   'stadelhofen_enge':['stadelhofen','bellevue','quaibruecke','buerkliplatz','enge'],
   'street_parade':['utoquai','opera','bellevue','quaibruecke','buerkliplatz','hafendamm'],
 },
 'walkNetwork':{name:path for name,(path,_,_) in road_network.items()},
 'environment':{'sky':'summer_evening','fogDensity':0.00045,'fogColor':[0.65,0.73,0.83],
                'shadowMode':'minimal',
                'waterAnimation':'deferred_to_detail_pass'},
 'materials':{
   'pavement':[.54,.53,.49], 'asphalt':[.25,.27,.30], 'bridge':[.46,.45,.43],
   'quay':[.56,.54,.48], 'stone':[.53,.51,.49], 'river':[.12,.35,.48],
   'lake':[.13,.39,.52], 'park':[.38,.52,.31], 'facade_0':[.72,.65,.55],
   'facade_1':[.62,.68,.69], 'facade_2':[.74,.70,.63], 'distant':[.51,.57,.61],
   'hill':[.38,.49,.42], 'limestone':[.80,.77,.69], 'white':[.85,.83,.76],
   'station':[.53,.54,.53], 'platform':[.65,.63,.59], 'roof':[.32,.35,.38],
   'rail':[.18,.19,.22], 'tunnel':[.19,.21,.23], 'clock':[.24,.26,.28],
   'stage':[.58,.25,.51],
 },
 'objects':objects,
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(recipe,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'recipe':str(OUT),'objects':len(objects),'cityBlocks':len(blocks),
                  'anchors':anchors},ensure_ascii=False))
