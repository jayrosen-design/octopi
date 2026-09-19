"""Local-only static preview plus a fixed-destination provider bridge. No stored keys."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
import json, os, socket

ROOT = Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a): pass
    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def json_response(self,status,value):
        raw=json.dumps(value).encode();self.send_response(status)
        self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(raw)));self.end_headers()
        try:self.wfile.write(raw)
        except (BrokenPipeError,ConnectionResetError):pass
    def allowed(self):
        host=self.headers.get('Host','')
        return host in ('127.0.0.1:8765','localhost:8765') and self.headers.get('Origin','http://'+host)=='http://'+host
    def do_GET(self):
        if not self.allowed():return self.json_response(403,{'error':'Local preview only.'})
        if self.path=='/api/status':return self.json_response(200,{'navigator':bool(os.getenv('UF_NAVIGATOR_API_KEY') or os.getenv('NAVIGATOR_TOOLKIT_API_KEY')),'tavily':bool(os.getenv('TAVILY_API_KEY'))})
        if Path(urlsplit(self.path).path).suffix in ('.py','.env') or '/.' in self.path:return self.json_response(404,{'error':'Not found.'})
        if self.path=='/':self.path='/index.html'
        return super().do_GET()
    def do_POST(self):
        if not self.allowed():return self.json_response(403,{'error':'Local preview only.'})
        if self.headers.get('Content-Type')!='application/json':return self.json_response(415,{'error':'JSON required.'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=180000:raise ValueError('Request is too large or empty.')
            data=json.loads(self.rfile.read(size))
            nav=data.get('navigatorKey') or os.getenv('UF_NAVIGATOR_API_KEY') or os.getenv('NAVIGATOR_TOOLKIT_API_KEY')
            tav=data.get('tavilyKey') or os.getenv('TAVILY_API_KEY')
            if self.path=='/api/models':
                if not nav:raise ValueError('Enter a NaviGator key first.')
                result=self.provider('https://api.ai.it.ufl.edu/v1/models',nav)
                return self.json_response(200,{'models':[m['id'] for m in result.get('data',[]) if isinstance(m,dict) and isinstance(m.get('id'),str)]})
            if self.path=='/api/search':
                if not tav:raise ValueError('A Tavily key is required for web search.')
                query=data.get('query','')
                if not isinstance(query,str) or not 1<=len(query)<=4000:raise ValueError('Enter a question up to 4,000 characters.')
                result=self.provider('https://api.tavily.com/search',tav,{'query':query,'max_results':6,'search_depth':'basic','include_raw_content':False})
                return self.json_response(200,{'results':[{'title':r.get('title',''),'url':r.get('url',''),'content':r.get('content','')[:5000]} for r in result.get('results',[])]})
            if self.path=='/api/extract':
                if not tav:raise ValueError('A Tavily key is required.')
                urls=data.get('urls',[])
                if not isinstance(urls,list) or not 1<=len(urls)<=3 or any(not isinstance(u,str) or urlsplit(u).scheme not in ('http','https') for u in urls):raise ValueError('Invalid source URLs.')
                result=self.provider('https://api.tavily.com/extract',tav,{'urls':urls,'extract_depth':'basic'})
                return self.json_response(200,{'results':[{'url':r.get('url',''),'content':r.get('raw_content','')[:12000]} for r in result.get('results',[])], 'failed':len(result.get('failed_results',[]))})
            if self.path=='/api/speech':
                if not nav:return self.json_response(400,{'error':'Enter your NaviGator API key to use Kokoro speech. A chat model is not required.'})
                text=data.get('text','');voice=data.get('voice','af_heart');speed=data.get('speed',1.0)
                if not isinstance(text,str) or not 1<=len(text.strip())<=4000:raise ValueError('Speech text must contain 1 to 4000 characters.')
                if not isinstance(voice,str) or not 1<=len(voice)<=40 or any(c not in 'abcdefghijklmnopqrstuvwxyz_' for c in voice):raise ValueError('Invalid voice.')
                if not isinstance(speed,(int,float)) or not .5<=speed<=2:raise ValueError('Invalid speech speed.')
                raw=self.provider_audio(nav,{'model':'kokoro','input':text.strip(),'voice':voice,'response_format':'mp3','speed':speed})
                self.send_response(200);self.send_header('Content-Type','audio/mpeg');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers()
                try:self.wfile.write(raw)
                except (BrokenPipeError,ConnectionResetError):pass
                return
            if self.path=='/api/chat':
                if not nav:raise ValueError('A NaviGator key is required for live answers.')
                model=data.get('model');messages=data.get('messages')
                if not isinstance(model,str) or not model or not isinstance(messages,list) or not 1<=len(messages)<=20:raise ValueError('Choose a chat model and provide messages.')
                if any(not isinstance(m,dict) or m.get('role') not in ('system','user','assistant') or not isinstance(m.get('content'),str) for m in messages):raise ValueError('Invalid messages.')
                result=self.provider('https://api.ai.it.ufl.edu/v1/chat/completions',nav,{'model':model,'messages':messages,'max_tokens':1600,'temperature':.5})
                content=result.get('choices',[{}])[0].get('message',{}).get('content')
                if not isinstance(content,str):raise ValueError('This model did not return text. Select a chat model.')
                return self.json_response(200,{'text':content})
            return self.json_response(404,{'error':'Unknown action.'})
        except HTTPError as e:
            return self.json_response(502,{'error':f'Provider returned HTTP {e.code}. Check key permissions, selected model, and available credits.'})
        except (URLError,TimeoutError,socket.timeout):return self.json_response(502,{'error':'Could not reach the provider. Check your connection and try again.'})
        except (ValueError,TypeError,KeyError,IndexError):return self.json_response(400,{'error':'Check your key, selected model, and question. Use Load my models to verify access.'})
        except Exception:return self.json_response(500,{'error':'The request could not be completed.'})
    def provider_audio(self,key,body):
        if not isinstance(key,str) or len(key)>8192:raise ValueError('Invalid key.')
        req=Request('https://api.ai.it.ufl.edu/v1/audio/speech',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
        with urlopen(req,timeout=90) as response:
            raw=response.read(12_000_001)
            if not raw or len(raw)>12_000_000:raise ValueError('Invalid speech response size.')
            return raw
    def provider(self,url,key,body=None):
        if not isinstance(key,str) or len(key)>8192:raise ValueError('Invalid key.')
        req=Request(url,data=json.dumps(body).encode() if body is not None else None,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
        with urlopen(req,timeout=90) as response:return json.loads(response.read(4_000_000))
if __name__=='__main__':
    print('Deep Sea preview: http://127.0.0.1:8765',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
