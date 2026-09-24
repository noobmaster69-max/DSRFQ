"""Did new_tsh's 3D processing produce the isometric renders?

/get_isometric_images_tsh reports 0 available images. It reads png_path and
png_path2 from the files table, which process_3d_file_immediate is supposed to
fill after converting the STEP file.
"""
import os

import pymysql

conn = pymysql.connect(host="127.0.0.1", port=3307, user="joe",
                       password="Welcome01", database="tsh_new",
                       cursorclass=pymysql.cursors.DictCursor)
cur = conn.cursor()

cur.execute("""
    SELECT file_id, file_name, file_type, status_id, file_path,
           png_path, png_path2, json_path, json_path_2d, upload_time
    FROM files ORDER BY file_id DESC LIMIT 6
""")
rows = cur.fetchall()
for r in rows:
    print("=" * 74)
    print("file_id %s  %s  type=%s  status_id=%s" % (
        r["file_id"], r["file_name"], r["file_type"], r["status_id"]))
    for key in ("file_path", "png_path", "png_path2", "json_path", "json_path_2d"):
        value = r[key]
        if not value:
            print("  %-13s (empty)" % key)
        else:
            print("  %-13s %s   %s" % (
                key, value[:70], "EXISTS" if os.path.exists(value) else "MISSING ON DISK"))

print("\n" + "=" * 74)
print("status_id meaning: 1 = processed, 2 = pending")
conn.close()
