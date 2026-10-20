"""Render the same 18 GLB states for the game's remaining flat-view maps."""
import bpy,math
from pathlib import Path
from mathutils import Vector
base=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(base/'src/assets/village/container-kit.glb'))
roots=[o for o in bpy.context.scene.objects if o.name.startswith('container_')]
# Imported Blender assets round-trip into Blender coordinates unchanged.
bpy.ops.object.camera_add(location=(60,-160,130));cam=bpy.context.object
cam.rotation_euler=(Vector((0,0,20))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=102;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=12
sc.cycles.use_denoising=False;sc.world.color=(.55,.55,.55)
bpy.ops.object.light_add(type='AREA',location=(-70,-100,170));bpy.context.object.data.energy=1700000;bpy.context.object.data.size=150
sc.render.resolution_x=sc.render.resolution_y=256;sc.render.resolution_percentage=100
sc.render.film_transparent=True;sc.view_settings.view_transform='Standard'
out=Path('/tmp/container-sprites');out.mkdir(exist_ok=True)
kinds=['box','litter','cabinet','medical','weapon','bed','safe','corpse','boss_corpse']
for row,state in enumerate(['closed','open']):
 for col,kind in enumerate(kinds):
    for root in roots:
        hidden=root.name!='container_'+kind+'_'+state
        root.hide_render=hidden
        for o in root.children_recursive:o.hide_render=hidden
    sc.render.filepath=str(out/f'{row}-{col}.png');bpy.ops.render.render(write_still=True)
print('RENDERED container sprites',flush=True)
