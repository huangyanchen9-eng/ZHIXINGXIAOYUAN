import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildApp} from '../src/app.js';
test('生产托管支持刷新页面，接口继续鉴权，公开配置不含安全密钥',async()=>{
 const root=mkdtempSync(join(tmpdir(),'campus-static-'));writeFileSync(join(root,'index.html'),'<html>campus-app</html>');
 const app=await buildApp({databasePath:':memory:',allowedOrigins:['https://campus.example'],rateLimit:false,staticRoot:root,amapKey:'public-key',amapSecurityCode:'private-secret'});
 try{
 assert.match((await app.inject('/login')).body,/campus-app/);
 assert.equal((await app.inject('/assets/missing.js')).statusCode,404);
 assert.equal((await app.inject('/api/state')).statusCode,401);
 const config=await app.inject('/runtime-config.js');assert.match(config.body,/public-key/);assert.ok(!config.body.includes('private-secret'));
 assert.equal((await app.inject('/_AMapService/unknown')).statusCode,404);
 assert.equal((await app.inject('/.env')).statusCode,403);
 }finally{await app.close();rmSync(root,{recursive:true,force:true})}
});

