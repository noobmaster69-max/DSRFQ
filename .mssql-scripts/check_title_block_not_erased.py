"""A title block that could not be read is left alone, not blanked.

Detection is local (Paddle); reading the cells is one call to a hosted vision
model. When only the read fails, the recogniser still returns perfect boxes and
an empty table_content - which used to be converted anyway, whiting out the
customer's real title block and pasting a blank form over it. Both status
columns then said Completed and nobody was told (part 41, 18 Sep 2026: the
provider's account was out of credit).

  1. the recogniser separates "read failed" from "nothing to read"
  2. the consumer can tell whether anything was read
  3. it refuses to convert when nothing was
  4. the reason names the thing to go and fix

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_title_block_not_erased.py
"""
import ast
import sys

RECOGNISE = r"C:\Aizera\RPA\table-recognize-3parts\replace_table\recognize.py"
TR_API = r"C:\Aizera\RPA\table-recognize-3parts\api.py"
HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def lift(path, names, extra=None):
    src = open(path, encoding="utf-8").read()
    tree = ast.parse(src)
    code = "\n\n".join(ast.get_source_segment(src, n) for n in tree.body
                       if isinstance(n, ast.FunctionDef) and n.name in names)
    ns = dict(extra or {})
    exec(code, ns)
    return ns, src


print("1. the recogniser separates the two failures")

# _record_llm_error stamps the provider, model and url onto the message, so it
# needs a config to read them from. Stubbed rather than imported: importing the
# real one pulls in the OpenAI client and the whole service package.
STUB_CONFIG = type("C", (), {"llm_provider": "local", "llm_model_name": "qwen2.5vl:7b",
                             "llm_api_base_url": "http://localhost:11434/v1"})()
rec_ns, rec_src = lift(RECOGNISE, ["_record_llm_error", "reset_llm_error", "last_llm_error"],
                       extra={"config": STUB_CONFIG})
rec_ns["reset_llm_error"]()
check("no error to start with", rec_ns["last_llm_error"]() is None)
rec_ns["_record_llm_error"](Exception("Error code: 403 - account balance is insufficient"))
check("a failed call is recorded", "insufficient" in (rec_ns["last_llm_error"]() or ""))
check("and kept short enough to log", len(rec_ns["last_llm_error"]()) <= 300)
rec_ns["reset_llm_error"]()
check("a new request starts clean", rec_ns["last_llm_error"]() is None)
check("the swallowed exception now records before returning None",
      "_record_llm_error(e)" in rec_src and "return None" in rec_src)

tr_src = open(TR_API, encoding="utf-8").read()
check("the response carries title_block_error", '"title_block_error": llm_error' in tr_src)
check("it is cleared at the start of each request", "reset_llm_error()" in tr_src)
check("a failed read no longer reports a plain success",
      '"检测成功" if not llm_error' in tr_src)

print("\n2. the consumer can tell whether anything was read")

ns, src = lift(HANDLERS, ["_title_block_was_read", "_title_block_failure_reason"])
was_read = ns["_title_block_was_read"]
reason = ns["_title_block_failure_reason"]

EMPTY = {"table_content": {}, "title_block": {}, "extra_info": {},
         "coordinates": {"table": {"p1": {"coordinates": [[1, 2]]}}}}
BLANKS = {"table_content": {"PART NUMBER": "", "MATERIAL": "   "},
          "title_block": {"part1": {"TITLE": ""}}, "extra_info": {}}
check("nothing read is nothing read", was_read(EMPTY) is False)
check("empty strings do not count as read", was_read(BLANKS) is False)
check("boxes found but no text is still not read",
      was_read({"table_content": {}, "coordinates": {"table": {"p1": 1}}}) is False)
check("a value in table_content counts",
      was_read({"table_content": {"PART NUMBER": "0042-52219-03"}}) is True)
check("a value in title_block alone counts",
      was_read({"table_content": {}, "title_block": {"part1": {"TITLE": "BRACKET"}}}) is True)
check("a value in extra_info alone counts",
      was_read({"extra_info": {"title_block": {"material": "AL 6061"}}}) is True)
check("a value nested in a list counts",
      was_read({"extra_info": {"notes": ["", "CLEAN PER SPEC"]}}) is True)
check("None and {} do not crash it", was_read(None) is False and was_read({}) is False)

print("\n3. it refuses to convert when nothing was read")

check("the guard runs before drawing_conversion",
      src.index("if not _title_block_was_read(process_document_data):")
      < src.index("output_file_path = drawing_conversion("))
check("and fails the stage rather than falling through",
      "_fail_drawing_stage(\n                cursor, message, _title_block_failure_reason" in src)
check("the stage failing still hands the part to ballooning",
      "_fail_drawing_stage" in src and "ballooning_without_costing" in src)

print("\n4. the reason names what to fix")

cases = [
    ({"title_block_error": "403 Your account balance is insufficient"}, "out of credit"),
    ({"title_block_error": "no_available_channel: cannot be served"}, "no longer"),
    ({"title_block_error": "Request timed out"}, "timed out"),
    ({"title_block_error": "some other provider error"}, "vision model failed"),
    ({}, "check the drawing"),
]
for payload, want in cases:
    got = reason(payload)
    check(f"{(payload.get('title_block_error') or 'no error field')[:34]!r} -> mentions {want!r}",
          want in got, got[:90])
check("every reason is a full sentence an operator can act on",
      all(len(reason(p)) > 30 for p, _ in cases))

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
