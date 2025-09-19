import Link from 'next/link';
import { Button, Card, Result, Space } from 'antd';

export default function ForbiddenPage() {
  return (
      <Result
        status="403"
        title="403"
        subTitle="当前账号没有访问此页面的权限。"
      />
  );
}
