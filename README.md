# next-rbac-admin

一个基于 **Next.js 14 App Router + Antd 5 + Prisma + Neon** 的 RBAC 中后台模板。

不是又一个 "Hello Admin"——这个模板把"做后台真正会遇到的问题"都给了答案：渲染模式怎么选、权限怎么落、多标签怎么 keep-alive、请求反馈怎么做、主题怎么切不闪屏。

---

## 亮点速览

| 亮点 | 怎么做的 |
|---|---|
| **全 CSR 渲染** | 后台所有页面 `'use client'`，服务端只留 metadata + middleware + API |
| **多标签 keep-alive** | 注册表 + `display` 切换 + 版本号刷新，state/滚动/筛选全保留 |
| **RBAC 三层守卫** | middleware 边缘拦截 + 客户端 PermissionGuard + API `requirePermission` |
| **请求反馈完整** | 每个触发请求的按钮都有 loading；表格/卡片有 loading 占位 |
| **主题切换零闪屏** | 根 layout 注入阻塞式脚本，在 hydration 之前把 `data-theme` 同步好 |
| **响应式布局** | `<992px` 自动切 Drawer 侧栏；Tailwind + Antd Grid 双管齐下 |
| **自签 Session** | 不依赖 NextAuth 等第三方，HMAC + HTTP-only Cookie，可读可控 |

---

## 实现方式

### 1. 渲染模式：全 CSR

> **为什么**：管理后台没有 SEO 需求，登录态强、数据动态，SSR 带来的"首屏 HTML"价值很低，反而引入服务端鉴权、cookie 透传、`router.refresh()` 等额外复杂度。索性放弃。

服务端只保留三件事：
- `app/layout.tsx` —— `metadata` + 主题反闪烁脚本
- `middleware.ts` —— 校验 session cookie，未登录拦截到 `/login`
- `app/api/**` —— Route Handlers 作为 BFF

后台页面外壳：

```tsx
// app/(admin)/users/page.tsx
'use client';
export default function UsersPage() {
  return null;  // 内容由注册表渲染
}
```

页面真正内容在 `components/users-content.tsx`，由下面的注册表统一挂载。

---

### 2. 多标签 keep-alive

> **痛点**：Next App Router 没有官方 `keep-alive`。路由切换会卸载页面组件，state/滚动/筛选条件全丢——和"点菜单切换"无差别，多标签栏沦为装饰。

**核心思路**：所有已打开 tab 的页面组件**常驻挂载**，用 `display: none/block` 切换可见性。

```
lib/page-registry.tsx  →  tab key 映射到组件 + 权限要求
        ↓
components/tab-pages-host.tsx
        ↓
  tabs.map(tab => (
    <div style={{ display: isActive ? 'flex' : 'none' }}>
      {renderRegistryPage(tab.key)}
    </div>
  ))
```

**刷新 tab 不丢其它**：`TabsProvider` 给每个 tab 维护一个版本号 `versions[key]`，刷新时自增，把 `${tab.key}-${version}` 作为 React key——只重挂载该 tab，其它 tab 状态完全保留。比 `window.location.reload()` 这种"核武器"友好得多。

**关闭 tab** 才真正卸载，释放内存。

---

### 3. RBAC 三层守卫

```
请求路径                  守卫层
─────────────────────────────────────────────
浏览器访问 /users    →    middleware.ts        ← session cookie 必须有效
    ↓
admin-layout 渲染   →    AuthProvider         ← /api/profile 拿用户 + 权限
    ↓
TabPagesHost 选页    →    PermissionGuard      ← 角色/权限不符显示 403
    ↓
点按钮触发请求       →    /api/* requirePermission  ← 真正的数据访问拦截
```

三层各有职责：
- **middleware**：边缘拦截，避免未登录用户下载整个后台 bundle
- **AuthProvider + PermissionGuard**：客户端 UX 层，不渲染没权限的页面，避免 401 弹窗骚扰
- **API requirePermission**：**唯一真实防线**——前端守卫只是用户体验，权限校验必须在服务端

权限定义在 `constants/permission.ts`，10 个细粒度权限码（`user:*` / `role:*` / `settings:*`），角色→权限映射在 `lib/permission-map.ts`。

---

### 4. 请求反馈

每一处会发请求的交互都有视觉反馈，分三层：

- **按钮级**：所有提交/删除/重置按钮 `loading={...}` + `disabled` 防重复点击
- **表格/区域级**：Antd `<Table loading>`、`<Card loading>`、`<Spin>`
- **行级**：批量操作有 `bulkLoading`，行内操作（暂停/改角色/重置密码）用 `operatingId` 精确到行

**细节**：登录按钮在成功路径不重置 loading 状态——因为紧接着 `router.replace('/dashboard')` 会卸载组件，重置会让按钮闪一下"已完成"再消失，体验不连贯。

---

### 5. 主题切换零闪屏

```html
<!-- app/layout.tsx 注入到 <head> 内的阻塞式脚本 -->
<script>
  // hydration 之前同步执行
  var mode = localStorage.getItem('next-admin-theme') || 'light';
  var resolved = mode === 'system'
    ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
    : mode;
  document.documentElement.setAttribute('data-theme', resolved);
</script>
```

CSS 变量驱动主题，HTML 一渲染就带正确的 `data-theme`，React 还没接手就先把颜色定好。**没有任何"先白后黑"的瞬间**。

---

### 6. 自签 Session

`lib/session.ts` —— 不依赖 NextAuth、Iron Session、Lucia 等第三方：

```
登录 → 服务端用 AUTH_SECRET 对 { userId, exp } 做 HMAC-SHA256
     → 拼成 token 写入 HTTP-only Cookie
请求 → middleware/route handler 拿 cookie，验签 + 过期检查
```

好处：依赖少、可读、可控；缺点：没有第三方那么多开箱即用的 OAuth/SAML，但管理后台用不上。

---

## 技术栈

| | |
|---|---|
| 框架 | Next.js 14 (App Router) |
| UI | Ant Design 5 + Tailwind CSS |
| ORM | Prisma + PostgreSQL |
| 认证 | HMAC 自签 Session + HTTP-only Cookie |
| 图表 | Recharts |
| 类型 | TypeScript 严格模式 |

---

## 目录结构

```
app/
├── (admin)/                # 后台分组（带鉴权 layout）
│   ├── layout.tsx          # AuthProvider 校验 + AdminLayout 外壳
│   └── */page.tsx          # ← 全部 return null，内容由注册表渲染
├── api/                    # Route Handlers (BFF)
├── login/  register/
└── layout.tsx              # 根 layout（metadata + 主题反闪烁脚本）

components/
├── admin-layout.tsx        # 侧栏 + Header + PageTabs + TabPagesHost
├── tab-pages-host.tsx      # ★ keep-alive 容器
├── page-tabs.tsx           # 标签栏
├── providers/
│   ├── AuthProvider.tsx    # 鉴权 + 权限上下文
│   └── TabsProvider.tsx    # 多标签状态（含 versions + refreshTab）
├── permission-guard.tsx    # 客户端守卫
└── *-content.tsx           # 每个页面的实际内容

lib/
├── page-registry.tsx       # ★ tab key → 组件 + 权限映射
├── page-meta.ts            # tab 标题/可关闭性
├── session.ts              # 自签 session token
├── permission.ts           # 服务端 requirePermission
├── permission-map.ts       # 角色→权限映射
└── request.ts              # 客户端 fetch 封装

middleware.ts               # 边缘鉴权（第一道防线）
prisma/schema.prisma
```

---

## 快速开始

```bash
# 1. 依赖
npm install

# 2. .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/admin_demo"
AUTH_SECRET="任意 32+ 字符随机串"

# 3. 数据库
npm run db:push && npm run db:generate && npm run db:seed

# 4. 启动
npm run dev
```

打开 http://localhost:3000，用 `super_admin / 123456` 登录（登录页已默认预填超级管理员账号）。

种子数据：21 个测试用户，3 个角色梯度。

### 默认账号

三个角色的默认账号密码统一为 `123456`，登录后请尽快修改；生产环境请勿保留默认密码。

| 用户名 | 密码 | 角色 | 权限范围 | 能看到的页面 |
|---|---|---|---|---|
| `super_admin` | `123456` | 超级管理员 SUPER_ADMIN | 全部权限 | 全部 |
| `admin` | `123456` | 管理员 ADMIN | 除「删除」类外全部 | 仪表盘 / 监控 / 用户 / 个人 |
| `user` | `123456` | 普通用户 USER | 仅查看类 | 仪表盘 / 监控 / 个人 |

---


## 单元测试

项目使用 **Vitest + Node Environment** 进行单元测试，主要覆盖 `lib/**` 下的纯函数与工具模块。

### 运行命令

```bash
# 运行全部单元测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告（text + lcov）
npm run test:coverage

# 仅运行某一个测试文件
npm test -- --run __tests__/lib/page-meta.test.ts
```

### 测试目录

- `__tests__/lib/*.test.ts`：工具层与权限/分页/响应封装等核心逻辑
- `vitest.config.ts`：测试环境、别名、覆盖率策略配置

### 覆盖率说明

- 覆盖率统计范围：`lib/**/*.ts`
- 排除文件：`lib/prisma.ts`

如果本地执行时报 `vitest: command not found`，请先执行 `npm install` 安装依赖。

---

## 已知权衡

- **隐藏 tab 仍挂载**：当前 6 个菜单页可控；将来如果有动态详情页（`/users/:id` 这种），需要 LRU 控制 tab 数量
- **Antd Modal Portal**：modal 渲染到 `document.body`，切 tab 时若 modal 未关会浮在新 tab 上——低频场景，未处理
- **根路径首屏**：`/` 是 CSR 跳 `/dashboard`，已加 Spin 兜底；想要瞬时跳转可在 middleware 里加服务端 redirect

## 🛡️ 权限治理（Governance）

在基础 RBAC 之上叠加了一套「变更受治理」的能力：敏感的角色变更不再直接生效，而是 **发起 → 看清 diff → 风险提示 → 审批 → 生效 → 留痕**；临时权限 **到期自动回收**。所有治理动作都写入既有的「审计日志」。

### 能力

- **审批中心 `/approvals`**：发起角色变更（展示 `当前角色 → 目标角色` 的 diff 与风险提示），超级管理员在「待我审批」中通过 / 驳回；通过后才在事务中真正修改用户角色并留痕。
- **临时授权 `/temp-grants`**：把「普通用户」临时提升为管理员并设定时长，到期由系统自动回收（拉取列表时懒回收 + Vercel Cron 定时兜底），也可由超级管理员立即回收。
- **审计回溯**：`change.submit / change.approve / change.reject / temp.grant / temp.revoke / temp.expire` 全部进入「审计日志」，可按操作人 / 动作 / 时间检索。

### 分权设计

| 角色 | 能力 |
| --- | --- |
| `ADMIN` | 发起角色变更、授予临时权限、查看 |
| `SUPER_ADMIN` | 以上全部 + 审批（通过/驳回）+ 立即回收（特权闸门） |

即「提议」与「批准」分离：管理员能发起，但只有超级管理员能批准生效。

### 关键约定（与本项目原有架构一致）

- 角色变更通过增删 `UserRole` 实现（用户无单一 `role` 字段，有效角色由 `lib/user-role.ts` 取最高优先级）。
- 所有写操作走 API Route Handler + `requirePermission`，前端三层守卫只是体验层。
- 新增表 `change_requests` / `temp_grants`，沿用日志类表「反范式存 actorId + username、不建外键」的风格；审计复用既有 `audit_logs` 与 `lib/audit-log.ts`。

### 涉及文件

```
prisma/schema.prisma                         # +ChangeRequest +TempGrant
constants/permission.ts                      # +change:* / temp:* 权限码与角色映射
lib/governance.ts                            # 角色标签 / 风险评估 / diff（纯函数）
lib/temp-grant.ts                            # 到期自动回收
lib/audit-log.ts                             # 扩展审计动作类型
app/api/change-requests/**                   # 列表 / 发起 / 审批决策
app/api/temp-grants/**                       # 列表 / 授予 / 回收
app/api/cron/expire-grants/route.ts          # 定时回收（Vercel Cron）
app/(admin)/approvals · /temp-grants         # 页面壳（return null）
components/approvals-content.tsx · temp-grants-content.tsx
```

### 体验治理闭环

```bash
npm install
npm run db:push      # 同步新表
npm run db:seed      # 写入治理权限 + 示例数据（含 1 条待审批、1 条生效中的临时授权）
npm run dev
```

默认账号：`super_admin` / `admin` / `user`，密码均为 `123456`。
用 `admin` 登录在「审批中心」发起一条角色变更，再用 `super_admin` 登录审批通过，最后在「审计日志」即可看到完整链路。

### v1.1 增量：ABAC 约束 + 治理指标

- **ABAC 时间窗约束**：授予临时权限时可勾选「仅工作时间」（09:00–21:00）。约束在鉴权边界 `lib/admin-user.ts` 评估——时段外该临时角色自动挂起（不删除记录，时段内恢复），到期仍由自动回收清除。这让权限从纯 RBAC 扩展为「角色 + 上下文属性」的 RBAC/ABAC。
- **治理指标概览**：审批中心顶部展示待审批、已通过/已驳回、生效中的临时授权、已自动回收、按时回收率，直接对应治理成效（数据来自 `GET /api/governance/stats`）。

> 说明：ABAC 时间窗使用服务运行环境的本地时间（Vercel 上为 UTC）；评估失败时降级为基础角色解析，不影响鉴权可用性。

### v1.2 增量：信息架构聚焦

菜单按"治理"主线重新归组,移除与主题无关的填充页,让产品一眼是「权限治理平台」而非通用模板:

```
工作台    · 治理概览（首页：原仪表盘顶部叠加治理 KPI——待审批/生效中临时授权/已自动回收/按时回收率）
权限治理  · 用户管理 · 权限管理 · 审批中心 · 临时授权 · 审计日志
系统      · 系统设置
其他      · 意见反馈（USER / ADMIN）
```

- 移除「数据监控」「公告管理」两个与治理主题无关的页面(路由已下线;组件文件保留在仓库,可按需删除)。
- 审计日志路由由 `/notifications` 规范化为 **`/audit`**(标签与 URL 一致);审计页已识别全部治理事件(发起/通过/驳回/临时授权/回收/到期)。
- 全站表格、按钮、字号由 `ThemeProvider` 的全局 `ConfigProvider` 统一(表格字号 13、按钮高 32、基础字号 14 等),新增页面均继承同一套 token,卡片统一为 `borderless` 风格。
