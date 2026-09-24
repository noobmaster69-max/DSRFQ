"""Apply the file_content fix to tsh_new.

Runs the statement directly rather than parsing the .sql file: the explanatory
comment in that file contains a semicolon, which naive splitting mangles.
"""
import pymysql

conn = pymysql.connect(host="127.0.0.1", port=3307, user="joe",
                       password="Welcome01", database="tsh_new")
cur = conn.cursor()

cur.execute("""
    SELECT IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='tsh_new' AND TABLE_NAME='files' AND COLUMN_NAME='file_content'
""")
row = cur.fetchone()
if not row:
    print("file_content column not present - nothing to do")
else:
    nullable, ctype = row
    print("before: file_content %s, nullable=%s" % (ctype, nullable))
    if nullable == "NO":
        cur.execute("ALTER TABLE files MODIFY COLUMN file_content LONGBLOB NULL")
        conn.commit()
        print("altered to LONGBLOB NULL")
    else:
        print("already nullable - nothing to do")

cur.execute("""
    SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='tsh_new' AND TABLE_NAME='files' AND COLUMN_NAME='file_content'
""")
print("after : nullable=%s" % cur.fetchone()[0])
conn.close()
