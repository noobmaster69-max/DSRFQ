"""Run commands on the deploy target (10.228.228.143) over SSH.  python _target_ssh.py "cmd" ["cmd" ...]"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tools"))
import paramiko
HOST, USER, PASS = "10.228.228.143", "SP_Demo1", os.environ.get("TARGET_PASS", "SP_Demo1")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=30, look_for_keys=False, allow_agent=False)
for cmd in sys.argv[1:]:
    _, out, err = c.exec_command(cmd, timeout=600)
    code = out.channel.recv_exit_status()
    print(f"$ {cmd}  [exit {code}]")
    print(out.read().decode("utf-8", "replace").rstrip())
    e = err.read().decode("utf-8", "replace").strip()
    if e: print("ERR:", e[:2000])
c.close()
