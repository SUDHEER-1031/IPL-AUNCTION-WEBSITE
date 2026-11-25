import { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../utils/sound';

interface CircularTimerProps {
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  totalSeconds: number;
  clockOffsetMs: number;
  isPaused: boolean;
}

export function CircularTimer({
  timerEndsAt,
  pausedRemainingMs,
  totalSeconds,
  clockOffsetMs,
  isPaused,
}: CircularTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(totalSeconds * 1000);
  const lastBeepSecRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) {
      setRemainingMs(pausedRemainingMs ?? totalSeconds * 1000);
      return;
    }
    if (!timerEndsAt) {
      setRemainingMs(0);
      return;
    }

    const update = () => {
      const serverNow = Date.now() + clockOffsetMs;
      const ms = Math.max(0, timerEndsAt - serverNow);
      setRemainingMs(ms);
      const sec = Math.ceil(ms / 1000);
      if (sec > 0 && sec <= 3 && lastBeepSecRef.current !== sec) {
        lastBeepSecRef.current = sec;
        soundEngine.playCountdownBeep();
      }
      if (sec > 3) {
        lastBeepSecRef.current = null;
      }
    };

    update();
    const id = setInterval(update, 60);
    return () => clearInterval(id);
  }, [timerEndsAt, pausedRemainingMs, totalSeconds, clockOffsetMs, isPaused]);

  const totalMs = totalSeconds * 1000;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const secondsDisplay = Math.ceil(remainingMs / 1000);
  const isDanger = !isPaused && secondsDisplay <= 3 && secondsDisplay > 0;
  const isWarning = !isPaused && !isDanger && secondsDisplay <= 5;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = isPaused
    ? '#94a3b8'
    : isDanger
      ? '#ef4444'
      : isWarning
        ? '#f59e0b'
        : '#10b981';

  return (
    <div
      className={`relative w-28 h-28 flex items-center justify-center select-none ${
        isDanger ? 'animate-pulse scale-105 transition-transform' : ''
      }`}
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke 200ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-display text-3xl font-black tabular-nums ${
            isDanger
              ? 'text-red-500'
              : isWarning
                ? 'text-amber-500'
                : 'text-slate-900 dark:text-white'
          }`}
        >
          {isPaused ? `${secondsDisplay}s` : secondsDisplay}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {isPaused ? 'PAUSED' : 'SEC'}
        </span>
      </div>
    </div>
  );
}
