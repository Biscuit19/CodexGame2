"""Pack the rendered GLB states, preserving their transparent pixels."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
atlas=Image.new('RGBA',(11*256,2*256))
for row in range(2):
 for col in range(11):
    atlas.paste(Image.open(f'/tmp/container-sprites/{row}-{col}.png').convert('RGBA'),(col*256,row*256))
atlas.save(root/'src/assets/village/container-atlas.png',optimize=True)
