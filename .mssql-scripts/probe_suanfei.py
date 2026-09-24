"""Call /suanfei_tsh with the same payload the consumer sends, to see which of
the endpoint's five 404 paths is firing. The consumer only logs the status."""
import json

import requests

URL = "http://localhost:8888/suanfei_tsh"
PAYLOAD = {
    "quotation_id": 5,
    "area_id": 1,
    "strategy": "milling",
    "material_id": 1,
    "surface_treatment_id": 0,
    "heat_treatment_id": 0,
}

print("POST %s" % URL)
print("  %s\n" % json.dumps(PAYLOAD))
r = requests.post(URL, headers={"Content-Type": "application/json"},
                  json=PAYLOAD, timeout=600)
print("HTTP %s" % r.status_code)
print("body: %s" % r.text[:600])
