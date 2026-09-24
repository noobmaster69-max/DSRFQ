"""Render the title-block corner as our pipeline sees it, plus check for
optional-content layers that might be hiding the values."""
import fitz

PDF = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload\Drawing\5\0023-62709_01_Green_Standard.pdf"
OUT = r"C:\Aizera\DSRFQ\.mssql-scripts\titleblock-asrendered.png"

doc = fitz.open(PDF)
page = doc[0]
w, h = page.rect.width, page.rect.height

print("=== optional content (layers) ===")
try:
    ocgs = doc.get_ocgs()
    if not ocgs:
        print("  none")
    for xref, info in ocgs.items():
        print("  xref %s: name=%r on=%s" % (xref, info.get("name"), info.get("on")))
except Exception as exc:
    print("  %r" % exc)

try:
    print("\n  layer configs: %s" % doc.layer_ui_configs())
except Exception as exc:
    print("  layer_ui_configs: %r" % exc)

# The title block occupies the lower-right corner.
clip = fitz.Rect(w * 0.60, h * 0.78, w, h)
pix = page.get_pixmap(clip=clip, dpi=300)
pix.save(OUT)
print("\nrendered title block -> %s (%dx%d)" % (OUT, pix.width, pix.height))

# Render again with every layer forced on, to see if that changes anything.
try:
    configs = doc.layer_ui_configs()
    if configs:
        for cfg in configs:
            doc.set_layer_ui_config(cfg["number"], action=0)   # 0 = ON
        pix2 = page.get_pixmap(clip=clip, dpi=300)
        alt = OUT.replace(".png", "-layerson.png")
        pix2.save(alt)
        print("rendered with all layers on -> %s" % alt)
        print("identical to default: %s" % (pix2.samples == pix.samples))
except Exception as exc:
    print("layers-on render failed: %r" % exc)

doc.close()
