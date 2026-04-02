#!/usr/bin/env python3
"""
Operator — local server
Run: python3 server.py
Then open: http://localhost:5000
"""

import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean log output
        print(f"  {self.address_string()} — {args[0]} {args[1]}")

    def end_headers(self):
        # Allow localStorage to work reliably on localhost
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    os.chdir(DIRECTORY)

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.allow_reuse_address = True
        url = f"http://localhost:{PORT}"
        print(f"\n  Operator is running.")
        print(f"  Open → {url}\n")
        print(f"  Press Ctrl+C to stop.\n")

        # Try to open browser automatically
        try:
            import webbrowser
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.\n")
            sys.exit(0)


if __name__ == "__main__":
    main()
