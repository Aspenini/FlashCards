#!/usr/bin/env python3
"""Start a local HTTP server and open the site in the browser for testing."""

import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))


def main():
    os.chdir(DIR)
    with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
        url = f"http://127.0.0.1:{PORT}/"
        print(f"Serving at {url}")
        print("Press Ctrl+C to stop.")
        webbrowser.open(url)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
