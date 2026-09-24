"""How do area ids and material ids actually line up in tsh_new?

/suanfei_tsh requires an fa_area row for the requested area_id, and an
fa_material row matching (material_id, area_id). RFQ hardcodes both to 1.
"""
import pymysql

conn = pymysql.connect(host="127.0.0.1", port=3307, user="joe",
                       password="Welcome01", database="tsh_new")
cur = conn.cursor()

print("fa_area rows:")
cur.execute("SELECT id, name FROM fa_area ORDER BY id")
for r in cur.fetchall():
    print("  id=%s  %s" % r)

print("\nfa_material by area_id:")
cur.execute("""SELECT area_id, COUNT(*), MIN(id), MAX(id)
               FROM fa_material GROUP BY area_id ORDER BY area_id""")
for area, n, lo, hi in cur.fetchall():
    print("  area_id=%-4s %3d material(s), id range %s..%s" % (area, n, lo, hi))

print("\ndoes material id=1 exist?")
cur.execute("SELECT id, area_id, name_en FROM fa_material WHERE id = 1")
row = cur.fetchone()
print("  %s" % (row if row else "no material with id=1"))

print("\nwhat the endpoint's own query would return for (material_id=1, area_id=1):")
cur.execute("""SELECT m.id, m.area_id, m.name_en FROM fa_material m
               WHERE m.id = %s AND m.area_id = %s AND m.delete_time IS NULL""", (1, 1))
print("  %s" % (cur.fetchall() or "no rows -> would 404"))

print("\nsmallest valid (material_id, area_id) pair that satisfies both lookups:")
cur.execute("""SELECT m.id, m.area_id, m.name_en
               FROM fa_material m
               JOIN fa_area a ON a.id = m.area_id
               WHERE m.delete_time IS NULL
               ORDER BY m.id LIMIT 5""")
rows = cur.fetchall()
if rows:
    for r in rows:
        print("  material id=%s area_id=%s  %s" % r)
else:
    print("  none -- no material references an existing area")

conn.close()
