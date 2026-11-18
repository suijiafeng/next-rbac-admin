import Link from 'next/link';
import { redirect } from 'next/navigation';
import OpsCharts from '@/components/ops/ops-charts';
import { getCurrentAdminUser } from '@/lib/admin-user';
import { hasPermission } from '@/lib/permission';
import { PERMISSIONS, Role } from '@/constants/permission';
import { opsSnapshot, parseOpsRange, parseOpsView, type OpsRange, type OpsView } from '@/lib/ops/metrics';
import './ops.css';

export const dynamic = 'force-dynamic';

const RANGES: OpsRange[] = ['7d', '30d', '90d'];
const VIEWS: Array<{ id: OpsView; label: string }> = [
  { id: 'finance', label: '财务' },
  { id: 'business', label: '业务' },
  { id: 'staff', label: '人员' },
];

export default async function OpsPage({
  searchParams,
}: {
  searchParams: { range?: string; view?: string };
}) {
  const user = await getCurrentAdminUser();
  if (!user) redirect('/login');
  if (!hasPermission(user.role as Role, PERMISSIONS.OPS_VIEW)) {
    return <main className="ops-page"><h1>无权限</h1></main>;
  }

  const range = parseOpsRange(searchParams.range);
  const view = parseOpsView(searchParams.view);
  const snapshot = opsSnapshot(range, view);
  const href = (nextRange: OpsRange, nextView: OpsView) =>
    `/ops?range=${nextRange}&view=${nextView}`;

  return (
    <main className="ops-page" data-testid="ops-dashboard">
      <header className="ops-header">
        <div>
          <h1>运营看板</h1>
          <p>演示数据 · 个人演示 suijiafeng · 统计范围 {range}</p>
        </div>
        <Link href="/dashboard">返回后台</Link>
      </header>
      <nav className="ops-filters" aria-label="统计范围">
        {RANGES.map((item) => (
          <a key={item} href={href(item, view)} data-testid={`ops-range-${item}`} data-active={item === range}>
            {item === '7d' ? '近 7 天' : item === '30d' ? '近 30 天' : '近 90 天'}
          </a>
        ))}
        {VIEWS.map((item) => (
          <a key={item.id} href={href(range, item.id)} data-testid={`ops-view-${item.id}`} data-active={item.id === view}>
            {item.label}
          </a>
        ))}
      </nav>
      <section className="ops-metrics" data-testid="ops-metrics">
        <article data-testid="metric-finance">
          <h2>演示财务收入</h2>
          <strong>{snapshot.finance.revenue}</strong>
          <span>演示成本 {snapshot.finance.cost}</span>
        </article>
        <article data-testid="metric-business">
          <h2>演示业务订单</h2>
          <strong>{snapshot.business.orders}</strong>
          <span>演示转化 {snapshot.business.conversion}</span>
        </article>
        <article data-testid="metric-staff">
          <h2>演示人员编制</h2>
          <strong>{snapshot.staff.headcount}</strong>
          <span>演示出勤 {snapshot.staff.attendance}</span>
        </article>
      </section>
      <section className="ops-charts">
        <OpsCharts snapshot={snapshot} />
      </section>
    </main>
  );
}
