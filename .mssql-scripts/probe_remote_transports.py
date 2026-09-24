"""Which remote-transport libraries does the shared venv already carry?

The OpenSSH client on Windows cannot take a password non-interactively, and
this box is not admin so WinRM TrustedHosts cannot be set. A library that
speaks SSH or SMB directly is the remaining route.
"""

import importlib

for name in ("paramiko", "fabric", "scp", "winrm", "pypsrp", "smbprotocol",
             "smbclient", "pysmb", "nmb"):
    try:
        mod = importlib.import_module(name)
        print(f"  {name:<12} {getattr(mod, '__version__', 'installed')}")
    except Exception:
        print(f"  {name:<12} MISSING")
