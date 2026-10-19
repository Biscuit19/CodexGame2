"""Prepare the original Tiny Treats houses with playable, cat-sized interiors.
Blender 4.3:
  blender -b --python scripts/assets/build-rounded-village.py -- HOMELY_CHECKOUT PARK_CHECKOUT
Keep source palettes, door leaf, chimney, trim and smooth normals. Work on the
source in its own units before a single, explicit transform into game units.
"""
import bpy
import bmesh
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
ROOT = Path(args[0]) / 'addons/tiny_treats_homely_house_set/Assets/gltf'
PARK = Path(args[1]) / 'addons/tiny_treats_pretty_park_set/Assets/gltf' if len(args)>1 else None
OUT = Path(__file__).resolve().parents[2] / 'src/assets/village'
MATERIALS = {}

def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def rgb(value):
    values = [int(value[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values)

def material(color):
    if color not in MATERIALS:
        m = bpy.data.materials.new('countryside_' + color[1:])
        m.use_nodes = True
        n = m.node_tree.nodes.get('Principled BSDF')
        n.inputs['Base Color'].default_value = (*rgb(color),1)
        n.inputs['Roughness'].default_value = .86
        MATERIALS[color] = m
    return MATERIALS[color]

def block(name, center, size, color, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material(color))
    if bevel:
        b = o.modifiers.new('rounded_edges','BEVEL')
        b.width = bevel
        b.segments = 3
        bpy.ops.object.modifier_apply(modifier=b.name)
        o.modifiers.new('weighted_normals','WEIGHTED_NORMAL')
    return o

def cut(o, center, size):
    cutter = block('temporary_cutter', center, size, '#a7a3b7')
    for loop in cutter.data.uv_layers.active.data: loop.uv=(.875,.625)
    bpy.context.view_layer.objects.active = o
    mod = o.modifiers.new('walkable_interior','BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

def split_roof(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for f in o.data.polygons:
        f.select = sum(o.data.vertices[i].co.z for i in f.vertices)/len(f.vertices) > 3.0
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    for n in bpy.context.selected_objects:
        if n != o: n.name = 'roof_' + n.name
    o.name = 'body_' + o.name

def bake(o):
    bpy.context.view_layer.update()
    matrix = o.matrix_world.copy()
    o.parent = None
    o.data.transform(matrix)
    # Assign explicitly: mutating the matrix returned by a property leaves the
    # original object transform in place and applies child offsets a second time.
    o.matrix_world = Matrix.Identity(4)

def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',
        use_selection=True,export_animations=False,export_cameras=False,
        export_lights=False,export_apply=True)
    print('EXPORTED',name,flush=True)

def building(name,w,depth=None,vertical=None,flat=False):
    depth = depth or w*.6
    vertical = vertical or w
    reset()
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'house.gltf'))
    bpy.context.view_layer.update()
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in objects: bake(o)
    body = next(o for o in objects if o.name == 'house')
    # Original wall footprint: main 5×3, central entry 3×1; original floor z=.4.
    cut(body,(0,0,1.74),(4.7,2.7,2.78))
    cut(body,(0,-1.8,1.74),(2.7,1.2,2.78))
    # Remove the original closed backing behind the actual central door.
    cut(body,(0,-2.55,1.64),(1.66,.7,2.58))
    uv = body.data.uv_layers.active
    if uv:
        for f in body.data.polygons:
            if all(uv.data[i].uv.length<.001 for i in f.loop_indices):
                for i in f.loop_indices: uv.data[i].uv=(.875,.625)
    split_roof(body)
    door = next(o for o in objects if o.name.startswith('house_door'))
    hinge = Vector((-.81,-2.6,.4))
    turn = Matrix.Rotation(-1.9,4,'Z')
    door.data.transform(Matrix.Translation(hinge) @ turn @ Matrix.Translation(-hinge))
    door.name = 'body_open_original_door'
    for o in objects:
        if 'chimney' in o.name: o.name = 'roof_original_chimney'
        if 'heart' in o.name and name != 'home': bpy.data.objects.remove(o,do_unlink=True)
    if flat:
        for o in list(bpy.context.scene.objects):
            if o.name.startswith('roof_') and 'chimney' not in o.name:
                bpy.data.objects.remove(o,do_unlink=True)
        chimney = next(o for o in bpy.context.scene.objects if 'chimney' in o.name)
        chimney.data.transform(Matrix.Translation((0,0,-1.55)))
        # Low, rounded metal roof with original white fascia; larger floor, modest silhouette.
        block('roof_hall_fascia',(0,0,3.42),(5.65,3.6,.20),'#e4e3df',.08)
        block('roof_hall_panel',(0,0,3.57),(5.82,3.78,.19),'#d76836',.08)
        block('roof_entry_fascia',(0,-2.12,3.40),(3.45,1.35,.18),'#e4e3df',.07)
        block('roof_entry_panel',(0,-2.12,3.54),(3.62,1.45,.16),'#d76836',.07)
        for x in [-2.2,-1.1,0,1.1,2.2]:
            block('roof_panel_seam',(x,0,3.67),(.035,3.5,.025),'#ba542c',.012)
    # A simple wooden floor, no raised platform or oversized porch.
    block('interior_floor',(0,0,.375),(4.68,2.68,.05),'#b18b61',.015)
    block('interior_floor_entry',(0,-1.95,.375),(2.68,1.22,.05),'#b18b61',.015)
    for x in [-1.7,-1.1,-.5,.1,.7,1.3,1.9]:
        block('floor_seam',(x,0,.401),(.012,2.6,.003),'#826348')
    if name == 'clinic':
        block('body_medical_plate',(0,-2.67,4.0),(1.0,.06,.72),'#f3eee2',.06)
        block('body_cross_h',(0,-2.72,4.0),(.65,.05,.17),'#bf5149',.03)
        block('body_cross_v',(0,-2.73,4.0),(.17,.05,.60),'#bf5149',.03)
    elif name in ['barn','farmhouse']:
        for x,z,r in [(0,3.92,.18),(-.25,4.2,.09),(0,4.29,.09),(.25,4.2,.09)]:
            position=(x-1.9,-1.57,z-1.92) if flat else (x,-2.66,z)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=position)
            o=bpy.context.object;o.name='body_cat_badge';o.scale=(r,.04,r)
            o.data.materials.append(material('#eee9de'))
    # Preserve source proportions and original colors. Only a modest vertical
    # reduction keeps a small one-storey house in the normal combat camera.
    scale = w/5
    transform = Matrix.Diagonal((scale,depth/3,vertical/5*.85,1)) @ Matrix.Translation((0,0,-.4))
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH':
            bake(o)
            o.data.transform(transform)
    export(name)

for name,w,d,z,flat in [('hunter',270,162,220,False),('hunter-side',220,132,220,False),('shelter',160,96,160,False),('clinic',300,180,240,False),('shop',300,180,240,False),('home',200,120,200,False),('barn',380,250,250,True),('farmhouse',340,230,280,False)]:
    building(name,w,d,z,flat)

# Existing flat bridge deck: top is exactly the playing plane y=0.
reset()
for y in range(-800,800,70):
    block('bridge_deck',(0,y+35,-7),(400,68,14),'#aa8c62',3)
for x in [-173,173]:
    block('bridge_underside_beam',(x,0,-19),(19,1640,22),'#80694d',4)
    for y in range(-770,800,220): block('bridge_post',(x,y,34),(16,16,82),'#9a805e',4)
    for h in [32,66]: block('bridge_rail',(x,0,h),(9,1595,11),'#af9470',3)
export('bridge')
for name,source in [('fence','fence_rails_long'),('tree','tree_large')]:
    reset();bpy.ops.import_scene.gltf(filepath=str(ROOT/(source+'.gltf')));export(name)
if PARK:
    for name,source in [('bush','bush'),('grass','grass_A'),('flower','flower_A'),('flower-white','flower_B')]:
        reset();bpy.ops.import_scene.gltf(filepath=str(PARK/(source+'.gltf')));export(name)
# Rounded field bundle with modeled binding straps and end-grain straw rings.
reset()
bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.58,depth=1.15,location=(0,0,.58),rotation=(0,math.pi/2,0))
o=bpy.context.object;o.name='straw_bundle';o.data.materials.append(material('#cdb365'))
b=o.modifiers.new('soft_straw_edges','BEVEL');b.width=.06;b.segments=3
for x in [-.35,.35]:
    bpy.ops.mesh.primitive_torus_add(major_radius=.583,minor_radius=.025,major_segments=32,minor_segments=8,location=(x,0,.58),rotation=(0,math.pi/2,0))
    bpy.context.object.data.materials.append(material('#a58b4f'))
for x in [-.577,.577]:
    for radius in [.13,.26,.40,.52]:
        bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.012,major_segments=24,minor_segments=6,location=(x,0,.58),rotation=(0,math.pi/2,0))
        bpy.context.object.data.materials.append(material('#b39452'))
export('hay')

# Complete original props from the same Tiny Treats family and compatible KayKit furniture.
# Additional checkouts are optional; repository assets retain the generated originals.
extra = {Path(p).name:Path(p) for p in args[2:]}
for name,source in [('bench','bench_B'),('mailbox','mailbox')]:
    reset();bpy.ops.import_scene.gltf(filepath=str(ROOT/(source+'.gltf')));export(name)
if PARK:
    reset();bpy.ops.import_scene.gltf(filepath=str(PARK/'street_lantern.gltf'));export('lantern')
for checkout in extra.values():
    sources=[]
    if 'picnic' in checkout.name.lower():
        path=checkout/'addons/tiny_treats_pleasant_picnic_set/Assets/gltf'
        sources=[('blanket','picnic_blanket_green'),('basket','picnic_basket_round')]
    elif 'kitchen' in checkout.name.lower():
        path=checkout/'addons/tiny_treats_charming_kitchen_set/Assets/gltf';sources=[('fridge','fridge')]
    elif 'Furniture' in checkout.name or 'furniture' in checkout.name:
        path=checkout/'addons/kaykit_furniture_bits/Assets/gltf'
        sources=[('bed','bed_single_A'),('desk','table_medium_long'),('table','table_medium'),('chair','chair_A_wood'),('cabinet','cabinet_medium_decorated')]
    elif 'hex' in checkout.name or 'Hexagon' in checkout.name:
        path=checkout/'addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/red';sources=[('well','building_well_red')]
    for name,source in sources:
        reset();bpy.ops.import_scene.gltf(filepath=str(path/(source+'.gltf')));export(name)

# New complete source decorations, same pinned CC0 packs, no recoloring.
if PARK:
    for name,source in [('fountain','fountain'),('trashcan','trashcan'),('cobblestones','cobble_stones_large'),('bird','bird')]:
        reset();bpy.ops.import_scene.gltf(filepath=str(PARK/(source+'.gltf')));export(name)
for checkout in extra.values():
    if 'picnic' in checkout.name.lower():
        path=checkout/'addons/tiny_treats_pleasant_picnic_set/Assets/gltf'
        for name,source in [('cooler','cooler'),('radio','radio')]:
            reset();bpy.ops.import_scene.gltf(filepath=str(path/(source+'.gltf')));export(name)
    if 'hex' in checkout.name or 'Hexagon' in checkout.name:
        path=checkout/'addons/kaykit_medieval_hexagon_pack/Assets/gltf'
        for name,source in [('sacks','sack'),('pallet','pallet'),('water-bucket','bucket_water'),('target','target')]:
            reset();bpy.ops.import_scene.gltf(filepath=str(path/'decoration/props'/(source+'.gltf')));export(name)
        # Preserve the complete original timber joinery. Clear the central aisle
        # and front at cat height, so the visible open frame is genuinely enterable.
        reset();bpy.ops.import_scene.gltf(filepath=str(path/'buildings/neutral/building_scaffolding.gltf'))
        meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
        for o in meshes: bake(o)
        points=[v.co for o in meshes for v in o.data.vertices]
        lo=Vector(tuple(min(v[i] for v in points) for i in range(3)))
        hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
        center=(lo+hi)/2;size=hi-lo
        for o in meshes:
            o.data.transform(Matrix.Diagonal((300/size.x,200/size.y,140/size.z,1)) @ Matrix.Translation((-center.x,-center.y,-lo.z)))
            cut(o,(0,0,35),(260,240,72))
        block('interior_floor',(0,0,-2),(300,200,4),'#aa9b7c',2)
        export('open-workshop')

# Ruin derivative of the already hollowed original Tiny Treats house. Strip the
# independently exported roof and doorway; clip the former porch with mesh planes.
# Reusing this clean playable mesh avoids Boolean operations on open source faces.
reset();bpy.ops.import_scene.gltf(filepath=str(OUT/'hunter-side.glb'))
for o in list(bpy.context.scene.objects):
    if o.type!='MESH': continue
    if o.name.startswith('roof_') or any(part in o.name for part in ['open_original_door','floor_entry','chimney','heart']):
        bpy.data.objects.remove(o,do_unlink=True);continue
    bake(o)
    o.data.transform(Matrix.Diagonal((300/220,200/132,1,1)))
    bm=bmesh.new();bm.from_mesh(o.data)
    for co,normal in [((150,0,0),(1,0,0)),((-150,0,0),(-1,0,0)),
                      ((0,100,0),(0,1,0)),((0,-100,0),(0,-1,0)),
                      ((0,0,130),(0,0,1))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
            plane_co=co,plane_no=normal,dist=.0001,clear_outer=True,clear_inner=False)
    bm.to_mesh(o.data);bm.free();o.data.update()
    if not o.name.startswith(('interior_floor','floor_seam')):
        o.name='body_ruined_'+o.name
export('open-ruin')
