"""Are the reference tables the costing calculation depends on populated?

/suanfei_tsh looks up fa_area, fa_material, and optionally surface/heat
treatment. It returned 'Area does not exist' for area_id=1.
"""
import pymysql

conn = pymysql.connect(host="127.0.0.1", port=3307, user="joe",
                       password="Welcome01", database="tsh_new")
cur = conn.cursor()

TABLES = ["fa_area", "fa_material", "fa_surface_treatment", "fa_heat_treatment",
          "fa_quotation", "fa_quotation_task", "files"]

print("%-26s %10s" % ("table", "rows"))
print("-" * 40)
for t in TABLES:
    try:
        cur.execute("SELECT COUNT(*) FROM `%s`" % t)
        print("%-26s %10d" % (t, cur.fetchone()[0]))
    except Exception as exc:
        print("%-26s %10s" % (t, "missing"))

print("\nfa_area contents:")
try:
    cur.execute("SELECT * FROM fa_area LIMIT 8")
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    if not rows:
        print("  (empty)")
    else:
        print("  " + " | ".join(cols[:6]))
        for r in rows:
            print("  " + " | ".join(str(v)[:18] for v in r[:6]))
except Exception as exc:
    print("  error: %s" % exc)

print("\nfa_material sample (area_id=1):")
try:
    cur.execute("SELECT id, area_id, name_en FROM fa_material WHERE area_id=1 LIMIT 5")
    rows = cur.fetchall()
    print("  (empty)" if not rows else "\n".join("  %s" % (r,) for r in rows))
except Exception as exc:
    print("  error: %s" % exc)

# Which databases exist, in case the data landed elsewhere.
print("\nschemas on this server:")
cur.execute("SHOW DATABASES")
print("  " + ", ".join(r[0] for r in cur.fetchall()))
conn.close()
