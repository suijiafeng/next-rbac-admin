# Next Admin Template

一个基于 **Next.js 14 App Router + Antd 5 + Prisma** 的中后台模板。

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

## 新增一个后台页面

机械五步，无须思考：

1. `components/xxx-content.tsx` —— 业务内容
2. `app/(admin)/xxx/page.tsx` —— `return null`（让路由生效）
3. `lib/page-meta.ts` —— 加 tab 标题
4. `lib/page-registry.tsx` —— 加路径→组件映射 + 权限要求
5. `components/admin-sider.tsx` —— 加菜单项

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

## 意见反馈（自底向上）

反馈数据沿权限层级**自底向上**流动，同级互不可见：

| 提交者 | 谁能收到 | 入口 |
|---|---|---|
| 普通用户 USER | 管理员 + 超级管理员 | 侧栏「意见反馈」提交 |
| 管理员 ADMIN | 仅超级管理员 | 侧栏「意见反馈」提交 |
| 超级管理员 | —（已在顶层，无需提交） | 无提交入口 |

- **提交**：USER / ADMIN 在侧栏「意见反馈」填写表单（`components/feedback-content.tsx` → `POST /api/feedback`）。超级管理员没有该菜单项。
- **接收**：收到的反馈在**顶部通知铃铛**汇总，带未读角标；点开标题进入详情弹窗（`components/notification-bell.tsx` + `FeedbackDetailModal`），查看即标记为已读（按接收者维度记录在 `feedback_reads`）。
- **可见性规则**：服务端按角色层级 `USER(1) < ADMIN(2) < SUPER_ADMIN(3)` 过滤，只返回「严格低于」当前查看者的提交（`lib/feedback.ts`）。

> 启用前需在本地同步数据库（见下方「快速开始」），迁移文件位于 `prisma/migrations/*_add_feedback`。

---

## 已知权衡

- **隐藏 tab 仍挂载**：当前 6 个菜单页可控；将来如果有动态详情页（`/users/:id` 这种），需要 LRU 控制 tab 数量
- **Antd Modal Portal**：modal 渲染到 `document.body`，切 tab 时若 modal 未关会浮在新 tab 上——低频场景，未处理
- **根路径首屏**：`/` 是 CSR 跳 `/dashboard`，已加 Spin 兜底；想要瞬时跳转可在 middleware 里加服务端 redirect
