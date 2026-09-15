import React from 'react';
import { languages } from './i18n.js';

function Flag({ code }) {
  return (
    <svg className="language-flag" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      <rect width="30" height="30" fill={code === 'ar' || code === 'zh' ? '#e6293e' : '#fff'} />
      {code === 'fr' || code === 'it' ? <>
        <rect width="10" height="30" fill={code === 'fr' ? '#2557d6' : '#0ba65a'} />
        <rect x="20" width="10" height="30" fill="#ef394b" />
      </> : null}
      {code === 'en' && <path d="M12 0h6v12h12v6H18v12h-6V18H0v-6h12Z" fill="#e52c3e" />}
      {code === 'ar' && <>
        <circle cx="15" cy="15" r="10" fill="#fff" />
        <circle cx="14" cy="15" r="7" fill="#e6293e" />
        <circle cx="16.5" cy="13.5" r="5.8" fill="#fff" />
        <path d="m18 10 1.2 3.4h3.5l-2.8 2.1 1.1 3.4-3-2.1-2.9 2.1 1.1-3.4-2.8-2.1h3.5Z" fill="#e6293e" transform="translate(4 4) scale(.75)" />
      </>}
      {code === 'zh' && <g fill="#ffde59">
        <path d="m9 5 1.2 3.6H14l-3 2.2 1.1 3.6L9 12.2l-3.1 2.2L7 10.8 4 8.6h3.8Z" />
        <path d="m16 4 .5 1.3H18l-1.2.9.5 1.4-1.3-.9-1.2.9.5-1.4-1.2-.9h1.4Zm4 4 .5 1.3H22l-1.2.9.5 1.4-1.3-.9-1.2.9.5-1.4-1.2-.9h1.4Zm0 6 .5 1.3H22l-1.2.9.5 1.4-1.3-.9-1.2.9.5-1.4-1.2-.9h1.4Zm-4 4 .5 1.3H18l-1.2.9.5 1.4-1.3-.9-1.2.9.5-1.4-1.2-.9h1.4Z" />
      </g>}
    </svg>
  );
}

export default function LanguageSwitcher({ language, onChange, t }) {
  const orderedLanguages = ['fr', 'ar', 'en', 'it', 'zh'].map((code) => languages.find((item) => item.code === code));
  return (
    <fieldset className="language-switcher">
      <legend>{t('Traduction')}</legend>
      <div className="language-options">
        {orderedLanguages.map(({ code, label }) => (
          <button key={code} type="button" className="language-choice" aria-pressed={language === code}
            aria-label={label} lang={code} onClick={() => onChange(code)}>
            <Flag code={code} />
            <span className="language-copy"><strong>{code.toUpperCase()}</strong><small dir="auto">{label}</small></span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
