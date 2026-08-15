import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  seconds: number;
  onExpire?: () => void;
}

export function Timer({ seconds, onExpire }: TimerProps) {
  const { secondsLeft, running, pause, resume, adjust } = useTimer(seconds, onExpire);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="timer">
      <div className="timer-display">
        {minutes}:{secs.toString().padStart(2, '0')}
      </div>
      <div className="timer-controls">
        <button onClick={() => adjust(-10)} aria-label="Moins 10 secondes">-10s</button>
        <button onClick={() => adjust(-30)} aria-label="Moins 30 secondes">-30s</button>
        <button onClick={running ? pause : resume}>{running ? 'Pause' : 'Reprendre'}</button>
        <button onClick={() => adjust(30)} aria-label="Plus 30 secondes">+30s</button>
        <button onClick={() => adjust(60)} aria-label="Plus 1 minute">+1min</button>
      </div>
    </div>
  );
}
