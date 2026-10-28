# Serves station/keys/ for make.html and saves what its Save button posts
# (raw RGB, one file a key) into this folder. Local only.
import http.server, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=HERE, **k)
    def do_POST(self):
        m = re.fullmatch(r'/save/([a-z0-9]+\.rgb)', self.path)
        n = int(self.headers.get('Content-Length', 0))
        if not m or n != 72 * 72 * 3: self.send_response(400); self.end_headers(); return
        with open(os.path.join(HERE, m.group(1)), 'wb') as f: f.write(self.rfile.read(n))
        self.send_response(204); self.end_headers()
http.server.ThreadingHTTPServer(('127.0.0.1', 4197), H).serve_forever()
