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

  return (
    <div className="auth-particles" aria-hidden>
      <style jsx global>{`
        .auth-particles {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .auth-particle {
          position: absolute;
          bottom: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, #a5b4fc 0%, #6366f1 60%, transparent 100%);
          box-shadow: 0 0 8px 2px rgba(139, 92, 246, 0.6);
          opacity: 0;
          animation-name: particleRise;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes particleRise {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          50% {
            transform: translateY(-55vh) translateX(calc(var(--drift) * 0.5)) scale(1);
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-108vh) translateX(var(--drift)) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
      {particles}
    </div>
  );
}
