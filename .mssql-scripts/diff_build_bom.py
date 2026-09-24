"""Textual diff of build_bom / absorb between the original and the port.

Same inputs producing different output means the code differs, so compare the
source rather than reasoning about it.
"""

import ast
import difflib

SRCS = {
    "original": r"C:\Aizera\RPA\table-transformer\extract_mbd.py",
    "ported":   r"C:\Aizera\RPA\RFQ\mbd.py",
}
FUNCS = ["build_bom", "resolve_material"]

bodies = {}
for label, path in SRCS.items():
    tree = ast.parse(open(path, encoding="utf-8").read())
    src = open(path, encoding="utf-8").read().splitlines()
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in FUNCS:
            bodies[(label, node.name)] = src[node.lineno - 1:node.end_lineno]

for fn in FUNCS:
    a = bodies.get(("original", fn), [])
    b = bodies.get(("ported", fn), [])
    print(f"\n{'='*70}\n{fn}: original {len(a)} lines, ported {len(b)} lines\n{'='*70}")
    diff = list(difflib.unified_diff(a, b, "original", "ported", lineterm="", n=2))
    if not diff:
        print("  identical")
    for line in diff:
        print(line)
