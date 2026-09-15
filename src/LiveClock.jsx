import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

export default function LiveClock({ locale }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return (
    <div className="live-clock">
      <CalendarDays size={22} aria-hidden="true" />
      <time dateTime={now.toISOString()}>
        <strong>{now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        <span className="live-clock-time" dir="ltr">{now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
      </time>
    </div>
  );
}
