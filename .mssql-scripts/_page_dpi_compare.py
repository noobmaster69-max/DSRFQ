"""Same region of part 12 page 1: the stored 72 dpi image vs the new render."""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
old = Image.open(r"C:/Aizera/DSRFQ/DSRFQ.Web/App_Data/upload/Drawing/12/Image/"
                 r"0043-07547_03_Green_Standard_Page_1.png").convert("RGB")
new = Image.open(os.path.join(os.environ["TEMP"], "dsrfq-render-test",
                              "0043-07547_03_Green_Standard", "page_Page_1.png")).convert("RGB")

fx0, fy0, fx1, fy1 = 0.30, 0.44, 0.42, 0.52


def crop(im):
    w, h = im.size
    c = im.crop((int(fx0 * w), int(fy0 * h), int(fx1 * w), int(fy1 * h)))
    return c.resize((700, int(700 * c.height / c.width)), Image.LANCZOS)


a, b = crop(old), crop(new)
out = Image.new("RGB", (a.width * 2 + 30, a.height + 40), "white")
out.paste(a, (0, 40))
out.paste(b, (a.width + 30, 40))
d = ImageDraw.Draw(out)
d.text((10, 12), "BEFORE: 72 dpi page image (2448 x 1584)", fill="black")
d.text((a.width + 40, 12), "AFTER: 147 dpi page image (5000 x 3235)", fill="black")
path = os.path.join(HERE, "shots", "page_dpi_compare.png")
out.save(path)
print("saved", path, out.size)
