import { resolve } from "node:path";
import { buildApp } from "./app.js";
const production=process.env.NODE_ENV==='production';
const origins=process.env.ALLOWED_ORIGINS||process.env.RENDER_EXTERNAL_URL||(!production?'http://127.0.0.1:5173,http://localhost:5173':'');
if(!origins)throw Error('生产环境必须设置 ALLOWED_ORIGINS 为实际 HTTPS 网站地址');
if(production&&process.env.COOKIE_SECURE!=='true')throw Error('生产环境必须开启 COOKIE_SECURE=true');
const app = await buildApp({
  databasePath: resolve(process.env.DATABASE_PATH ?? "./data/zhixing.sqlite"),
  allowedOrigins: origins
    .split(",")
    .map((s) => s.trim()),
  secureCookie: process.env.COOKIE_SECURE === "true",
  sessionDays: Number(process.env.SESSION_DAYS ?? 7),
  staticRoot:process.env.STATIC_ROOT?resolve(process.env.STATIC_ROOT):undefined,
  amapKey:process.env.AMAP_KEY,
  amapSecurityCode:process.env.AMAP_SECURITY_CODE,
});
await app.listen({
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8000),
});
console.log("智行校园后端已启动");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
