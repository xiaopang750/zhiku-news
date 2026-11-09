import json,sys,urllib.request,urllib.error
base='https://zhiku-article-intelligence.fwei7981.chatgpt.site'
def clean(x):
 if isinstance(x,dict):return {k:clean(v) for k,v in x.items() if k not in {'source_path','local_path','sqlite_path','inbox_path'}}
 if isinstance(x,list):return [clean(v) for v in x]
 return x
import termios
if sys.stdin.isatty():
 t=termios.tcgetattr(sys.stdin);t[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,t)
print('Ready for service token on stdin',flush=True)
token=sys.stdin.readline().strip()
headers={'OAI-Sites-Authorization':'Bearer '+token,'Content-Type':'application/json'}
fn=sys.argv[1] if len(sys.argv)>1 else None
if fn:
 data=json.load(open(fn));body=data if isinstance(data,dict) and 'articles' in data else {'articles':data};body=clean(body)
 req=urllib.request.Request(base+'/api/sync',data=json.dumps(body,ensure_ascii=False).encode(),headers=headers,method='POST')
 try:print('SYNC',urllib.request.urlopen(req,timeout=60).read().decode())
 except urllib.error.HTTPError as e: print('SYNC ERROR',e.code,e.read().decode()[:2000]);sys.exit(1)
for path in ['/api/stats','/api/articles','/']:
 req=urllib.request.Request(base+path,headers=headers)
 try:
  resp=urllib.request.urlopen(req,timeout=60);raw=resp.read().decode();print(path,resp.status,raw[:3500] if path!='/api/articles' else 'articles JSON '+str(len(raw))+' bytes')
 except urllib.error.HTTPError as e:print(path,e.code,e.read().decode()[:1000])
