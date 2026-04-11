# Neon 数据库配置

本项目通过 Prisma 连接 PostgreSQL。切换到 Neon 后，推荐使用两个连接地址：

```env
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://user:password@host.region.aws.neon.tech/neondb?sslmode=require"
```

## 参数说明

- `DATABASE_URL`：应用运行时连接地址，推荐使用 Neon pooler 地址。
- `DIRECT_URL`：Prisma 迁移、`db push` 等结构变更操作使用的直连地址。

如果 `prisma/schema.prisma` 配置了 `directUrl = env("DIRECT_URL")`，则本地和部署环境都需要配置 `DIRECT_URL`。

## 常用命令

```bash
npm run db:generate
npm run db:push
npm run db:migrate
```

生产环境执行迁移时，优先使用直连地址，避免通过连接池执行 DDL。
