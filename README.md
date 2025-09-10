## Admin Demo

当前项目已补齐以下基础能力：

- bcrypt 密码校验与签名会话 Cookie
- 统一请求封装
- 用户管理远程分页 / 搜索 / 状态筛选
- RBAC 权限控制（页面、菜单、API）

## 环境变量

至少配置以下变量：

```bash
DATABASE_URL=postgresql://...
AUTH_SECRET=replace-with-a-random-secret
```

## 管理员角色

- `super_admin`：完整权限
- `admin`：可看仪表盘、查看/新增/编辑用户、查看系统设置
- `viewer`：只读查看仪表盘和用户列表

## 密码加密

管理员密码必须以 bcrypt hash 存入 `AdminUser.password`，不要存明文。

生成 hash：

```bash
npm run password:hash -- 123456
```

新增 `AdminUser.role` 字段后，需要执行 Prisma 迁移或 `db push` 同步数据库结构。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

