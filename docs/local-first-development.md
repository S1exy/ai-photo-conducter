# 本地优先开发与一次性上线计划

## 当前原则

在小程序主体、发布审核、公开流、模型适配和内容安全链路全部通过本地验收之前，不购买或配置正式生产资源。开发阶段统一使用本地 PostgreSQL、本地磁盘、开发登录、Mock 模型和 Mock 审核。

## 阶段一：本地主体开发

- 微信开发者工具使用 `touristappid`。
- API 使用 `http://127.0.0.1:3000`。
- PostgreSQL 使用 `npm run db:start:local` 或 `docker compose up -d`。
- 图片写入 `./var/storage`。
- `DEV_LOGIN_ENABLED=true`，模型和审核 provider 保持 `mock`。
- 完成模板、生成、私人作品、发布审核、公开流、收藏、喜欢、举报和积分占位。

## 阶段二：本地完整验收

每次准备冻结一个版本时执行：

```bash
npm run typecheck
npm run build
npm run test:smoke
npm run test:review-smoke
npm run test:engagement-smoke
```

还需要在微信开发者工具中走通“生成 → 私人作品 → 申请发布 → 后台审核 → 公开流”。

## 阶段三：上线前冻结

只有以下条件全部满足才开始购买和配置正式服务器：

- 小程序页面与核心交互不再发生结构性变化。
- 至少一个真实图生图供应商已通过商用、价格、速度和内容政策评估。
- 输入图、输出图和公开内容审核策略已确定。
- 数据库迁移全部可重复执行，备份与恢复已演练。
- 正式微信 AppID、域名和隐私政策准备完成。

生产配置必须关闭开发登录，禁止 Mock provider，并使用 HTTPS。可通过 `npm run prod:preflight` 检查。

## 阶段四：一次性迁移

1. 创建正式 PostgreSQL 数据库和独立图片存储目录或对象存储。
2. 配置正式环境变量与强随机密钥。
3. 执行 `npm ci`、`npm run prisma:generate` 和 `npm run prisma:deploy`。
4. 部署 API，配置进程守护、HTTPS、备份和日志。
5. 将小程序的 API 地址、AppID 和登录模式切换到正式环境。
6. 配置微信合法请求域名、上传域名和下载域名。
7. 在正式域名执行参数化冒烟测试并提交小程序审核。

生产服务器不得执行 `prisma migrate dev`，只执行已经在本地生成并提交的 `prisma migrate deploy`。

## 回滚原则

- 上线前保留数据库和图片存储快照。
- 保留上一版 API 构建产物和环境配置。
- 新版本健康检查失败时先回滚 API，再恢复数据库或存储。
- 不在没有备份的情况下执行破坏性数据库迁移。
