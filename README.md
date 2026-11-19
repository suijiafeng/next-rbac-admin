# next-rbac-admin

一个给面试官看的权限治理后台：角色变更先审批再生效，临时管理员到期后在读取权限时立刻失效，这些动作写进可筛选的审计日志。

## 界面

四张图都来自种子数据跑起来之后的页面。桌面三张是 1280×800，窄屏那张是 390 宽。图里的账号是 `super_admin`、`admin`、`developer1` 这些演示用户。

<table>
  <tr>
    <td valign="top">
      <img src="./docs/screenshots/approvals.webp" alt="审批中心里一条待审批的角色变更" width="400" />
      <br />
      审批中心：角色变更先看风险，通过之后才写入角色
    </td>
    <td valign="top">
      <img src="./docs/screenshots/permissions.webp" alt="权限管理里的角色成员数和权限勾选" width="400" />
      <br />
      权限管理：按角色关系计数，同一人可以同时有多个角色
    </td>
  </tr>
  <tr>
    <td valign="top">
      <img src="./docs/screenshots/temp-grants.webp" alt="临时授权列表，含工作时间窗和已过期记录" width="400" />
      <br />
      临时授权：只在 09:00–21:00 生效，过期后鉴权不再承认
    </td>
    <td valign="top">
      <img src="./docs/screenshots/mobile-nav.webp" alt="手机宽度下打开的侧栏抽屉" width="220" />
      <br />
      窄屏：侧栏收进抽屉，菜单仍按当前角色裁剪
    </td>
  </tr>
</table>

## 功能

- 三个角色：`SUPER_ADMIN`、`ADMIN`、`USER`。侧栏和接口按角色分开裁剪，一名用户可以同时有多条 `UserRole`。
- 角色变更在审批中心提交。只有超级管理员通过之后，才改数据库里的角色。
- 可以把普通用户临时提升为管理员，并能限制在 09:00–21:00。过期后，鉴权读取不再承认这个角色。
- 审计日志按动作、操作人和时间筛选。登录失败会锁定账号，注册按 IP 和设备限流。
- 会话是自签的 HMAC Cookie（`admin_session`），不使用 NextAuth。
- 侧栏里的培训考试、货品和运营看板是演示模块，图表数字不是真实业务指标。

## 技术栈

Next.js 14 · React 18 · TypeScript · Ant Design 5 · Prisma 6 · PostgreSQL · Vitest

## 值得看的实现

- 临时授权不靠定时任务保住权限。`lib/admin-user.ts` 在读取当前用户时丢掉已过期、或不在工作时间窗里的角色。Cron 只负责清记录。
- 提议和批准分开。`ADMIN` 可以发起角色变更和临时授权；通过、驳回和强制回收只在 `SUPER_ADMIN`。
- 后台多标签按当前用户存在 `localStorage`。换账号登录不会带上一位用户打开过的页面。
- `npm test` 覆盖会话、权限判断和主要 API。

## 本地运行

需要 Node.js 18.17 或更高版本，以及 PostgreSQL。下面这组命令在本机 PostgreSQL 16 上跑通。

```bash
npm install
cp .env.example .env.local
```

`.env.local` 里至少写上数据库和会话密钥：

```bash
DATABASE_URL="postgresql://rbac:rbac_password@127.0.0.1:5432/rbac_db"
AUTH_SECRET="本地随便一段足够长的字符串"
```

没有数据库时，用仓库里的 Compose 起 PostgreSQL 16（用户、密码、库名和端口与上面的连接串一致）：

```bash
docker compose up -d postgres
```

然后同步表结构、写入演示数据、启动开发服务器：

```bash
npm run db:push
npm run db:generate
npm run db:seed
npm run dev
```

打开 http://localhost:3000 。三个演示账号的密码都是 `123456`。

| 用户名 | 能看到什么 |
| --- | --- |
| `super_admin` | 全部治理页，包括审批和审计 |
| `admin` | 可以发起角色变更和临时授权，不能通过或驳回 |
| `user` | 治理概览和意见反馈 |

`npm test` 跑单元测试，`npm run build` 做生产构建。Neon 连接串的写法在 [docs/neon.md](./docs/neon.md)。

## 目录

```text
app/             页面路由和 API
components/      后台界面
lib/             会话、鉴权、临时授权
prisma/          表结构
scripts/seed.ts  演示账号和示例数据
__tests__/       Vitest
```

[MIT](./LICENSE)
