import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const workspace=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function startServer({root=workspace,port=4173}={}) {
  const server=createServer(async(req,res)=>{
    try {
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),parts=pathname.split('/');
      if(parts.some(x=>x.startsWith('.'))){res.writeHead(403).end('アクセスできません');return;}
      let path=resolve(root,'.'+pathname);
      if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
      if((await stat(path)).isDirectory())path=resolve(path,'index.html');
      const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream';
      res.writeHead(200,{'content-type':mime+(mime.startsWith('text/')||mime==='application/json'?'; charset=utf-8':''),'cache-control':'no-cache','x-content-type-options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:await readFile(path));
    }catch {res.writeHead(404,{'content-type':'text/plain; charset=utf-8'}).end('ファイルが見つかりません。');}
  });
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server));});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const server=await startServer({port:Number(process.env.PORT)||4173});console.log(`学習アプリ：http://127.0.0.1:${server.address().port}（終了は Ctrl+C）`);
}
