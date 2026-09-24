"""Seeds the first drawing-conversion template from what function.py hardcodes.

Without this the feature ships empty and the pipeline has no default to fall
back on, so the first conversion after the switchover would stamp nothing. The
coordinates are lifted verbatim from function.py's TEMPLATE_COORDS, and
source/table.png is exactly 5482x1555 -- the TEMPLATE_BASE_WIDTH/HEIGHT the
constants are expressed in -- so they transfer without rescaling.

Idempotent: re-running updates the same row rather than adding another.
"""
import io
import json
import os
import re
import shutil

import pyodbc

RFQ_SOURCE = r"C:\Aizera\RPA\RFQ\source"
UPLOAD_ROOT = r"C:\Aizera\DSRFQ\DSRFQ.Web\App_Data\upload"
APPSETTINGS = r"C:\Aizera\DSRFQ\DSRFQ.Web\appsettings.json"

TEMPLATE_NAME = "RFQ Default (migrated from function.py)"

# function.py::drawing_conversion TEMPLATE_COORDS, keyed by the row's property
# stem instead of the pipeline's display name.
COORDS = {
    "Revision":         [5248, 1010, 5477, 1173],
    "PartNumber":       [2898, 1002, 5241, 1173],
    "Description":      [2898,  766, 5477,  937],
    "Material":         [ 522, 1204, 1715, 1371],
    "Weight":           [4000, 1476, 4280, 1549],
    "AngularTolerance": [ 672,  940, 1152, 1006],
    "Surface":          [1475,  940, 1715, 1006],
    "Tolerance1":       [  19,  715,  860,  815],
    "Tolerance2":       [  19,  830,  860,  934],
    "Tolerance3":       [ 880,  715, 1707,  815],
    "Tolerance4":       [ 880,  830, 1707,  934],
}

# Relative to the upload root, which is what the column stores and what the
# /upload/ route serves.
TABLE_REL = "ToolTemplateConversion/Table/rfq-default-table.png"
LOGO_REL = "ToolTemplateConversion/Logo/rfq-default-logo.png"


def connection_string():
    with io.open(APPSETTINGS, encoding="utf-8-sig") as f:
        settings = json.load(f)
    raw = settings["Data"]["Default"]["ConnectionString"]
    # appsettings uses the System.Data.SqlClient style; pyodbc needs a driver.
    server = re.search(r"Server=([^;]*)", raw, re.I).group(1)
    database = re.search(r"(?:Initial Catalog|Database)=([^;]*)", raw, re.I).group(1)
    user = re.search(r"(?:User ID|Uid)=([^;]*)", raw, re.I).group(1)
    password = re.search(r"(?:Password|Pwd)=([^;]*)", raw, re.I).group(1)
    return ("DRIVER={ODBC Driver 17 for SQL Server};SERVER=%s;DATABASE=%s;"
            "UID=%s;PWD=%s;TrustServerCertificate=yes" % (server, database, user, password))


def copy_artwork():
    for src_name, rel in [("table.png", TABLE_REL), ("icon.png", LOGO_REL)]:
        src = os.path.join(RFQ_SOURCE, src_name)
        dst = os.path.join(UPLOAD_ROOT, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        print("  copied %s -> %s" % (src, dst))
        write_thumbnail(dst)


def write_thumbnail(path):
    """Serenity's upload pipeline writes a <name>_t.jpg next to every image and
    the ImageUploadEditor requests it by that name. Copying files in behind the
    editor's back skips that step, so the dialog 404s on the thumbnail."""
    from PIL import Image

    thumb_path = os.path.splitext(path)[0] + "_t.jpg"
    with Image.open(path) as img:
        thumb = img.convert("RGB")
        thumb.thumbnail((128, 128))
        thumb.save(thumb_path, "JPEG", quality=85)
    print("    thumbnail -> %s" % thumb_path)


def seed(conn):
    cur = conn.cursor()

    coord_cols = []
    coord_vals = []
    for stem, (x1, y1, x2, y2) in COORDS.items():
        for suffix, value in zip(["X1", "Y1", "X2", "Y2"], [x1, y1, x2, y2]):
            coord_cols.append("%s%s" % (stem, suffix))
            coord_vals.append(value)

    cur.execute("SELECT ID FROM dbo.ToolTemplateConversion WHERE Name = ?", TEMPLATE_NAME)
    existing = cur.fetchone()

    if existing:
        assignments = ", ".join("%s = ?" % c for c in coord_cols)
        cur.execute(
            "UPDATE dbo.ToolTemplateConversion SET TablePicture = ?, LogoPicture = ?, "
            "%s, UpdateDate = GETDATE(), UpdateUserId = 1 WHERE ID = ?" % assignments,
            [TABLE_REL, LOGO_REL] + coord_vals + [existing[0]])
        template_id = existing[0]
        print("  updated template ID %d" % template_id)
    else:
        columns = ["Name", "TablePicture", "LogoPicture"] + coord_cols + ["[Default]"]
        placeholders = ", ".join("?" for _ in columns)
        cur.execute(
            "INSERT INTO dbo.ToolTemplateConversion (%s) OUTPUT INSERTED.ID VALUES (%s)"
            % (", ".join(columns), placeholders),
            [TEMPLATE_NAME, TABLE_REL, LOGO_REL] + coord_vals + [0])
        template_id = cur.fetchone()[0]
        print("  inserted template ID %d" % template_id)

    # Set the default last and exclusively, mirroring what the save handler does.
    cur.execute("UPDATE dbo.ToolTemplateConversion SET [Default] = 0 WHERE ID <> ?", template_id)
    cur.execute("UPDATE dbo.ToolTemplateConversion SET [Default] = 1 WHERE ID = ?", template_id)
    conn.commit()
    return template_id


if __name__ == "__main__":
    print("copying artwork:")
    copy_artwork()
    print("seeding row:")
    with pyodbc.connect(connection_string()) as conn:
        template_id = seed(conn)
        cur = conn.cursor()
        cur.execute("SELECT ID, Name, TablePicture, [Default], RevisionX1, Tolerance4Y2 "
                    "FROM dbo.ToolTemplateConversion WHERE ID = ?", template_id)
        print("verified:", cur.fetchone())
