# next-rbac-admin

面向权限治理的 Next.js 中后台：敏感角色变更先审批再生效，临时管理员授权到期后在鉴权读取时立即失效，治理动作写入可检索的审计日志。

[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5-1677FF)](https://ant.design/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

界面截图来自 `npm run db:seed` 之后的本地页面：桌面 1440×900，手机 375×812。图中的账号、邮箱和 IP 都是种子数据或本机回环地址。

## 界面

### 审批中心

角色变更要先看清 diff 和风险，超级管理员通过后才写进 `UserRole`。顶部指标来自 `GET /api/governance/stats`。

![审批中心：治理指标与一条待审批的角色变更](./docs/screenshots/approvals-desktop.webp)

### 更多界面

![登录页。输入框里的 super_admin / 123456 是占位提示，不是预填值](./docs/screenshots/login-desktop.webp)

登录页。占位符提示演示账号，输入框本身是空的。

![治理概览：注册趋势、操作分布，以及用户 / 角色 / 权限数量](./docs/screenshots/dashboard-desktop.webp)

治理概览。种子用户集中在播种当天，注册趋势落在最右侧。操作分布只统计已经发生的审计事件。

![用户管理：搜索、状态和分页，共 22 条种子用户](./docs/screenshots/users-desktop.webp)

用户管理。支持搜索、状态筛选、新增编辑、批量启停 / 删除。导出 CSV 时有选中行就导出选中行，否则导出当前页。改角色会发起审批。

![权限管理：角色列表和按模块勾选的权限码](./docs/screenshots/permissions-desktop.webp)

权限管理。左侧是角色，右侧按权限码模块勾选，保存进 `role_permissions`。接口放行使用的是另一份映射，见文末说明。

![临时授权：工作时间窗内生效的授权，以及一条已过期记录](./docs/screenshots/temp-grants-desktop.webp)

临时授权。可以把普通用户临时提升为管理员，并限制在 09:00–21:00。到期时间一过，鉴权不再承认该角色。

![审计日志：按动作、操作人和时间筛选](./docs/screenshots/audit-desktop.webp)

审计日志。种子脚本不预置审计行；上图是登录之后写入的 `user.login`。

### 窄屏

宽度小于 992px 时侧栏收进抽屉。

<img src="./docs/screenshots/login-mobile.webp" alt="375 宽的登录页" width="280" />
<img src="./docs/screenshots/nav-mobile.webp" alt="手机宽度下打开的侧栏抽屉" width="280" />

## 功能

### 账号与访问控制

- 三个内置角色：`SUPER_ADMIN`、`ADMIN`、`USER`。一名用户可以同时拥有多条 `UserRole`，有效角色取优先级最高的一个（`lib/user-role.ts`）。
- 会话是自签的 HMAC-SHA256 token，放在 HTTP-only Cookie `admin_session` 里。默认 7 天，生产环境 Cookie 带 `Secure`。`authVersion` 变化后旧 token 失效。
- 登录失败记在 `login_attempts`。默认连续 5 次锁定 15 分钟，阈值可由系统设置 `max_login_attempts` 覆盖。注册按 IP（30 次）和设备（10 次）分别限流。
- 维护模式打开时，只有超级管理员可以登录。

菜单按角色裁剪：

| 角色 | 侧栏 |
| --- | --- |
| 超级管理员 | 治理概览、用户管理、权限管理、审批中心、临时授权、审计日志、系统设置 |
| 管理员 | 治理概览、用户管理、审批中心、临时授权、意见反馈 |
| 普通用户 | 治理概览、意见反馈 |

个人中心从顶栏头像进入。意见反馈面向 `USER` / `ADMIN`；超级管理员打开 `/feedback` 会看到 403，未读反馈仍可以从通知铃铛查看。

运行时权限以 `constants/permission.ts` 的 `ROLE_PERMISSION_MAP` 为准，共 16 个权限码（`user:*`、`settings:*`、`role:*`、`change:*`、`temp:*`）：

| 角色 | 接口侧拥有的权限 |
| --- | --- |
| `USER` | `user:view` |
| `ADMIN` | 用户查看 / 创建 / 编辑，`role:view`，发起角色变更，授予临时权限 |
| `SUPER_ADMIN` | 全部，包括删除、系统设置、审批通过 / 驳回、立即回收临时授权 |

### 权限治理

- **审批中心 `/approvals`**：发起 `USER` / `ADMIN` 之间的角色变更，展示当前角色到目标角色的 diff 和风险提示。管理员可以提议，只有超级管理员可以通过或驳回。通过之后才在事务里修改 `UserRole` 并写审计。
- **临时授权 `/temp-grants`**：把普通用户临时提升为 `ADMIN`，时长可选 1 / 2 / 4 / 8 / 24 小时。可以勾选「仅工作时间」（09:00–21:00，含起点、不含终点）。超级管理员可以立即回收。
- **治理指标**：审批中心顶部展示待审批、已通过、已驳回、生效中的临时授权、已自动回收，以及按时回收率。回收率 = 已过期条数 /（已过期 + 已手动回收）；两边都是 0 时为空。
- **审计日志 `/audit`**：可按动作、操作人、时间筛选并导出 CSV。治理动作包括 `change.submit`、`change.approve`、`change.reject`、`temp.grant`、`temp.revoke`、`temp.expire`，同时记录登录、用户变更和设置修改。

### 临时授权何时失效

临时 `ADMIN` 会写进 `UserRole`，到期时间记在 `temp_grants.expiresAt`。权限是否还在，不依赖定时任务有没有跑：

1. **鉴权读取。** `getCurrentAdminUser`（因此 `requirePermission` 和 `GET /api/profile` 都算）以及登录签发 session 时，都会调用 `applyActiveTempGrants`。状态仍是 `ACTIVE`，但 `expiresAt` 已过，或工作时间窗当前不满足，这条临时角色立刻不计入有效角色。`expiresAt` 等于当前时刻时仍有效。
2. **打开列表时懒回收。** `GET /api/temp-grants` 调用 `expireDueGrants`：删掉提升上来的角色，把记录改成 `EXPIRED`，并写一条 `temp.expire`（操作人记为 `system`）。
3. **每小时兜底。** `vercel.json` 登记 `0 * * * *`，请求 `GET /api/cron/expire-grants`。这条路径在 `middleware.ts` 里免登录，由 `CRON_SECRET` 鉴权。请求需要 `Authorization: Bearer <CRON_SECRET>`；在 Vercel 配好同名环境变量后，平台 Cron 会自动带上。也可以用 `?secret=` 手动触发。比较是逐字节异或。未配置密钥，或密钥不对，一律 401，不会执行回收。

工作时间用的是 **Node 进程的本地时区**（Vercel 上是 UTC）。

### 后台交互

- 后台页面是客户端渲染。`app/(admin)/*/page.tsx` 返回 `null`，真正的界面由 `lib/page-registry.tsx` 挂到多标签容器里。
- 已打开的标签保持挂载，用 `display` 切换。刷新某个标签只增加它自己的 `version`，其它标签的状态还在。
- 根布局在 hydration 之前用阻塞脚本读取 `localStorage` 的 `next-admin-theme`（缺省为亮色），写上 `data-theme`。
- 客户端 `request()` 默认超时 15 秒。只有 GET 在网络错误或 408 / 429 / 500 / 502 / 503 / 504 时再试一次，间隔 200ms 起的指数退避。
- 治理概览每 60 秒拉一次 `/api/admin/stats`，标签页隐藏时暂停。

## 技术栈

| | |
| --- | --- |
| 应用 | Next.js 14.2（App Router）、React 18、TypeScript 严格模式 |
| UI | Ant Design 5、Tailwind CSS 3 |
| 数据 | Prisma 6、PostgreSQL。Compose 与 Dockerfile 使用 PostgreSQL 16、Node.js 20 |
| 认证 | Web Crypto HMAC-SHA256、HTTP-only Cookie。生产环境必须配置 `AUTH_SECRET` |
| 图表 | Recharts |
| 测试 | Vitest 3（Node 环境） |
| 部署形态 | `output: 'standalone'`，另有 Dockerfile 与 `vercel.json` |

```mermaid
flowchart TB
  user[浏览器]
  mw[middleware.ts]
  pages[后台页面与 keep-alive 标签]
  api[app/api Route Handlers]
  auth[getCurrentAdminUser 读取时丢掉过期临时角色]
  db[(PostgreSQL)]
  cron[Vercel Cron 每小时]

  user --> mw
  mw -->|Session 有效| pages
  mw -->|页面未登录| login[/login]
  mw -->|API 未登录| deny[401]
  pages -->|fetch| api
  api --> auth
  auth --> db
  cron -->|Bearer CRON_SECRET| expire["GET /api/cron/expire-grants"]
  expire --> db
```

`/api/cron/` 在 middleware 中放行，回收接口自己校验 `CRON_SECRET`。

## 快速开始

前置：Node.js >= 18.17（Next.js 14.2 的 engines；镜像使用 Node 20）和 PostgreSQL。下面的安装、同步结构、播种、开发服务器和 `npm test` 已在当前 `develop` 上跑通。开发服务器地址是 http://localhost:3000 。

```bash
npm install
```

复制环境变量后填上数据库和密钥：

```bash
cp .env.example .env.local
```

| 变量 | 含义 | 默认 | 是否必填 |
| --- | --- | --- | --- |
| `DATABASE_URL` | Prisma 使用的 PostgreSQL 连接串 | 无 | 是 |
| `AUTH_SECRET` | 签名 `admin_session` 的密钥。可用 `openssl rand -hex 32` 生成 | 非生产环境回退到代码里的开发密钥 | 生产必填 |
| `NEXTAUTH_SECRET` | 只在没设 `AUTH_SECRET` 时作为别名读取 | 无 | 否 |
| `CRON_SECRET` | 保护到期回收接口。可用 `openssl rand -hex 32` 生成 | 无 | 调用 `/api/cron/expire-grants` 时必填。不设置不影响 `npm run dev`，该接口会返回 401 |
| `DIRECT_URL` | `.env.example` 里为 Neon 直连预留 | 空 | 否。`schema.prisma` 没有 `directUrl`，Prisma 目前不读它 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | 只被 `docker-compose.yml` 使用 | `rbac` / `rbac_password` / `rbac_db` | 否 |

本机没有数据库时，Compose 里的 `postgres` 服务是 PostgreSQL 16，映射到 `5432`，对应连接串：

```bash
docker compose up -d postgres
```

```text
postgresql://rbac:rbac_password@127.0.0.1:5432/rbac_db
```

然后同步结构并播种：

```bash
npm run db:push
npm run db:generate
npm run db:seed
npm run dev
```

`npm run db:migrate` 是 `prisma migrate dev`，仓库里已有 `prisma/migrations`。上面的快速开始用的是已执行过的 `db:push`。

### 演示账号

三个内置账号和其余种子用户的密码都是 `123456`。这是本地演示口令，不要带到真正的环境里。

| 用户名 | 角色 | 适合看什么 |
| --- | --- | --- |
| `super_admin` | 超级管理员 | 全部治理页面，包括审批按钮和审计日志 |
| `admin` | 管理员 | 发起角色变更、授予临时权限；没有通过 / 驳回和强制回收 |
| `user` | 普通用户 | 治理概览和意见反馈 |

播种结果：22 个用户（3 个禁用：`manager3`、`developer5`、`sales3`），16 条权限，3 条意见反馈，1 条待审批（`developer1`：普通用户 → 管理员）和 1 条已通过的变更记录，1 条生效中的临时授权（`developer3`，带工作时间窗，约 4 小时）和 1 条已过期记录（`developer4`）。脚本结束时打印的「21 个用户」与实际插入的 22 行不一致。

用 `admin` 在审批中心提交一条变更，再用 `super_admin` 通过，然后到审计日志里能看到对应事件。

### 测试

```bash
npm test                 # vitest run
npm run test:watch       # 监听
npm run test:coverage    # lib/**/*.ts，排除 lib/prisma.ts，输出 text 与 lcov
npm test -- --run __tests__/lib/admin-user.test.ts
```

用例在 `__tests__/lib` 和 `__tests__/api`，包括临时授权的读取时失效和 Cron 鉴权。

### 构建与部署

```bash
npm run build            # prisma generate && next build
npm start                # next start，默认端口 3000
npm run lint
```

`next.config.mjs` 使用 `output: 'standalone'`。Dockerfile 是 Node 20 的多阶段构建，容器内 `PORT=3000`。

`docker compose up` 会构建应用并等待数据库健康检查。应用服务会注入 `DATABASE_URL` 和 `AUTH_SECRET`，**不会**注入 `CRON_SECRET`。要在这套 Compose 里调用回收接口，需要自己把 `CRON_SECRET` 传进 `app` 服务。Compose 本身不跑每小时任务，那是 `vercel.json` 交给 Vercel Cron 的。

部署到 Vercel 时配置 `DATABASE_URL`、`AUTH_SECRET` 和 `CRON_SECRET`。Cron 路径是 `/api/cron/expire-grants`，周期 `0 * * * *`。本仓库没有附带线上访问地址。Neon 连接串的写法见 [docs/neon.md](./docs/neon.md)；在 schema 声明 `directUrl` 之前，`DIRECT_URL` 不会生效。

## 目录

```text
app/
  (admin)/                 后台路由壳，页面组件返回 null
  api/                     登录、用户、角色、审批、临时授权、Cron、审计
  login/  register/
  layout.tsx               metadata 与主题初始化脚本
components/                布局、多标签、各页面内容
constants/permission.ts    角色、权限码、ROLE_PERMISSION_MAP
lib/                       session、鉴权、治理纯函数、请求封装
prisma/                    schema 与 migrations
scripts/seed.ts
__tests__/
middleware.ts
vercel.json                每小时回收到期授权
docker-compose.yml
Dockerfile
```

## 实现要点

**读取时失效，定时任务只负责清数据。** `lib/admin-user.ts` 的 `effectiveRoleNames` 以仍为 `ACTIVE` 的 `temp_grants` 为准：某个角色只要存在这类授权，就只有「未过期且工作时间窗当前满足」才保留。没有对应授权的角色视为常驻角色。因此 Cron 停了，过期用户也不会继续拿着管理员权限。最近一次相关改动把登录签发 session 也纳入了同一套过滤，并补上了 Cron 密钥校验的测试。

**提议和批准分开。** 管理员拥有 `change:submit` 与 `temp:grant`。`change:approve` 和 `temp:revoke` 只在超级管理员的映射里。用户管理里的批量改角色走 `POST /api/change-requests`，通过之前不改 `UserRole`。

**会话不依赖 NextAuth。** `lib/session.ts` 用 `AUTH_SECRET`（或开发环境的内置密钥）做 HMAC。middleware 验签并检查过期。修改自己的密码，或由超级管理员重置密码时，`authVersion` 加一，旧 Cookie 不再通过 `getCurrentAdminUser`。自己改密会给当前设备重签一份新 session。

**标签保持挂载。** `components/tab-pages-host.tsx` 按已打开的 tab 渲染注册表组件。关闭标签才卸载。

**三层检查各做各的事。** middleware 挡住没有 session 的页面和 API；`PermissionGuard` 负责不把没权限的页面画出来；`requirePermission` 才决定数据能不能读写。

## 已知限制

这些都是当前代码里的行为，不是排期。

- 权限页保存的是数据库 `role_permissions`。`requirePermission` 读取的是 `ROLE_PERMISSION_MAP`。在矩阵里改勾选，不会改变三个内置角色调用 API 的结果。自定义角色名对不上 `SUPER_ADMIN` / `ADMIN` / `USER` 时，`resolveRoleFromNames` 按 `USER` 处理。
- 已打开的标签一直挂着。Antd Modal 默认挂到 `document.body`，切换标签时没关上的弹层会留在新标签上面。
- 临时授权查询失败时，`applyActiveTempGrants` 保留库里的原角色，避免所有人被锁在外面。工作时间条件解析失败时视为满足。两条都是可用性优先。
- 种子脚本写入的键是 `allow_registration`，注册接口和系统设置读的是 `allow_register`。播种完成后注册默认关闭，要在系统设置里打开「允许用户注册」。
- 种子里那条「已通过」的变更只插入了 `change_requests` 行，没有把 `developer2` 改成管理员。生效中的临时授权则会同时补上 `UserRole`。
- 公告和监控已经从侧栏拿掉，对应组件以及 `/api/admin/announcements` 等接口还在仓库里。
- 仓库里没有 CI workflow。

## License

[MIT](./LICENSE)

---

> **声明**：本仓库为个人项目，仅供学习交流。

### 临时授权写入与异常处理

临时授予接口在写入前校验参数类型，在同一个串行化 Prisma 事务中校验目标当前角色、授予角色、创建到期记录和写审计。任一步失败均回滚；并发状态冲突返回 409，调用方刷新后重试。临时授权查询失败时拒绝本次鉴权，不回退到可能包含过期临时权限的角色。

本次修复防止新的孤立角色关系；历史上已经产生、但缺少临时授权记录的管理员关系，需要结合审计人工核对，不能自动与常驻管理员区分并删除。

回归：`npm test`，重点见 `__tests__/api/temp-grants/route.test.ts` 与 `__tests__/lib/admin-user.test.ts`。
