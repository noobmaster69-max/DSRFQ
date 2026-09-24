"""Make a Playwright page unable to change a part's balloons.

For UI tests that run against real parts. On 21 Sep 2026 check_remote_access
accepted every browser dialog, the ballooning editor's Export Excel asked
"You have unsaved changes... Save now and then export?", and a balloon the test
had drawn was saved onto part 41. Two layers stop that happening again:

  1. writes are blocked in the browser. Every Create / Update / Delete /
     Save call to a balloon service is aborted before it leaves the page, and
     recorded, so a test can assert none were even attempted.
  2. dialogs default to NO. A "save first?" confirm is dismissed. Leaving a
     page with unsaved edits (beforeunload) is accepted, which discards them.

    from _readonly_guard import make_read_only
    blocked = make_read_only(page)
    ...
    check("nothing tried to save", not blocked, blocked)
"""
import re

# The four services the ballooning editor saves through (BallooningDatabaseService).
_SERVICES = r"CostingPartBalloons|CostingPartBalloonAreas|CostingPartBalloonMaskZones|CostingPartBalloonGrids"
_WRITE = re.compile(rf"/Services/Costing/(?:{_SERVICES})/(Create|Update|Delete|Undelete|Save\w*)\b", re.I)


def make_read_only(page):
    """Block balloon writes on this page and default its dialogs to no.

    Returns a list that fills with every write that was attempted.
    """
    blocked = []

    def route(r):
        if _WRITE.search(r.request.url):
            blocked.append(r.request.url.split("/Services/", 1)[-1])
            r.abort()
        else:
            r.continue_()

    page.route("**/Services/Costing/**", route)

    def dialog(d):
        # Leaving with unsaved edits: yes, leave - that discards them.
        # Anything asking to confirm (save first? delete?): no.
        if d.type == "beforeunload" or d.type == "alert":
            d.accept()
        else:
            d.dismiss()

    page.on("dialog", dialog)
    return blocked
