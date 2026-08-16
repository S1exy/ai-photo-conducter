# AI 图片模板小程序

模板驱动的微信原生小程序与 NestJS API MVP。小程序已接通登录、模板、图片上传、异步生成、私人作品、人工发布审核、公开流、作品互动、私人收藏、预设举报和任务轮询。当前生成适配器会复制输入图作为 Mock 输出，积分功能关闭；真实模型、自动审核供应商和 AppID 后续接入。

## 技术栈

- 微信原生小程序
- Node.js 22 + NestJS 11
- PostgreSQL + Prisma 7
- 服务器本地磁盘存储，通过 `StorageAdapter` 隔离

## 目录

```text
miniprogram/       微信原生小程序
prisma/            数据模型
src/               NestJS API
  config/          环境变量校验
  health/          存活与就绪检查
  prisma/          Prisma 服务
  storage/         本地磁盘存储适配器
```

## 后端启动

1. 安装 Node.js 22 和 PostgreSQL。
2. 复制 `.env.example` 为 `.env`，修改数据库连接和存储目录。
3. 安装依赖并创建数据库：

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
```

Windows 本地演示如果没有可用的 PostgreSQL，可在一个终端运行项目内置数据库：

```bash
npm run db:start:local
```

再在另一个终端依次运行迁移、种子和后端。Docker 可用时也可以运行 `docker compose up -d`。

完整冒烟测试：

```bash
npm run test:smoke
npm run test:review-smoke
npm run test:engagement-smoke
```

本地运营审核后台：`http://127.0.0.1:3000/admin/`。使用 `.env` 中的 `ADMIN_LOCAL_PASSWORD` 登录；该入口只在开发登录开启时可用。

检查接口：

```text
GET /api/v1/health/live
GET /api/v1/health/ready
POST /api/v1/auth/wechat-login
GET /api/v1/templates
POST /api/v1/assets/images
POST /api/v1/generations
GET /api/v1/generations
GET /api/v1/creations
POST /api/v1/creations/:id/publication
GET /api/v1/publications/feed
GET /api/v1/publications/:id
POST /api/v1/publications/:id/like
POST /api/v1/publications/:id/bookmark
POST /api/v1/publications/:id/reports
GET /api/v1/bookmarks
GET /api/v1/admin/reviews
GET /api/v1/admin/reports
```

`ready` 会同时检查 PostgreSQL 和本地存储目录是否可用。

## 小程序启动

使用微信开发者工具打开仓库根目录。`project.config.json` 已将 `miniprogram/` 设置为小程序根目录。

当前使用 `touristappid` 和 `DEV_LOGIN_ENABLED=true`。拿到正式 AppID 后修改 `project.config.json`，配置 `WECHAT_APPID`、`WECHAT_SECRET`，关闭开发登录，并在微信公众平台配置后端 HTTPS 域名。

## 当前约束

- 用户不能输入 Prompt、标题、正文、评论或自由标签。
- 每个生成任务必须绑定模板版本。
- “使用同款”必须绑定原作品使用的同一模板版本，并记录来源作品。
- 模板目录展示与生成开关相互独立；隐藏模板仍可被旧作品继续使用，只有安全或技术停用才禁止生成。
- 一次上传一张图，一次生成一张图。
- 作品默认是私人草稿，审核通过后才能进入公开流。
- `BILLING_ENABLED=false` 时积分不参与任务校验或扣除。
- `MODEL_PROVIDER=mock` 和 `MODERATION_PROVIDER=mock` 仅供主体开发。

## 开发与上线策略

当前采用“本地完成主体，最后一次性迁移到正式服务器”的方式。详细冻结条件、迁移顺序和回滚原则见 [本地优先开发计划](docs/local-first-development.md)。

## 本地磁盘注意事项

本地磁盘方案适合单实例。部署时必须：

- 将 `STORAGE_ROOT` 指向独立持久化目录；
- 定期备份数据库和图片目录；
- 不把存储目录放在发布包内部；
- 使用服务端生成的存储 key，不能信任用户文件名；
- 多实例部署前切换到 COS、S3 或 MinIO 适配器。
