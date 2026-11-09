import json,sys,termios,urllib.request,urllib.error
if sys.stdin.isatty():
 t=termios.tcgetattr(sys.stdin);t[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,t)
print('Ready for token',flush=True);token=sys.stdin.readline().strip();base='https://zhiku-article-intelligence.fwei7981.chatgpt.site'
def get(path,auth=True):
 req=urllib.request.Request(base+path,headers={'OAI-Sites-Authorization':'Bearer '+token} if auth else {})
 with urllib.request.urlopen(req,timeout=60) as r:return r.status,r.geturl(),r.read().decode()
code,url,raw=get('/api/articles');d=json.loads(raw);print('LIST',code,'total',d['total'],'bytes',len(raw));checks=[]
for a in ([{'id':i} for i in sys.argv[1:]] if len(sys.argv)>1 else d['articles'][:3]):
 code,_,raw=get('/api/articles/'+a['id']);x=json.loads(raw);n=0
 for f in x.get('analysis',{}).get('key_points',[]):
  for e in f.get('evidence',[]):
   p=next((p for p in x.get('paragraphs',[]) if p['paragraph_id']==e['paragraph_id']),None);assert p and e['quote'] in p['content'];n+=1
 checks.append({'id':a['id'],'status':code,'verified_quotes':n})
print('DETAIL_CHECKS',json.dumps(checks));code,_,raw=get('/api/articles?q=AI');print('SEARCH_AI',code,json.loads(raw)['total'])
for path in ['/api/articles?q=__no_such_term_9x__','/api/articles?status=done','/api/articles?category=economic_report','/api/articles?from=2026-11-01','/api/articles?page=2']:
 code,_,raw=get(path);x=json.loads(raw);print('FILTER',path,code,x['total'],len(x['articles']))
try:
 code,url,raw=get('/api/articles',False);print('ANONYMOUS',code,'redirected',url!=base+'/api/articles','contains_articles',raw.startswith('{"articles"'))
except urllib.error.HTTPError as e:print('ANONYMOUS',e.code)
