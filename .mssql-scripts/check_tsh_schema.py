"""Inspect the tsh_new.files schema behind the costing upload failure."""
import pymysql

conn = pymysql.connect(host="127.0.0.1", port=3307, user="joe",
                       password="Welcome01", database="tsh_new")
cur = conn.cursor()

cur.execute("""
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'tsh_new' AND TABLE_NAME = 'files'
    ORDER BY ORDINAL_POSITION
""")
print("%-22s %-16s %-9s %-10s %s" % ("column", "type", "nullable", "default", "extra"))
print("-" * 78)
for name, ctype, nullable, default, extra in cur.fetchall():
    print("%-22s %-16s %-9s %-10s %s" % (
        name, ctype[:16], nullable, str(default)[:10], extra))

cur.execute("SELECT @@sql_mode")
print("\nsql_mode: %s" % cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM files")
print("rows in files: %d" % cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM files WHERE file_content IS NULL")
print("rows with NULL file_content: %d" % cur.fetchone()[0])

conn.close()
