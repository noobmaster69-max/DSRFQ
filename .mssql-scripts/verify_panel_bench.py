"""Browser check for the LLM benchmark card in the control panel."""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:7171"
failures = []


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(label)


with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1500, "height": 1200})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # The panel polls /api/status on a timer, so networkidle never settles.
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector(".bench tbody tr", timeout=20000)
    page.wait_for_timeout(1200)

    check("benchmark card present", page.locator(".bench").count() == 1)
    check("re-run button present", page.locator("#benchRun").count() == 1)

    rows = page.locator(".bench tbody tr")
    check("one row per backend", rows.count() == 3, "%d row(s)" % rows.count())

    text = page.locator(".bench").inner_text()
    for model in ("gemini-2.5-flash-lite", "gemma3:4b", "gemma3:12b"):
        check("shows %s" % model, model in text)
    check("shows measured timestamp", "measured" in text, text.split("\n")[1][:60])

    # local/remote tagging
    check("tags remote vs local",
          "remote" in text and "local" in text)

    # The fastest cell in each column should be highlighted.
    best = page.locator(".bench td.best")
    check("highlights fastest per column", best.count() == 2,
          "%d highlighted: %s" % (best.count(), best.all_inner_texts()))

    # Numbers actually rendered, not "—"
    nums = [t for t in page.locator(".bench td.num").all_inner_texts() if t.endswith("s")]
    check("renders timings", len(nums) == 6, str(nums))

    page.screenshot(path=r"C:\Aizera\DSRFQ\.mssql-scripts\panel-bench.png", full_page=True)
    print("  screenshot: .mssql-scripts/panel-bench.png")

    real = [e for e in errors if "favicon" not in e.lower()]
    check("no page errors", not real, "; ".join(real[:2]))
    b.close()

print("\n" + ("ALL CHECKS PASSED" if not failures else "FAILED: " + ", ".join(failures)))
sys.exit(1 if failures else 0)
