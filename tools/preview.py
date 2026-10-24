"""Serve the self-contained browser demo on loopback. No connection to a TV."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import argparse
import json
import re
from configuration import ROOT, javascript


class Preview(SimpleHTTPRequestHandler):
    demo_time=None

    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT/'app'),**kwargs)

    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()

    def send_text(self,value,mime):
        body=value.encode();self.send_response(200);self.send_header('Content-Type',mime+';charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)

    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/config.js':
            return self.send_text(javascript(),'text/javascript')
        if path=='/' and self.demo_time:
            html=(ROOT/'app/index.html').read_text()
            snippet='<script>FrameSolar.now=function(){return new Date('+json.dumps(self.demo_time)+')};</script>'
            html=re.sub(r'(?=<script src="app\.js\?v=[^"]+"></script>)',lambda _:snippet,html)
            return self.send_text(html,'text/html')
        return super().do_GET()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8766);parser.add_argument('--demo-time',help='Optional ISO time for reproducible screenshots; preview only.')
    args=parser.parse_args();Preview.demo_time=args.demo_time
    print(f'Browser demo: http://127.0.0.1:{args.port}/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Preview).serve_forever()
