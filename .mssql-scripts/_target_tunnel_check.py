"""Load the TARGET's DSRFQ login page in a local browser, through an SSH tunnel.

OneZera-Web on the target binds localhost:5001 only, so a local port is
forwarded to it over SSH. Read-only: loads the login page, nothing else.

    python _target_tunnel_check.py
"""
import os
import select
import socketserver
import sys
import threading

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

HOST, USER, PASS = "10.228.228.143", "SP_Demo1", os.environ.get("TARGET_PASS", "SP_Demo1")
LOCAL_PORT = 15001

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30, look_for_keys=False, allow_agent=False)
transport = client.get_transport()


class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        chan = transport.open_channel("direct-tcpip", ("127.0.0.1", 5001), self.request.getpeername())
        while True:
            r, _, _ = select.select([self.request, chan], [], [], 30)
            if not r:
                break
            if self.request in r:
                data = self.request.recv(65536)
                if not data:
                    break
                chan.sendall(data)
            if chan in r:
                data = chan.recv(65536)
                if not data:
                    break
                self.request.sendall(data)
        chan.close()


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True


server = Server(("127.0.0.1", LOCAL_PORT), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

HERE = os.path.dirname(os.path.abspath(__file__))
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1400, "height": 900})
    pg.goto(f"http://127.0.0.1:{LOCAL_PORT}/Account/Login", wait_until="networkidle", timeout=90000)
    pg.wait_for_timeout(1500)
    body = pg.inner_text("body")
    logos = pg.evaluate("""() => [...document.querySelectorAll('.s-site-logo-img')].map(e => getComputedStyle(e).content)""")
    icon = pg.evaluate("document.querySelector('link[rel=icon]')?.getAttribute('href')")
    print("title shown   :", "Document AI" if "Document AI" in body else ("OneZera" if "OneZera" in body else body[:60]))
    print("logo image    :", logos)
    print("favicon link  :", icon)
    print("tab title     :", pg.title())
    pg.screenshot(path=os.path.join(HERE, "shots", "target_login.png"))
    b.close()
server.shutdown()
client.close()
