import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: '#999',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>404</div>
      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>页面未找到</div>
      <Link href="/home" style={{ color: '#1677ff' }}>
        返回首页
      </Link>
    </div>
  );
}
