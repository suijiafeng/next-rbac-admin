'use client';

/**
 * 登录/注册页背景动态粒子层。
 * 纯 CSS 实现：一组缓慢向上飘动并闪烁的光点，叠加在底图与渐变光斑之上。
 */

const PARTICLE_COUNT = 26;

export default function AuthParticles() {
  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const left = Math.random() * 100;
    const size = 2 + Math.random() * 4;
    const duration = 12 + Math.random() * 16;
    const delay = -Math.random() * 28;
    const drift = (Math.random() * 2 - 1) * 60;
    return (
      <span
        key={i}
        className="auth-particle"
        style={
          {
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            ['--drift' as string]: `${drift}px`,
          } as React.CSSProperties
        }
      />
    );
  });

  return <div className="auth-particles" aria-hidden>{particles}</div>;
}
