"""Adapt Tiny Treats Homely House (CC0) into the rounded countryside family.
blender -b --python scripts/assets/build-rounded-village.py -- /path/to/Tiny-Treats-Homely-House-1.0
Original UV gradients, smooth normals, real window frames, roof courses and chimney are retained.
"""
import bpy,sys,math,colorsys,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(sys.argv[sys.argv.index('--')+1])/'addons/tiny_treats_homely_house_set/Assets/gltf'
OUT=Path(__file__).resolve().parents[2]/'src/assets/village'

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
MATERIALS={}
def material(name,color):
 key=tuple(color)
 if key in MATERIALS:return MATERIALS[key]
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.86
 MATERIALS[key]=m
 return m
def rgb(value):return tuple(int(value[i:i+2],16)/255 for i in (1,3,5))
def block(name,center,size,color,bevel=3):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material(name+'_mat',rgb(color)))
 if bevel:
  b=o.modifiers.new('soft_carpentry_edges','BEVEL');b.width=bevel;b.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
  o.modifiers.new('weighted_corner_normals','WEIGHTED_NORMAL')
 return o
def cut(o,center,size):
 c=block('cutter',center,size,'#ac9475',0);bpy.context.view_layer.objects.active=o
 m=o.modifiers.new('real_walkable_interior','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=c
 bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(c,do_unlink=True)
def split_roof(o,height):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
 for f in o.data.polygons:f.select=sum(o.data.vertices[i].co.z for i in f.vertices)/len(f.vertices)>height*.53
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='SELECTED');bpy.ops.object.mode_set(mode='OBJECT')
 for n in bpy.context.selected_objects:
  if n!=o:n.name='roof_'+n.name
 o.name='body_'+o.name

def palette(image,roof,wall,accent):
 # Modify atlas tiles as gradients, never replace each face by one sampled color.
 image=image.copy();image.name='countryside_palette'
 px=list(image.pixels);width,height=image.size
 for y in range(height):
  row=int(y*4/height)
  for x in range(width):
   col=int(x*4/width);i=(y*width+x)*4;c=px[i:i+3];target=None
   if col==1 and row==1:target=roof
   elif col==3 and row==2:target=wall
   elif col==2 and row==2:target=accent
   elif col==0 and row==3:target='#779396' # muted glass, not opaque black windows
   if target:
    factor=.72+.32*max(c);px[i:i+3]=[min(1,t*factor) for t in rgb(target)]
 image.pixels=px;image.pack();return image

def export(name):
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
 print('EXPORTED',name,flush=True)
def building(name,w,d,height,roof,wall,accent):
 reset();bpy.ops.import_scene.gltf(filepath=str(ROOT/'house.gltf'))
 for o in list(bpy.context.scene.objects):
  if 'heart' in o.name:bpy.data.objects.remove(o,do_unlink=True)
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for mat in {m for o in objs for m in o.data.materials}:
  mat=mat # a fresh material is loaded for every import
  for node in mat.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:node.image=palette(node.image,roof,wall,accent)
  mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.86
 for o in objs:
  matrix=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
  for v in o.data.vertices:
   p=matrix@v.co;v.co=(p.x*w/5,p.y*d/5,p.z*height/6.5)
  if 'door' in o.name:
   # Turn the detailed source leaf into two sensibly proportioned farm doors.
   right=o.copy();right.data=o.data.copy();bpy.context.collection.objects.link(right)
   for leaf,side in [(o,-1),(right,1)]:
    hinge=Vector((0 if side<0 else w*.324,-d*.52,0))
    for v in leaf.data.vertices:
     p=v.co.copy();x=p.x*.5 if side<0 else w*.324-p.x*.5
     q=Vector((x,p.y,p.z*1.3))-hinge;a=side*1.32
     v.co=hinge+Vector((q.x*math.cos(a)-q.y*math.sin(a),q.x*math.sin(a)+q.y*math.cos(a),q.z))
    if side>0:
     bm=bmesh.new();bm.from_mesh(leaf.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(leaf.data);bm.free()
    leaf.name='body_open_door'
  elif 'chimney' in o.name:
   lo=Vector(tuple(min(v.co[k] for v in o.data.vertices) for k in range(3)));hi=Vector(tuple(max(v.co[k] for v in o.data.vertices) for k in range(3)));center=(lo+hi)/2
   roofz=height*.86-abs(center.x)/(w*.60)*height*.35
   for v in o.data.vertices:v.co=((v.co.x-center.x)*.43+center.x,(v.co.y-center.y)*.43+center.y,(v.co.z-lo.z)*.7+roofz+6)
   o.name='roof_chimney'
  else:
   # Preserve the author's rounded roof courses, dormer and matching gables.
   # Only remove the raised porch: the gameplay floor and threshold share y=0.
   bm=bmesh.new();bm.from_mesh(o.data);remove=[]
   for f in bm.faces:
    pos=f.calc_center_median()
    if pos.y<-d*.51 and pos.z<height*.1:remove.append(f)
   bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(o.data);bm.free()
   cut(o,(0,0,52),(w-44,d-44,108))
   cut(o,(w*.162,-d*.51,52),(w*.32+8,140,108))
   uv=o.data.uv_layers.active
   if uv:
    for f in o.data.polygons:
     if all(uv.data[i].uv.length<.001 for i in f.loop_indices):
      for i in f.loop_indices:uv.data[i].uv=(.875,.625)
   split_roof(o,height)
 block('interior_floor',(0,0,-3),(w-25,d-25,6),'#82684e',2)
 block('body_inner_back',(0,d/2-25,54),(w-48,8,108),'#aa9679',2)
 block('body_door_threshold',(w*.162,-d*.51,-3),(w*.34,95,6),'#aa9679',2)
 # Long plank seams and skirting on the interior floor remain visible when walls fade.
 for x in range(-int(w/2)+40,int(w/2)-20,75):block('floor_seam',(x,0,.12),(1.8,d-45,.2),'#6a5340',0)
 if name in ['hunter','barn','farmhouse']:
  # Readable timber siding and rounded corner posts, distinct from the original toy-like heart.
  for x in [-w/2,w/2]:
   for y in [-d/2,d/2]:block('body_corner_post',(x,y,48),(19,19,96),'#8c725a',4)
 if name=='shop':
  # A broad real awning, with solid rounded supports and ribbed canvas edge.
  for x in [-w*.36,w*.36]:block('body_awning_post',(x,-d*.70,45),(13,13,90),'#83684f',3)
  block('roof_shop_awning',(0,-d*.64,102),(w*.85,d*.28,12),'#ad865c',5)
  for x in range(-int(w*.4),int(w*.4),65):block('roof_awning_rib',(x,-d*.64,109),(8,d*.27,5),'#e2d1ad',2)
 if name=='clinic':
  block('body_medical_plaque',(-w*.24,-d*.505,87),(90,6,65),'#e1e4d8',6)
  block('body_cross_h',(-w*.24,-d*.515,87),(51,7,15),'#ad4d40',3);block('body_cross_v',(-w*.24,-d*.518,87),(15,7,47),'#ad4d40',3)
 if name in ['barn','farmhouse']:
  for x,z,r in [(0,0,17),(-22,28,8),(0,37,8),(22,28,8)]:
   bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=(-w*.22+x,-d*.515,height*.55+z));o=bpy.context.object;o.name='body_paw_badge';o.scale=(r,4,r);o.data.materials.append(material('paw_badge',rgb('#e1d4ae')))
 export(name)

building('hunter',840,640,420,'#82705e','#b3aa94','#6f7c69')
building('clinic',920,680,440,'#71838e','#e2e0d4','#7b9194')
building('shop',920,680,420,'#a57b52','#c6b89e','#7f8d75')
building('home',720,580,380,'#768570','#d2c9b6','#80919a')
building('barn',1200,840,540,'#657581','#b66f5c','#87917a')
building('farmhouse',1080,800,500,'#8c6b55','#c4bda7','#7e8c75')

# The deck's top is exactly z=0, with rails outside the walkable strip.
# Models are in world units: x across the bridge and y along it.
reset()
for y in range(-800,800,70):
 block('bridge_deck',(0,y+35,-7),(400,68,14),'#aa8c62',3)
for x in [-173,173]:
 block('bridge_underside_beam',(x,0,-19),(19,1640,22),'#80694d',4)
 for y in range(-770,800,220):block('bridge_rail_post',(x,y,34),(16,16,82),'#9a805e',4)
 for h in [32,66]:block('bridge_rail',(x,0,h),(9,1595,11),'#af9470',3)
export('bridge')
# Rounded source rail fences and foliage replace the pointed hex-kit variants.
for name,source in [('fence','fence_rails_long'),('tree','tree_large')]:
 reset();bpy.ops.import_scene.gltf(filepath=str(ROOT/(source+'.gltf')))
 export(name)
