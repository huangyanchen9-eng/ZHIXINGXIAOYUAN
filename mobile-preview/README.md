# 智行校园手机预览

入口为封面 index.html，点击“开启我的一天”进入秘书 app.html。

site.bundle.b64 是仅包含公开前端素材的 gzip JSON 文件包，工作流解包并发布到 GitHub Pages；包含源码、CSS、本地字体、校园地图及来源。没有 .env、API 密钥、用户数据库或后台进程。原应用与后端代码保持不变。

预览地址（Pages 发布成功后）：https://huangyanchen9-eng.github.io/ZHIXINGXIAOYUAN/

首次发布需要在 Settings → Pages → Build and deployment → Source 选择 GitHub Actions，然后运行 Publish mobile frontend preview 工作流。

GitHub Pages 不运行本机 AI 后端：对话和图片识别返回清楚的预览说明。界面、手动日程操作、地图浏览仍可试用。日程刷新重置；自备地图保存在当前浏览器。视频和外部地图依赖网络。

2026-09-29：390×844 手机尺寸已检查封面跳转、四项导航、日程、个人页面、校园地图，无页面脚本错误或横向溢出。
