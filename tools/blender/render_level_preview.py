"""Render a lightweight top-down PNG from a saved authored master; never save the .blend.

Usage: blender --background level.blend --python tools/blender/render_level_preview.py
       -- output.png center_x center_y orthographic_width
"""
import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import arguments, read_recipe

args=arguments()
if len(args)!=4:raise SystemExit('Expected output.png center_x center_y orthographic_width')
output=Path(args[0]).resolve();cx,cy,width=map(float,args[1:])
recipe=read_recipe()
scene=bpy.context.scene
camera_data=bpy.data.cameras.new('TEMP_preview_camera')
camera=bpy.data.objects.new('TEMP_preview_camera',camera_data)
scene.collection.objects.link(camera)
camera.location=(cx,cy,2500)
camera_data.type='ORTHO';camera_data.ortho_scale=width
camera_data.lens=50
camera_data.clip_end=6000
scene.camera=camera
for label,point in recipe.get('anchors',{}).items():
    if label not in ('hb','stadelhofen','enge','bellevue','buerkliplatz','hafendamm','opera'):
        continue
    font=bpy.data.curves.new('TEMP_'+label,'FONT')
    font.body=label.upper().replace('_',' ')
    font.size=50
    obj=bpy.data.objects.new('TEMP_label_'+label,font)
    scene.collection.objects.link(obj)
    obj.location=(point[0]+14,point[1]+12,65)
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.color_type='MATERIAL'
scene.display.shading.light='STUDIO'
scene.display.shading.show_shadows=False
scene.render.resolution_x=640
scene.render.resolution_y=360
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(output)
scene.render.film_transparent=False
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.render.render(write_still=True)
print(json.dumps({'preview':str(output),'masterUnchanged':bpy.data.filepath}))
