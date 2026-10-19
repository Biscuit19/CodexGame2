"""Adapt KayKit CC0 models; run Blender --background --python this.py -- SOURCE_CHECKOUT."""
import bpy,sys,math,os
from pathlib import Path
from mathutils import Vector
ROOT=Path(sys.argv[sys.argv.index('--')+1])/'addons/kaykit_medieval_hexagon_pack/Assets/gltf'
OUT=Path(__file__).resolve().parents[2]/'src/assets/village';OUT.mkdir(parents=True,exist_ok=True)
MATS={}
def mat(color):
 key=tuple(round(c,3) for c in color[:3])
 if key not in MATS:
  m=bpy.data.materials.new('village_'+''.join('%02x'%int(c*255) for c in key));m.diffuse_color=(*key,1);m.use_nodes=True
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*key,1);bs.inputs['Roughness'].default_value=.9;MATS[key]=m
 return MATS[key]
def rgb(h):return tuple(int(h[i:i+2],16)/255 for i in (1,3,5))
def cube(name,center,size,color):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat(rgb(color)));return o
def boolean(o,center,size):
 cutter=cube('door_cut',center,size,'#bba17b');bpy.context.view_layer.objects.active=o
 m=o.modifiers.new('playable_opening','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter
 try:bpy.ops.object.modifier_apply(modifier=m.name)
 except: o.modifiers.remove(m)
 bpy.data.objects.remove(cutter,do_unlink=True)
def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def convert(o,roof=None,wall=None,height=1):
 mesh=o.data;uv=mesh.uv_layers.active
 image=None
 for m in mesh.materials:
  if m and m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='TEX_IMAGE' and n.image:image=n.image;break
 pixels=list(image.pixels) if image else None
 colors=[]
 for p in mesh.polygons:
  if pixels and uv:
   coords=sum((uv.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices)
   x=max(0,min(image.size[0]-1,int(coords.x*image.size[0])));y=max(0,min(image.size[1]-1,int(coords.y*image.size[1])));idx=(y*image.size[0]+x)*4
   c=tuple(pixels[idx:idx+3])
  else:c=(.6,.5,.35)
  if roof and c[2]>c[0]*1.25 and c[2]>c[1]*1.03:c=rgb(roof)
  elif wall and c[0]>.4 and c[1]>.35 and c[2]>.25 and max(c)-min(c)<.5 and sum(mesh.vertices[i].co.z for i in p.vertices)/len(p.vertices)>height*.12:c=rgb(wall)
  colors.append(mat(c))
 mesh.materials.clear();slots={}
 for p,m in zip(mesh.polygons,colors):
  if m.name not in slots:slots[m.name]=len(mesh.materials);mesh.materials.append(m)
  p.material_index=slots[m.name]
def export(name):
 # Bake the palette into vertex colors: preserve painted detail with one draw material.
 white=mat((1,1,1));nodes=white.node_tree.nodes
 vc=nodes.get('VillageVertexColor')
 if not vc:
  vc=nodes.new('ShaderNodeVertexColor');vc.name='VillageVertexColor';vc.layer_name='Color'
  white.node_tree.links.new(vc.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
 for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
  mesh=o.data;attribute=mesh.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
  for polygon in mesh.polygons:
   color=mesh.materials[polygon.material_index].diffuse_color if mesh.materials else (1,1,1,1)
   for i in polygon.loop_indices:attribute.data[i].color_srgb=color
  mesh.materials.clear();mesh.materials.append(white)
  for p in mesh.polygons:p.material_index=0
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
 print('EXPORTED',name,flush=True)

def building(name,source,w,d,height,roof,wall=None):
 reset();bpy.ops.import_scene.gltf(filepath=str(ROOT/f'buildings/blue/building_{source}_blue.gltf'))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 pts=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box];lo=Vector(tuple(min(p[k] for p in pts) for k in range(3)));hi=Vector(tuple(max(p[k] for p in pts) for k in range(3)))
 for o in objs:
  matrix=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
  for v in o.data.vertices:
   p=matrix@v.co;p.x=(p.x-(lo.x+hi.x)/2)/(hi.x-lo.x)*(w+28);p.y=(p.y-(lo.y+hi.y)/2)/(hi.y-lo.y)*(d+28);p.z=(p.z-lo.z)/(hi.z-lo.z)*height;v.co=p
  convert(o,roof,wall,height)
  boolean(o,(0,0,height*.25),(w*.6,d*.55,height*.5))
  boolean(o,(0,-d*.43,36),(125 if name=='barn' else 105,d*.6,78))
  if name=='barn':boolean(o,(-w*.43,0,36),(w*.6,110,78))
  # Separate the roof by face height, preserving original trusses, chimney and roof tiles.
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
  for f in o.data.polygons:f.select=sum(o.data.vertices[i].co.z for i in f.vertices)/len(f.vertices)>height*.53
  bpy.ops.object.mode_set(mode='EDIT')
  try:bpy.ops.mesh.separate(type='SELECTED')
  except:pass
  bpy.ops.object.mode_set(mode='OBJECT')
  for selected in bpy.context.selected_objects:
   if selected!=o:selected.name='roof_'+name
  o.name='body_'+name
 cube('interior_floor',(0,0,1),(w-25,d-25,2),'#b49a6d')
 if name=='clinic':
  cube('medical_cross_horizontal',(0,-d/2-4,91),(42,4,13),'#cf5144');cube('medical_cross_vertical',(0,-d/2-5,91),(13,4,42),'#cf5144')
 if name in ['barn','farmhouse']:
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=17,depth=3,location=(0,-d/2-3,height*.66),rotation=(math.pi/2,0,0));bpy.context.object.name='cat_sign';bpy.context.object.data.materials.append(mat(rgb('#f2e2b9')))
  for x,z,r in [(0,-4,7),(-8,6,3.7),(0,10,3.7),(8,6,3.7)]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=3.2,location=(x,-d/2-5,height*.66+z),rotation=(math.pi/2,0,0));bpy.context.object.data.materials.append(mat(rgb('#9b593a')))
 export(name)

building('hunter','home_A',210,160,145,'#8c7259')
building('clinic','home_A',230,170,145,'#657b90','#e6e4d8')
building('shop','market',230,170,145,'#cc8549')
building('home','home_A',180,145,135,'#5a7690')
building('barn','home_A',300,210,190,'#526477','#b95c51')
building('farmhouse','home_B',270,200,175,'#a95543')
for name,path in [
 ('bridge','buildings/neutral/building_bridge_B.gltf'),('fence','buildings/neutral/fence_wood_straight.gltf'),
 ('windmill','buildings/blue/building_windmill_blue.gltf'),('tree','decoration/nature/tree_single_A.gltf'),
 ('rock','decoration/nature/rock_single_A.gltf'),('logs','decoration/props/resource_lumber.gltf'),
 ('crate','decoration/props/crate_A_small.gltf'),('barrel','decoration/props/barrel.gltf'),('wheelbarrow','decoration/props/wheelbarrow.gltf')]:
 reset();p=ROOT/path
 if not p.exists():print('SKIP',p);continue
 bpy.ops.import_scene.gltf(filepath=str(p))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 if name in ['bridge','fence']:
  # Hex-kit connectors are authored on a 30-degree hex edge. Align their real
  # long axis before fitting to rectangular game footprints.
  points=[o.matrix_world@v.co for o in objs for v in o.data.vertices]
  cx=sum(p.x for p in points)/len(points);cy=sum(p.y for p in points)/len(points)
  xx=sum((p.x-cx)**2 for p in points);yy=sum((p.y-cy)**2 for p in points);xy=sum((p.x-cx)*(p.y-cy) for p in points)
  angle=.5*math.atan2(2*xy,xx-yy);rotate=(math.pi/2 if name=='bridge' else 0)-angle
  for o in objs:
   transform=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
   for v in o.data.vertices:
    q=transform@v.co;x=q.x-cx;y=q.y-cy
    v.co=(x*math.cos(rotate)-y*math.sin(rotate),x*math.sin(rotate)+y*math.cos(rotate),q.z)
 for o in objs:
  convert(o,'#786e54' if name=='windmill' else None)
  if name=='bridge':
   for index,material in enumerate(list(o.data.materials)):
    color=material.diffuse_color
    if max(color[:3])-min(color[:3])<.2:
     brightness=sum(color[:3])/3
     o.data.materials[index]=mat(rgb('#9d7950' if brightness>.45 else '#73563b'))
 if name=='fence':
  # Open up the source's solid palisade panel, retaining its original posts,
  # frame and bevelled timber. Farm boundaries read as rails, not fortress walls.
  for o in objs:
   lo=Vector(tuple(min(v.co[k] for v in o.data.vertices) for k in range(3)));hi=Vector(tuple(max(v.co[k] for v in o.data.vertices) for k in range(3)))
   extent=hi-lo
   boolean(o,((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z+extent.z*.53),(extent.x*.76,extent.y*2,extent.z*.45))
 export(name)
