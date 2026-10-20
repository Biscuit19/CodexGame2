"""Replace scaffold sites with two roofed, weathered Tiny Treats derivatives."""
from pathlib import Path
exec(compile(Path(__file__).with_name('build-search-containers.py').read_text().split("for kind in [")[0],str(Path(__file__).with_name('build-search-containers.py')),'exec'))
for variant in ['a','b']:
    reset()
    source(OUT/'open-ruin.glb',300,200,130)
    # Keep the original wall/window geometry, add solid worn timber details and a real roof.
    for side in [-1,1]:
        for z in [20,36,52]:
            block('body_worn_side_board',(side*150,10,z),(3,166,6),'#927657' if variant=='a' else '#7c8166',.6)
        block('body_front_corner',(side*141,-100,66),(13,12,132),'#75664d',1.2)
        for z in [22,43,64]:
            block('body_front_plank',(side*119,-102,z),(45,4,16),'#a18a66',.7)
    leaf=block('body_half_open_shed_door',(-108,-113,46),(33,5,88),'#817052' if variant=='a' else '#76856c',.8)
    bake(leaf);turn([leaf],(-128,-104,0),-.4,'Z')
    for x in [-137,137]:
        for z in [30,105]:cylinder('body_old_iron_nail',(x,-107,z),1.4,1,'#596356',True)
    if variant=='a':
        for n in range(8):
            x=-140+n*40
            panel=block('roof_warped_wood',(x,0,151),(39,222,7),['#8b7156','#a18760','#937652'][n%3],1)
            bake(panel);turn([panel],(x,0,151),.075,'X')
        for x in [-144,144]:block('roof_edge_beam',(x,0,150),(10,224,12),'#67583f',1)
        block('roof_old_metal_patch',(-58,-25,159),(64,70,2),'#8e9985',.8)
        for x in [-80,-42]:block('roof_patch_strap',(x,-25,161),(3,66,1),'#5b6a58',.3)
    else:
        for side in [-1,1]:
            roof=block('roof_old_tin_panel',(side*79,0,154),(166,224,6),'#6e857c',1)
            bake(roof);turn([roof],(side*79,0,154),side*.13,'Y')
        for n in range(-7,8):
            x=n*20
            block('roof_corrugation',(x,0,168-abs(x)*.13),(2.5,220,2),'#9aa58a',.6)
        block('roof_ridge',(0,0,169),(7,225,5),'#586e65',1)
        block('roof_rusted_patch',(70,-44,164),(45,55,2),'#a07c51',.8)
    export('weathered-shed-'+variant)
