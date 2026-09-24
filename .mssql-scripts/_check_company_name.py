"""Which company name do the exported check sheets carry? (reads shots/checksheet_excel)"""
import glob
import os

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
for f in sorted(glob.glob(os.path.join(HERE, "shots", "checksheet_excel", "*.xlsx"))):
    wb = openpyxl.load_workbook(f)
    found = {}
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                v = str(c.value or "")
                if "SDN" in v:
                    found[f"{ws.title}!{c.coordinate}"] = v
    new = [k for k, v in found.items() if v == "TEST SDN BHD"]
    old = [k for k, v in found.items() if "TSH" in v]
    print(f"{os.path.basename(f)[:28]:28} TEST SDN BHD in {len(new)} sheet(s) {new[:3]}  old name left: {old or 'none'}")
