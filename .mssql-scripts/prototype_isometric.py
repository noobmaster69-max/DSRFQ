"""Prototype: render an isometric view of a 3D model without a GPU.

new_tsh cannot produce the isometric image (pythonocc-core is conda-only and
absent), but DSRFQ already converts every STEP to GLB for its 3D viewer. This
renders that GLB in software -- no pyglet, no pyrender, no display -- using
only trimesh + numpy + PIL, all of which are already installed.
"""
import math
import sys
import time

import numpy as np
import trimesh
from PIL import Image, ImageDraw

GLB = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.glb"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\iso-prototype.png"


def isometric_matrix():
    """Standard isometric: 45 deg about Z, then arctan(1/sqrt(2)) about X."""
    a = math.radians(45.0)
    b = math.atan(1.0 / math.sqrt(2.0))
    rz = np.array([[math.cos(a), -math.sin(a), 0],
                   [math.sin(a),  math.cos(a), 0],
                   [0, 0, 1]])
    rx = np.array([[1, 0, 0],
                   [0, math.cos(b), -math.sin(b)],
                   [0, math.sin(b),  math.cos(b)]])
    return rx @ rz


def render(model_path, out_path, size=1000, margin=0.06):
    t0 = time.perf_counter()
    mesh = trimesh.load(model_path, force="mesh")
    if mesh.is_empty or len(mesh.faces) == 0:
        raise SystemExit("model has no faces")
    print("loaded: %d vertices, %d faces (%.2fs)" % (
        len(mesh.vertices), len(mesh.faces), time.perf_counter() - t0))

    rot = isometric_matrix()
    verts = mesh.vertices @ rot.T
    faces = mesh.faces

    # Orthographic projection: x right, y up (image y is flipped later).
    xy = verts[:, :2]
    lo, hi = xy.min(axis=0), xy.max(axis=0)
    extent = (hi - lo).max()
    if extent <= 0:
        raise SystemExit("degenerate model extent")

    usable = size * (1 - 2 * margin)
    scale = usable / extent
    centre = (lo + hi) / 2.0
    pix = (xy - centre) * scale
    pix[:, 1] = -pix[:, 1]                      # image y grows downward
    pix += size / 2.0

    # Painter's algorithm: draw far faces first. Depth is the rotated z.
    depth = verts[faces, 2].mean(axis=1)
    order = np.argsort(depth)

    # Flat shading from a light over the viewer's shoulder.
    normals = mesh.face_normals @ rot.T
    light = np.array([-0.3, 0.4, 1.0])
    light = light / np.linalg.norm(light)
    intensity = np.clip(normals @ light, 0.0, 1.0)
    ambient, diffuse = 0.35, 0.65
    shade = ambient + diffuse * intensity

    base = np.array([90, 120, 160], dtype=float)     # steel blue
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    for idx in order:
        tri = faces[idx]
        pts = [tuple(pix[v]) for v in tri]
        colour = tuple(int(min(255, c * shade[idx])) for c in base)
        draw.polygon(pts, fill=colour)

    img.save(out_path)
    print("rendered %d faces -> %s (%.2fs total)" % (
        len(faces), out_path, time.perf_counter() - t0))
    return out_path


if __name__ == "__main__":
    render(sys.argv[1] if len(sys.argv) > 1 else GLB, OUT)
