# 智行校园后端

Node.js 24 + Fastify + SQLite。账号和记录真实保存，算法服务暂未接入。

## 运行与验证

```powershell
npm install
npm run dev
# 或生产构建后启动
npm run build
npm start
# 接口测试
npm test
```

默认监听 `127.0.0.1:8000`，由前端 Vite 的 `/api` 代理转发。可复制 `.env.example` 为 `.env` 调整端口、来源、数据库位置、Cookie 安全标志和会话天数。浏览器测试使用8001/5174与独立的 `data/e2e-*.sqlite`。

## 保存范围

六类生活记录、课程、待办、三餐计划与已吃记录、行程保存结果、示例测验成绩、示例 AI 对话历史、健康/饮食/模型参数设置，全量存入当前用户的数据快照。统计和图表从这些记录计算，不额外存储。地点搜索和路线仍使用高德。

数据库自动创建于 `data/zhixing.sqlite`，三张表：`users`（资料及密码派生值）、`sessions`（会话摘要、CSRF和过期时间）、`user_state`（版本号及用户 JSON 数据快照）。所有查询由服务端会话确定用户，客户端不能传入其他用户ID指定写入对象。修改采用版本比较，过期版本返回409，失败不覆盖原数据。当前结构适合比赛单机原型，后续可迁移到分记录接口和关系表。

## 接口

| 方法与路径 | 用途 |
| --- | --- |
| GET `/api/health` | 服务健康检查 |
| POST `/api/auth/register` | 注册并登录，返回201 |
| POST `/api/auth/login` | 学号密码登录 |
| GET `/api/auth/session` | 当前资料和内存 CSRF 令牌 |
| POST `/api/auth/logout` | 撤销当前会话 |
| POST `/api/auth/password` | 原密码验证、改密及会话轮换 |
| PATCH `/api/profile` | 修改姓名、年级、专业和性别 |
| GET `/api/state` | `{userId,revision,data}` |
| PUT `/api/state` | 提交 `{revision,data}`，返回新版本 |

写入请求需要允许的 Origin、`X-Zhixing-Client: web`，登录后的写入还需 `X-CSRF-Token`；前端发送 `X-User-Id` 检测其他标签页切换账号。此请求头不是权限凭证，实际权限始终由 Cookie 会话决定。错误形如 `{error:{code,message,fields?}}`；401表示登录失效，403校验失败，409重复学号/版本冲突，429请求过频。

## 账号和部署边界

- 学号作为文本，唯一但未与学校认证对接。姓名、专业等为用户自行填写。
- 密码8—64位，以随机盐+scrypt（N32768、r8、p3）派生，使用恒定时间比较，不保存明文、不输出请求内容。
- 随机会话令牌仅存在 HttpOnly、SameSite=Lax Cookie，数据库保存摘要；默认7天，退出撤销，改密撤销全部旧会话。密码与令牌不进入 localStorage。
- 新账号为空白记录；浏览器演示账号没有服务端权限，也不会自动导入真实账号。
- 默认仅在本机监听。上线需要 HTTPS、`COOKIE_SECURE=true`、正确 `ALLOWED_ORIGINS`、同源 `/api` 反向代理、SPA回退及高德安全代理；Vite preview不等同完整生产服务。当前没有上线。
- IP限流为单进程内存计数。若上线多实例或公网，应加入共享限流/账号锁定策略与运维监控。

## 备份

个人数据可在设置下载JSON/CSV。完整服务备份请先停止后端，然后复制整个 `backend/data` 文件夹（包含SQLite及可能存在的WAL文件），并按个人数据妥善保管。恢复时停止服务后替换该目录。不要仅在服务运行时复制主数据库文件。测试库与正式库文件名不同。

数据库和环境文件已加入 `.gitignore`。原Python数据库没有迁移或修改。当前迁移版本为1，未来修改表结构需添加正式迁移步骤。
