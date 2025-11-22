# Next Admin Demo

## 概述
一个生产就绪的 Next.js 14 管理后台模板，具有全面的基于角色的访问控制 (RBAC)、用户管理和权限系统。

## 快速开始

### 1. 环境准备
确保你已安装以下软件：
- **Node.js 18+** - [下载地址](https://nodejs.org/)
- **PostgreSQL 数据库** - [下载地址](https://www.postgresql.org/)

### 2. 克隆项目
```bash
git clone <your-repo-url>
cd next-admin-demo
```

### 3. 安装依赖
```bash
npm install
```

### 4. 配置环境变量
创建 `.env.local` 文件：
```bash
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/admin_demo"

# 认证密钥（生成随机字符串）
AUTH_SECRET="your-random-secret-key-here"
```

### 5. 初始化数据库
```bash
# 同步数据库结构
npm run db:push

# 生成 Prisma 客户端
npm run db:generate

# 初始化数据（角色、权限、用户）
npx tsx scripts/seed.ts
```

### 6. 启动开发服务器
```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 7. 登录测试
使用以下账户登录测试：

| 用户名 | 密码 | 角色 | 权限说明 |
|--------|------|------|----------|
| `super_admin` | `123456` | 超级管理员 | 完全系统访问 |
| `admin` | `123456` | 管理员 | 用户管理、设置查看 |
| `user` | `123456` | 普通用户 | 只读权限 |

## 功能特性
- ✅ 多角色系统 (超级管理员、管理员、用户)
- ✅ 细粒度权限控制 (8 种权限类型)
- ✅ 用户 CRUD，支持远程分页和过滤
- ✅ 角色和权限管理 UI
- ✅ Bcrypt 密码哈希
- ✅ 基于会话的认证 (HTTP-only cookies)
- ✅ 带有图表和监控的仪表板
- ✅ 系统设置管理
- ✅ TypeScript 和严格类型安全

## 测试数据说明
项目已预创建 **21 个测试用户**：
- **管理员用户**: 4个 (包括默认admin)
- **普通用户**: 17个 (包括默认user)
- **禁用用户**: 3个 (用于测试状态筛选)

所有测试用户密码均为 `123456`。

### 认证流程
1. 用户在 `/login` 或 `/register` 输入凭据
2. 密码根据 bcrypt 哈希验证
3. 创建会话令牌并存储在 HTTP-only cookie 中
4. 中间件在受保护路由上验证令牌
5. 用户权限加载到 AuthProvider 上下文中

### 管理角色和权限
- 导航到 `/dashboard/permissions` 查看/管理权限
- 在数据库中将权限分配给角色
- 通过 API 创建新角色：`POST /api/roles`

### API 使用示例

**登录**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

**列出用户 (需要认证)**
```bash
curl http://localhost:3000/api/users \
  -H "Cookie: admin_session=<token>"
```

**创建用户 (需要管理员角色)**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"hash","nickname":"User"}'
```

## 数据库模式

### 用户
- id, username (唯一), password (bcrypt 哈希), nickname, email, status (1=活跃, 0=不活跃)
- 通过 user_roles 表链接到角色

### 角色
- id, name (唯一: super_admin|admin|user), description
- 通过 role_permissions 表链接到权限

### 权限
- id, code (唯一: user:view|user:create|user:edit|user:delete|role:*|settings:*)
- name (显示), description

### 系统设置
- id, key (唯一), value - 用于应用范围配置

## 项目结构
```
app/
├── (admin)/              # 受保护的管理页面
│   ├── dashboard/        # 主仪表板
│   ├── users/            # 用户管理
│   ├── permissions/      # 权限管理
│   ├── settings/         # 设置页面
│   └── profile/          # 用户资料
├── api/                  # API 路由
│   ├── auth/             # 认证端点
│   ├── users/            # 用户 CRUD
│   ├── roles/            # 角色 CRUD
│   └── permissions/      # 权限 CRUD
├── login/                # 认证页面
└── register/

components/
├── admin-layout.tsx      # 主管理布局包装器
├── permission-guard.tsx  # 基于权限的渲染
├── admin-sider.tsx       # 侧边栏导航
├── user-modal.tsx        # 用户创建/编辑模态框
└── ...

lib/
├── auth.ts               # 认证工具
├── permission.ts         # 权限检查
├── prisma.ts             # 数据库客户端
├── request.ts            # HTTP 请求包装器
└── session.ts            # 会话管理

prisma/
├── schema.prisma         # 数据库模式
└── migrations/           # 数据库迁移

scripts/
├── seed.ts               # 初始化数据库
└── hash-password.ts      # 密码哈希工具
```

## 部署

### 构建
```bash
npm run build
npm start
```

### 环境变量 (生产)
- DATABASE_URL: 生产 PostgreSQL URL
- AUTH_SECRET: 强随机密钥 (32+ 字符)
- NODE_ENV: "production"

## 关键配置文件

**next.config.mjs**
- 基本 Next.js 配置 (reactStrictMode: false)

**tailwind.config.ts**
- Tailwind CSS 配置

**tsconfig.json**
- 路径别名: @/* 用于根导入
- 启用严格 TypeScript 检查

**prisma/schema.prisma**
- 数据库模型和关系
- 提供者: PostgreSQL

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 数据库操作
npm run db:push       # 同步数据库结构
npm run db:migrate    # 创建迁移
npm run db:generate   # 生成客户端
npm run db:studio     # 打开数据库管理界面
```

## 故障排除

### 常见问题

**数据库连接失败**
```bash
# 检查 PostgreSQL 是否运行
brew services list | grep postgresql

# 检查 DATABASE_URL 格式
# 正确格式: postgresql://username:password@localhost:5432/database_name
```

**登录失败**
- 确认用户状态为启用 (status = 1)
- 检查密码是否正确哈希
- 验证 AUTH_SECRET 是否设置

**权限不足**
- 确认用户已分配相应角色
- 检查角色权限绑定是否正确
- 重启应用服务器



