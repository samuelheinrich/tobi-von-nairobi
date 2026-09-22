"""Create the initial editable Zürich rail recipe; never overwrite an existing recipe."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/blender/levels/zurich-rail'
RECIPE = SOURCE / 'zurich-rail.recipe.json'
if RECIPE.exists():
    raise SystemExit(f'Recipe already exists; edit it or its .blend master: {RECIPE}')

# Coordinates below are metres in the game's left-handed X/Z plane. The exported
# sidecar becomes the runtime authority after a designer edits the route in Blender.
path = [
    (-3, 60), (-3, 87), (-3, 95), (-3, 112), (-2, 116),
    (1, 120), (6, 123), (12, 125), (20, 126), (47, 126),
    (55, 125), (61, 122), (65, 118), (68, 112), (68, 86), (68, 60),
]
def blender(x, z, height=0):
    return [-x, -z, height]

objects = []
def block(name, collection, size, centre, colour, *, solid=False, walkable=False,
          decoration='paint', rotation=0, **extra):
    props = {'solid': solid, 'walkable': walkable, **extra}
    if not solid:
        props['decoration_reason'] = decoration
    objects.append(dict(id='GEO_' + name, kind='box', collection=collection,
                        size=size, position=centre, rotation=[0, 0, rotation],
                        material=colour, properties=props))

# The historic city plate ends at z=123. The train swings north of that edge;
# this replacement strip carries the return arc and gives the new parapet real ground.
block('north_cutting_floor', 'ROADS', [90, 11, .7], blender(35, 128.5, -.35),
      'asphalt', solid=True, walkable=True, ground_coverage=True)
block('north_guard', 'RAILINGS', [90, .45, 1.1], blender(35, 133.78, .55),
      'stone', solid=True)
for x in (-10, 80):
    block(f'cutting_end_guard_{x}', 'RAILINGS', [.45, 10.55, 1.1],
          blender(x, 128.275, .55), 'stone', solid=True)

# One watertight strip per material/rail prevents adjacent box tops and ballast from
# fighting over the same depth. Individual rails remain editable in the .blend master.
rail_points = [blender(x, z) for x, z in path[4:14]]
for name, width, height, offset, base, colour in (
        ('ballast', 2.2, .055, 0, 0, 'ballast'),
        ('rail_left', .09, .07, -.72, .055, 'steel'),
        ('rail_right', .09, .07, .72, .055, 'steel')):
    objects.append(dict(id='GEO_' + name, kind='polyline_strip', collection='ROADS',
                        position=[0, 0, 0], points=rail_points, width=width,
                        height=height, offset=offset, baseHeight=base,
                        material=colour,
                        properties={'solid': False, 'walkable': False,
                                    'decoration_reason': 'visual train bed'}))
for side in (-1, 1):
    objects.append(dict(id=f'GEO_cutting_wall_{side}', kind='polyline_strip',
                        collection='RAILINGS', position=[0, 0, 0],
                        points=[blender(x, z) for x, z in path[6:14]],
                        width=.38, height=2.5, offset=side*7.5, baseHeight=0,
                        material='concrete',
                        properties={'solid': True, 'walkable': False,
                                    'collision_shape': 'mesh'}))

def marker(name, kind, point, **fields):
    objects.append(dict(id='MARK_' + name, kind='marker', collection='GAMEPLAY_MARKERS',
                        position=point, properties={'type': kind, **fields}))

lengths = [0.0]
for a, b in zip(path, path[1:]):
    lengths.append(lengths[-1] + math.dist(a, b))
marker('s16_route', 'vehicle_route', blender(*path[0], .38),
       points=[blender(x, z, .38) for x, z in path],
       stopDistances=[lengths[2]/lengths[-1], lengths[14]/lengths[-1]],
       stopIds=['zurich_hb', 'stadelhofen'])

recipe = dict(id='zurich-rail', blenderVersion='5.2.2 LTS', seed=12345,
              worldDimensions=[300, 300],
              groundCoverageRegions=[[-80, -134, 10, -123]],
              description='Editable S16 north cutting and rail route; existing stations remain runtime-built.',
              materials=dict(asphalt=[.23,.27,.29], stone=[.43,.42,.4],
                             concrete=[.35,.37,.39], steel=[.61,.65,.68],
                             ballast=[.26,.27,.28]),
              objects=objects)
SOURCE.mkdir(parents=True, exist_ok=True)
for name in ('textures','references','backups','metadata'):
    (SOURCE/name).mkdir(exist_ok=True)
RECIPE.write_text(json.dumps(recipe, indent=2, ensure_ascii=False) + '\n')
print(f'Created {RECIPE} with {len(objects)} objects')
