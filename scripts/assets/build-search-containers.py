"""CC0 Tiny Treats / KayKit container derivatives. Blender 4.3; sources documented in asset README."""
import bpy,bmesh,math,sys
from pathlib import Path
from mathutils import Matrix,Vector
# Reuse the same beveled-detail/material/export helpers without rebuilding map assets.
parent=Path(__file__).with_name('build-rounded-village.py')
code=parent.read_text().split('for name,w,d,z,flat in')[0]
SOURCE_ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
sys.argv=[str(parent),'--',SOURCE_ARGS[0] if SOURCE_ARGS else '/tmp/tiny-homely']
exec(compile(code,str(parent),'exec'))
HOME=Path(SOURCE_ARGS[0] if len(SOURCE_ARGS)>0 else '/tmp/tiny-homely')/'addons/tiny_treats_homely_house_set/Assets/gltf'
PIC=Path(SOURCE_ARGS[1] if len(SOURCE_ARGS)>1 else '/tmp/tiny-picnic')/'addons/tiny_treats_pleasant_picnic_set/Assets/gltf'
KIT=Path(SOURCE_ARGS[2] if len(SOURCE_ARGS)>2 else '/tmp/tiny-kitchen')/'addons/tiny_treats_charming_kitchen_set/Assets/gltf'
FURN=Path(SOURCE_ARGS[3] if len(SOURCE_ARGS)>3 else '/tmp/kaykit-furniture')/'addons/kaykit_furniture_bits/Assets/gltf'
HEX=Path(SOURCE_ARGS[4] if len(SOURCE_ARGS)>4 else '/tmp/kaykit-hex')/'addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/props'
reset()
roots=[]
def source(path,w,d,h):
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(path))
    new=[o for o in bpy.context.scene.objects if o not in before]
    meshes=[o for o in new if o.type=='MESH']
    for o in meshes:bake(o)
    vs=[v.co for o in meshes for v in o.data.vertices]
    lo=Vector(tuple(min(v[i] for v in vs) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in vs) for i in range(3)));sz=hi-lo;mid=(hi+lo)/2
    trans=Matrix.Diagonal((w/sz.x,d/sz.y,h/sz.z,1))@Matrix.Translation((-mid.x,-mid.y,-lo.z))
    for o in meshes:
        o.data.transform(trans)
        for m in o.data.materials:
            if m:m.use_nodes=True;m.diffuse_color=m.diffuse_color;m.use_backface_culling=False
    for o in new:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    return meshes

def clip_top(o,z):
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
        plane_co=(0,0,z),plane_no=(0,0,1),dist=.0001,clear_outer=True,clear_inner=False)
    bm.to_mesh(o.data);bm.free();o.data.update()

def shift(objs,x=0,y=0,z=0):
    for o in objs:o.data.transform(Matrix.Translation((x,y,z)))
def turn(objs,pivot,angle,axis='X'):
    p=Vector(pivot);m=Matrix.Translation(p)@Matrix.Rotation(angle,4,axis)@Matrix.Translation(-p)
    for o in objs:
        bake(o);o.data.transform(m)
def tint(objs,color,only_blue=False):
    target=rgb(color)
    images={}
    for o in objs:
        for index,mat in enumerate(o.data.materials):
            mat=mat.copy();o.data.materials[index]=mat
            for node in mat.node_tree.nodes:
                if node.type!='TEX_IMAGE' or not node.image:continue
                original=node.image
                if original.name not in images:
                    im=original.copy();pixels=list(im.pixels)
                    for i in range(0,len(pixels),4):
                        r,g,b=pixels[i:i+3]
                        if not only_blue or (b>r*1.1 and b>g*.9):
                            lum=max(.25,(r+g+b)/3)
                            pixels[i:i+3]=[c*(.65+lum*.45) for c in target]
                    im.pixels.foreach_set(pixels);im.pack();images[original.name]=im
                node.image=images[original.name]
def cylinder(name,pos,radius,depth,color,front=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=28,radius=radius,depth=depth,location=pos,rotation=(math.pi/2,0,0) if front else (0,0,0))
    o=bpy.context.object;o.name=name;o.data.materials.append(material(color));return o

def split_front(o,w,d,h):
    # Separate original door/front triangles; preserve the original UVs, knobs and frame.
    def chosen(f):
        c=f.calc_center_median();return c.y<-d*.32 and abs(c.x)<w*.44 and c.z>h*.17
    panel=o.copy();panel.data=o.data.copy();bpy.context.collection.objects.link(panel);panel.name='opened_original_front'
    for obj,keep in [(o,False),(panel,True)]:
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.delete(bm,geom=[f for f in bm.faces if chosen(f)!=keep],context='FACES')
        bm.to_mesh(obj.data);bm.free();obj.data.update()
    return panel

for kind in ['box','litter','cabinet','medical','weapon','bed','safe','corpse','boss-corpse']:
  for opened in [False,True]:
    before=set(bpy.context.scene.objects)
    if kind=='box':
        parts=source(HOME/'package.gltf',42,32,28)
        if opened:
            for o in parts:clip_top(o,23)
            block('cardboard_inner_floor',(0,0,3),(38,28,2),'#896a48',.5)
            for side in [-1,1]:
                flap=block('folded_paper_flap',(side*25,0,26),(16,30,1.3),'#bc986b',.3)
                turn([flap],(side*18,0,24),side*.55,'Y')
        else:block('parcel_label',(0,-16.4,15),(15,.6,8),'#e6d7ae',.5)
    elif kind=='litter':
        parts=source(HEX/'bucket_empty.gltf',33,31,28)
        lid=[]
        lid.append(cylinder('bucket_wood_lid',(0,0,29),17,2.2,'#bda77b'))
        for x in [-6,0,6]:lid.append(block('bucket_lid_plank',(x,0,30.2),(4.5,26,.9),'#9d845c',.4))
        lid.append(block('lid_grip',(0,0,32),(10,3,3),'#67553e',.6))
        if opened:turn(lid,(0,14,28),-1.2)
    elif kind=='cabinet':
        parts=source(FURN/'cabinet_medium.gltf',38,28,48)
        if opened:
            for o in parts:turn([split_front(o,38,28,48)],(-17,-13,0),-1.1,'Z')
            block('dark_cabinet_interior',(0,1,24),(29,1,31),'#3d4237',.3)
            for z in [11,27]:block('inner_shelf',(0,-4,z),(30,16,1.2),'#a68b63',.2)
        block('tool_label',(0,-14.5,43),(16,1,6),'#87958c',.6)
        block('wrench_symbol',(0,-15.2,43),(10,.5,1.5),'#e3debf',.3)
    elif kind in ['medical','weapon']:
        w,d,h=(43,30,28) if kind=='medical' else (68,29,24)
        parts=source(PIC/'cooler.gltf',w,d,h)
        tint(parts,'#e0e1cf' if kind=='medical' else '#5d7257',True)
        lid=[o for o in parts if 'lid' in o.name or 'handle' in o.name]
        if kind=='medical':
            block('medical_front_cross_h',(0,-d/2-.5,13),(17,1,5),'#c84e44',.5)
            block('medical_front_cross_v',(0,-d/2-.7,13),(5,1,17),'#c84e44',.5)
            lid.append(block('medical_lid_cross_h',(0,0,h*.79),(17,5,1),'#c84e44',.4))
            lid.append(block('medical_lid_cross_v',(0,0,h*.80),(5,16,1),'#c84e44',.4))
        else:
            for x in [-23,23]:block('case_clasp',(x,-d/2-.4,14),(5,2,9),'#c6b785',.6)
            block('foam_liner',(0,0,6),(58,22,3),'#35413b',1.0)
            if not opened:block('weapon_case_plate',(0,-d/2-1,9),(18,1,4),'#d3c79e',.3)
        if opened:turn(lid,(0,d*.43,h*.75),-1.15)
    elif kind=='bed':
        basket=source(PIC/'picnic_basket_round.gltf',50,42,34)
        for o in basket:clip_top(o,23)
        pillow=source(PIC/'pillow_small_red.gltf',36,28,9);shift(pillow,z=12)
        if opened:turn(pillow,(-16,0,12),-.65,'Y');shift(pillow,x=-7,z=2)
        cylinder('cat_bed_gold_badge',(0,-21,13),3.3,1,'#d7b56e',True)
    elif kind=='safe':
        parts=source(KIT/'fridge.gltf',43,34,45)
        tint(parts,'#718a89')
        door=[]
        for o in list(parts):
            if 'door_bottom' in o.name:bpy.data.objects.remove(o,do_unlink=True);continue
            if 'door_top' in o.name:
                zs=[v.co.z for v in o.data.vertices];low,high=min(zs),max(zs)
                for v in o.data.vertices:v.co.z=5+(v.co.z-low)/(high-low)*35
                door.append(o)
        door.append(cylinder('vault_dial',(0,-18.3,23),6.2,2.6,'#d5bd83',True))
        for angle in [0,math.pi/3,2*math.pi/3]:
            bar=block('vault_dial_spoke',(0,-20.0,23),(2,1.3,13),'#f0d89c',.45)
            turn([bar],(0,-20,23),angle,'Y');door.append(bar)
        for x in [-17,17]:door.append(block('safe_hinge',(x,-18,23),(3,3,25),'#a9b9ae',.5))
        if opened:turn(door,(-20,-18,0),-1.1,'Z')
    else:
        boss=kind=='boss-corpse'
        parts=source(HEX/'crate_long_empty.gltf',34,27,19)
        if boss:tint(parts,'#374f64')
        lid=[block('loot_case_lid',(0,0,20),(36,29,3),'#3e5366' if boss else '#818d82',1.2)]
        for x in [-12,12]:
            block('loot_case_band',(x,-14,10),(3,2,20),'#c9a65c' if boss else '#62746b',.4)
            lid.append(block('lid_band',(x,0,22),(3,28,1),'#d9bb73' if boss else '#b7bd9e',.3))
        block('loot_case_lock',(0,-15,14),(7,3,6),'#e0c471' if boss else '#bac7bd',.6)
        if boss:
            for x in [-15,15]:
                for y in [-11,11]:lid.append(block('boss_gold_corner',(x,y,22),(6,6,2),'#dfbd6a',.6))
            lid.append(cylinder('boss_medallion',(0,0,22),6.5,1.2,'#e8ca73'))
            for x,y in [(-3,2),(0,3),(3,2)]:lid.append(cylinder('paw_toe',(x,y,23),1.0,1,'#3b5267'))
            lid.append(cylinder('paw_pad',(0,-2,23),2.5,1,'#3b5267'))
        else:lid.append(block('loot_stencil',(0,0,22),(12,8,.8),'#d0d6c7',.6))
        if opened:turn(lid,(0,13,19),-1.05)
    children=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
    root=bpy.data.objects.new('container_'+kind.replace('-','_')+('_open' if opened else '_closed'),None)
    bpy.context.collection.objects.link(root);roots.append(root)
    for o in children:
        bake(o);o.parent=root
        for mat in o.data.materials:
            if mat:mat.use_backface_culling=False
bpy.ops.object.select_all(action='DESELECT')
for root in roots:
    root.select_set(True)
    for obj in root.children:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'container-kit.glb'),export_format='GLB',use_selection=True,
    export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
print('EXPORTED 18 container state models',flush=True)
