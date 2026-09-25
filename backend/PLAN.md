# 真实账号与数据保存实施说明

用户确认本轮：真实账号、全部业务数据保存。AI、OCR、DQN/LSTM 下一轮接入。保留海大青春蓝界面与真实高德配置。

## 决策

- 后端为 Node.js 24 + Fastify + 内置 SQLite。使用单独 backend 目录，原 Python 程序和数据库不修改；本机无 Python 命令，算法接入阶段可另起 Python 服务。
- 学号作为唯一登录标识，用户 ID 为服务端随机 UUID；密码采用 scrypt 加盐派生，数据库不保存明文。
- 服务端保存会话摘要，浏览器持有 HttpOnly、SameSite=Lax 会话 Cookie。7 天有效，退出撤销，改密撤销其他会话并轮换当前会话。
- 登录后返回内存 CSRF 令牌。写入接口验证 Origin、应用自定义请求头和会话 CSRF，不开放跨域读取。
- 真实用户初始数据为空，采用默认偏好。六类记录、积分演示、会话演示、偏好全部存入数据库，按已认证用户查询，不使用客户端 userId 判定所有权。
- 前端统一状态适配 `/api/state`，SQLite 分别保存账号、会话和每用户 JSON 数据快照。写入携带 revision，事务更新，冲突返回 409 并要求刷新，不静默覆盖其他设备。
- 演示用户保持浏览器本地隔离，真实用户不自动继承演示数据。登录后显式展示“账号已连接”；前端不得在 API 失败时退回 localStorage 假装成功。

## 接口

`GET /api/health`；`POST /api/auth/register`；`POST /api/auth/login`；`GET /api/auth/session`；`POST /api/auth/logout`；`PATCH /api/profile`；`POST /api/auth/password`；`GET/PUT /api/state`。

响应统一错误 `{error:{code,message,fields?}}`。资料字段保持已有前端命名。state 返回 `{userId,revision,data}`。所有请求校验字段、数量、日期、数值范围及业务条件；写入拒绝重复 ID、课程冲突、非法链接和无效日期。

## 实施与验收

1. 先写接口与持久化回归测试，覆盖注册、重复学号、错误密码、会话、CSRF、跨账号、改密与重启保存。
2. 建立数据库、校验、安全会话和接口。
3. 接通前端服务层，按用户模式区分真实/演示，串行保存并校验 revision，处理服务失联与会话过期。
4. 更新账号、设置与记录文案；保留演示业务的明确标记。
5. 运行后端测试、前端测试和构建，再用两个独立浏览器验证真实注册登录、六类记录、跨会话保存、密码变更及数据隔离。

生产部署需 HTTPS、正确的允许来源和数据库备份；本轮交付本地运行，不自动发布。
