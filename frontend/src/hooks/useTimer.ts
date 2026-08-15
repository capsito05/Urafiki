import { useEffect, useRef, useState, useCallback } from 'react';

export function useTimer(initialSeconds: number, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(intervalRef.current!);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, onExpire]);

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);
  const adjust = useCallback((deltaSeconds: number) => {
    setSecondsLeft((s) => Math.max(0, s + deltaSeconds));
  }, []);
  const reset = useCallback((newSeconds: number) => {
    setSecondsLeft(newSeconds);
    setRunning(true);
  }, []);

  return { secondsLeft, running, pause, resume, adjust, reset };
}
