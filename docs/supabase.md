# 在项目中引入 Supabase

1. 安装依赖：

```bash
npm install @supabase/supabase-js
# 或
yarn add @supabase/supabase-js
```


2. 配置环境变量：复制 `.env.local.example` 为 `.env.local` 并填写值：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（任一即可，客户端使用）
- （可选）`SUPABASE_SERVICE_ROLE_KEY`（仅服务器端使用）

3. 使用方法（示例）：


- 客户端或普通模块中：

```ts
import supabase from '../lib/supabaseClient'

const { data, error } = await supabase.from('users').select('*')
```

- 服务器端（需使用服务角色 key 或在受信任的环境中）：

4. 服务器端（需使用服务角色 key 或在受信任的环境中）：

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 使用 supabaseServer 执行需要更高权限的操作
```

5. 将项目数据库切换为 Supabase（Prisma）

- 在 Supabase 控制台中，进入 `Settings` → `Database` → `Connection string`，复制 `postgresql` 连接字符串。
- 在项目根目录创建或更新 `.env.local`，将 `DATABASE_URL` 设置为 Supabase 提供的连接字符串。示例：

```env
DATABASE_URL="postgresql://postgres:yourpassword@db.<project>.supabase.co:5432/postgres?sslmode=require&schema=public"
```

- 确保 `prisma/schema.prisma` 的 `provider` 仍为 `postgresql`（本项目已配置）。
- 运行迁移以在 Supabase 数据库中部署已有迁移：

```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
# 如需在开发环境使用交互式迁移
npx prisma migrate dev --schema=prisma/schema.prisma
```

- 如需同步 Prisma Client：

```bash
npx prisma generate
```

- 注意：操作生产数据库前建议在独立测试库或备份环境中验证迁移。

4. 注意事项：
- 将 `SUPABASE_SERVICE_ROLE_KEY` 保存在服务器端环境变量，不要泄露给客户端。
- 确保在部署平台（Vercel/Netlify 等）配置相同的环境变量。
