import { useMemo } from 'react';
import { BUBBLE_COLORS } from '../theme';

interface Bubble {
  id: number;
  left: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export function Bubbles({ count = 22 }: { count?: number }) {
  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 8 + Math.random() * 34,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
      duration: 10 + Math.random() * 14,
      delay: Math.random() * -20,
    }));
  }, [count]);

  return (
    <div className="bubbles-container" aria-hidden="true">
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="bubble"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            background: b.color,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
