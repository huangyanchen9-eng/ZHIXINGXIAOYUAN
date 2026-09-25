# 从 GitHub 部署完整可用版

代码仓库：<https://github.com/huangyanchen9-eng/ZHIXINGXIAOYUAN>

这不是 GitHub Pages 站点。仓库包含前端、真实账号后端和容器部署配置，须连接支持长期运行和持久化磁盘的托管服务。

## Render 部署入口

[使用此仓库创建 Render 服务](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fhuangyanchen9-eng%2FZHIXINGXIAOYUAN)

1. 用自己的账号登录 Render，授权读取此 GitHub 仓库。
2. 点击上面的部署入口或在 Render 创建 Blueprint，选择仓库的 `main` 分支。
3. **先查看费用再确认创建**：本配置使用 Starter 服务和1GB持久磁盘，属于付费方案。没有替你购买或开通服务。免费临时文件系统不能用于当前SQLite数据库的长期保存。
4. 按提示输入 `AMAP_KEY`（Web端JS API Key）和 `AMAP_SECURITY_CODE`（配套安全密钥）。请在托管后台输入，不要写入仓库；原本机密钥没有上传。
5. 等待服务显示 Live，使用平台提供的 HTTPS 地址。后端自动从 `RENDER_EXTERNAL_URL` 获取允许来源。
6. 在高德控制台按账户要求将新网站域名加入允许域名，然后验证地图地点搜索及步行/骑行路线。
7. 验证注册、保存记录、刷新、退出、再次登录；重新部署后再次确认记录仍在。

同一服务提供网页、`/api`接口和`/_AMapService`地图代理，不需要额外配置跨域Cookie。运行时公开配置只包含地图公共Key，安全密钥留在服务器。AI/OCR/模型仍是已有演示。

## 其他支持 Docker 的服务器

构建：`docker build -t zhixing-campus .`

运行时设置 `ALLOWED_ORIGINS=https://你的实际域名`、`AMAP_KEY`、`AMAP_SECURITY_CODE`。把宿主机持久化目录挂载到 `/data`，映射端口8000，并使用HTTPS反向代理。容器以node用户运行，挂载目录需允许该用户写入。

默认配置：`HOST=0.0.0.0`、`PORT=8000`、`COOKIE_SECURE=true`、`DATABASE_PATH=/data/zhixing.sqlite`。生产启动缺少允许来源或安全Cookie会拒绝运行。不要将 `/data` 置于临时容器文件系统。

## 更新和备份

GitHub Actions负责单元测试、构建及Docker构建检查；托管平台连接仓库后负责实际发布。数据库不提交GitHub。本机旧账号不会自动迁入云端。

备份及生产限制见 [后端说明](backend/README.md)。首次上线后应验证域名、日志、限流和备份；当前IP限流是单进程内存计数，平台反向代理后的共享IP限流需按实际规模进一步配置。

参考：[Render Web Services](https://render.com/docs/web-services)、[持久磁盘](https://render.com/docs/disks)、[Blueprint配置](https://render.com/docs/blueprint-spec)。
