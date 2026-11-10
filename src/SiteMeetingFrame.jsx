import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ChevronDown, Maximize, Minimize, Monitor, Printer, X } from 'lucide-react';

const MeetingContext = createContext(null);

export function SiteMeetingButton() {
  const meeting = useContext(MeetingContext);
  if (!meeting) return null;
  const { active, fullscreen, error, activate, leave, toggleFullscreen, printSite, t } = meeting;
  const option = (action) => (event) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    action();
  };
  return <div className="site-meeting-widget">
    <button type="button" className={`site-meeting-toggle${active ? ' is-active site-meeting-exit' : ''}`}
      aria-pressed={active} aria-label={t(active ? 'Quitter le mode réunion' : 'Activer le mode réunion')}
      onClick={active ? leave : activate}>
      {active ? <X size={17} /> : <Monitor size={17} />}{t(active ? 'Quitter la réunion' : 'Mode réunion')}
    </button>
    {active && <details className="site-meeting-options">
      <summary aria-label={t('Options du mode réunion')} title={t('Options du mode réunion')}><ChevronDown size={16} /></summary>
      <div className="site-meeting-menu">
        <button type="button" onClick={option(toggleFullscreen)}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}{t(fullscreen ? 'Quitter le plein écran' : 'Plein écran')}</button>
        <button type="button" onClick={option(printSite)}><Printer size={17} />{t('Imprimer / PDF')}</button>
      </div>
    </details>}
    {error && <p className="site-meeting-error" role="status">{t(error)}</p>}
  </div>;
}

export default function SiteMeetingFrame({ children, onModeChange, t }) {
  const frameRef = useRef(null);
  const triggerRef = useRef(null);
  const previousScroll = useRef(0);
  const [active, setActive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState('');
  function changeMode(value) {
    setError(''); setActive(value); onModeChange(value);
  }
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => {
    if (!active) return;
    const frame = frameRef.current;
    const overflow = document.body.style.overflow;
    previousScroll.current = window.scrollY;
    document.body.style.overflow = 'hidden';
    frame.scrollTop = 0;
    const resetScroll = () => { frame.scrollTop = 0; };
    window.addEventListener('hashchange', resetScroll);
    const escape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.fullscreenElement || document.querySelector('dialog[open], [role="dialog"]')) return;
      const options = frame.querySelector('.site-meeting-options[open]');
      if (options) { options.removeAttribute('open'); options.querySelector('summary')?.focus(); return; }
      changeMode(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      window.removeEventListener('hashchange', resetScroll);
      document.body.style.overflow = overflow;
      if (document.fullscreenElement === frame) document.exitFullscreen?.().catch(() => {});
      window.scrollTo(0, previousScroll.current);
      if (!triggerRef.current?.closest('[hidden]')) triggerRef.current?.focus({ preventScroll: true });
    };
  }, [active]);
  async function toggleFullscreen() {
    setError('');
    try {
      if (document.fullscreenElement === frameRef.current) await document.exitFullscreen();
      else if (frameRef.current.requestFullscreen) await frameRef.current.requestFullscreen();
      else throw new Error('unavailable');
    } catch { setError('Le plein écran est indisponible. Le mode réunion reste actif.'); }
  }
  async function leave() {
    if (document.fullscreenElement === frameRef.current) {
      try { await document.exitFullscreen(); } catch { /* Keep the exit control usable. */ }
    }
    changeMode(false);
  }
  async function printSite() {
    try {
      if (document.fullscreenElement === frameRef.current) await document.exitFullscreen();
      window.print();
    } catch { setError('L’impression est indisponible dans ce navigateur.'); }
  }
  const controls = { active, fullscreen, error, leave, toggleFullscreen, printSite, t,
    activate: (event) => { triggerRef.current = event.currentTarget; changeMode(true); } };
  return <MeetingContext.Provider value={controls}><div ref={frameRef} className={`site-frame${active ? ' site-meeting-active' : ''}`}>
    {children}
  </div></MeetingContext.Provider>;
}
