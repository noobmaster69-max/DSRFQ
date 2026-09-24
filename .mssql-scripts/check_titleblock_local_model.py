"""The title block is read by a local vision model, not a hosted account.

Until 18 Sep 2026 every title block was read by one call to a hosted provider.
When that account ran out of credit the call returned 403, the service answered
200 with an empty table_content, and the conversion pasted a blank form over the
customer's real title block. Reading now runs on Ollama on this machine.

  1. the reader points at the local model by default
  2. hosted is still reachable, by environment variable only
  3. a local call is given time to load its weights, and asked for JSON
  4. failures name the thing to fix
  5. the Service Status page treats the vision model as required, and checks
     the model is actually pulled rather than only that the port answers

    C:\\Aizera\\RPA\\PythonLibrary\\.venv\\Scripts\\python.exe check_titleblock_local_model.py
"""
import ast
import io
import os
import re
import subprocess
import sys

TR = r"C:\Aizera\RPA\table-recognize-3parts"
RECOGNISE = os.path.join(TR, "replace_table", "recognize.py")
HANDLERS = r"C:\Aizera\RPA\RFQ\handlers.py"
MONITOR = r"C:\Aizera\DSRFQ\DSRFQ.Web\Modules\Costing\ServiceHealth\ServiceHealthMonitor.cs"
PY = r"C:\Aizera\RPA\PythonLibrary\.venv\Scripts\python.exe"

fails = 0


def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + str(detail)) if detail != '' else ''}")
    fails += 0 if ok else 1


def resolved(**env):
    """config.py's resolved values, under these environment variables."""
    e = dict(os.environ)
    e.pop("TITLEBLOCK_LLM_PROVIDER", None)
    e.pop("TITLEBLOCK_LLM_MODEL", None)
    e.update({k: v for k, v in env.items()})
    code = ("import sys,json; sys.path.insert(0,r'%s'); import config; "
            "print(json.dumps({k: getattr(config,k) for k in "
            "['llm_provider','llm_api_base_url','llm_api_key','llm_model_name',"
            "'llm_timeout_seconds','llm_force_json']}))" % TR)
    out = subprocess.run([PY, "-c", code], capture_output=True, text=True, env=e, cwd=TR)
    if out.returncode:
        raise RuntimeError(out.stderr[-500:])
    import json
    return json.loads(out.stdout)


print("1. local by default")
d = resolved()
check("provider is local", d["llm_provider"] == "local", d["llm_provider"])
check("pointed at Ollama on this machine",
      d["llm_api_base_url"] == "http://localhost:11434/v1", d["llm_api_base_url"])
check("a vision model, not a text one", "vl" in d["llm_model_name"].lower(), d["llm_model_name"])
check("the same model the BOM reader already uses",
      d["llm_model_name"] == "qwen2.5vl:7b", d["llm_model_name"])

cfg = io.open(os.path.join(TR, "config.py"), encoding="utf-8-sig").read()
bom = io.open(r"C:\Aizera\RPA\RFQ\config.yaml", encoding="utf-8").read()
check("so one pull serves both", d["llm_model_name"] in bom)

print("\n2. hosted is still available, by environment variable")
h = resolved(TITLEBLOCK_LLM_PROVIDER="hosted")
check("provider switches", h["llm_provider"] == "hosted")
check("and the base url with it", h["llm_api_base_url"].startswith("https://"), h["llm_api_base_url"])
check("without editing the file", "TITLEBLOCK_LLM_PROVIDER" in cfg)
m = resolved(TITLEBLOCK_LLM_MODEL="llava:13b")
check("the model can be overridden too", m["llm_model_name"] == "llava:13b", m["llm_model_name"])

print("\n3. a local call is given time, and asked for JSON")
check("a timeout long enough to load weights on a cold start",
      d["llm_timeout_seconds"] >= 120, d["llm_timeout_seconds"])
check("JSON output is requested", d["llm_force_json"] is True)

src = io.open(RECOGNISE, encoding="utf-8").read()
check("the client is given that timeout", "timeout=config.llm_timeout_seconds" in src)
check("response_format is sent", '"response_format"' in src)
check("and dropped on a retry if unsupported", 'kwargs.pop("response_format", None)' in src)
# The retry must not fire on a 404/403: that pays for the same failure twice.
ns = {"config": type("C", (), {"llm_force_json": True})()}
retry_block = re.search(r"text = str\(first\)\.lower\(\).*?if not retryable:", src, re.S)
check("the retry is gated on the error text, not on any error", retry_block is not None)
if retry_block:
    for msg, want in [("model 'qwen2.5vl:7b' not found", False),
                      ("account balance is insufficient", False),
                      ("Unsupported parameter: response_format", True),
                      ("unknown_parameter response_format", True)]:
        text = msg.lower()
        got = any(s in text for s in ("response_format", "unsupported", "unrecognized",
                                      "unknown_parameter", "invalid_request_error",
                                      "extra fields", "does not support"))
        check(f"{msg[:38]!r} -> {'retried' if want else 'reported straight away'}", got == want)

print("\n4. failures name the thing to fix")
hsrc = io.open(HANDLERS, encoding="utf-8").read()
tree = ast.parse(hsrc)
ns = {"re": re}
exec("\n\n".join(ast.get_source_segment(hsrc, n) for n in tree.body
                 if isinstance(n, ast.FunctionDef) and n.name == "_title_block_failure_reason"), ns)
reason = ns["_title_block_failure_reason"]

LOCAL_404 = ("[local] qwen2.5vl:7b at http://localhost:11434/v1: Error code: 404 - "
             "{'error': {'message': \"model 'qwen2.5vl:7b' not found\"}}")
got = reason({"title_block_error": LOCAL_404})
check("a model that was never pulled says how to pull it",
      "ollama pull" in got and "qwen2.5vl:7b" in got, got)
check("Ollama not running says to start it",
      "start Ollama" in reason({"title_block_error": "[local] x: Connection refused"}),
      reason({"title_block_error": "[local] x: Connection refused"}))
check("a cold-start timeout says to try again",
      "try it once more" in reason({"title_block_error": "Request timed out"}))
check("the hosted wording still works",
      "out of credit" in reason({"title_block_error": "403 balance is insufficient"}))
check("the recorded error names provider, model and url",
      "config.llm_provider" in src and "config.llm_model_name" in src
      and "config.llm_api_base_url" in src)

print("\n5. the Service Status page")
cs = io.open(MONITOR, encoding="utf-8-sig").read()
check("the vision model is now REQUIRED by drawing, not optional",
      re.search(r'Key = "vision-model".*?RequiredBy = \["drawing"\]', cs, re.S) is not None)
check("and is no longer described as only the parts list reader",
      "title block and the parts list" in cs)
check("probed with a kind that checks the model, not just the port",
      '"ollama-model" => await ProbeOllamaModelAsync' in cs)
check("the target names the model to look for",
      "http://localhost:11434/api/tags|qwen2.5vl:7b" in cs)
check("an empty Ollama counts as down",
      "no models are installed" in cs and "throw new InvalidOperationException" in cs)
check("and says how to fix it", "ollama pull {wanted}" in cs)
check("a re-quantised pull of the same model still counts",
      'stem + ":"' in cs)

print(f"\n{str(fails) + ' FAILED' if fails else 'ALL PASS'}")
sys.exit(1 if fails else 0)
