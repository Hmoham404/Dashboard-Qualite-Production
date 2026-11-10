import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React, { act } from 'react';
import { createTranslator } from '../src/i18n.js';

test('global meeting mode keeps site content, persists across pages, supports fullscreen and restores normal view', { skip: !process.env.JSDOM_MODULE }, async () => {
  const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const keys = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const path = fileURLToPath(new URL(`.site-meeting-ui-${process.pid}.mjs`, import.meta.url));
  let root, fullscreen = null, prints = 0;
  const changes = [], scrolls = [];
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
    window.HTMLElement.prototype.requestFullscreen = async function () { fullscreen = this; document.dispatchEvent(new window.Event('fullscreenchange')); };
    document.exitFullscreen = async () => { fullscreen = null; document.dispatchEvent(new window.Event('fullscreenchange')); };
    window.scrollTo = (...args) => scrolls.push(args);
    window.print = () => { assert.equal(fullscreen, null); prints += 1; };
    const output = await build({ entryPoints: [fileURLToPath(new URL('../src/SiteMeetingFrame.jsx', import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false, external: ['react', 'lucide-react'] });
    writeFileSync(path, output.outputFiles[0].text);
    const { default: Frame, SiteMeetingButton } = await import(pathToFileURL(path).href);
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    const t = createTranslator('fr');
    const render = async (page) => act(async () => root.render(React.createElement(Frame, { t, onModeChange: (value) => changes.push(value) },
      React.createElement('header', null, React.createElement(SiteMeetingButton)), React.createElement('main', { 'data-page': page }, `${page} / données du site`))));
    const click = async (text) => { const button = [...document.querySelectorAll('button')].find((node) => node.textContent === text || node.getAttribute('aria-label') === text); assert.ok(button, text); await act(async () => { button.closest('details')?.setAttribute('open', ''); button.click(); }); };
    await render('Dashboard');
    assert.equal(document.querySelector('header .site-meeting-toggle').textContent, 'Mode réunion');
    assert.equal(document.querySelector('footer'), null, 'No bottom meeting bar');
    const content = document.querySelector('main');
    await click('Activer le mode réunion');
    assert.equal(document.querySelector('main'), content, 'Existing page content is preserved');
    assert.ok(document.querySelector('.site-meeting-active'));
    assert.equal(document.querySelector('.site-meeting-toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(document.body.style.overflow, 'hidden');
    assert.deepEqual(changes, [true]);
    await click('Plein écran');
    assert.equal(fullscreen, document.querySelector('.site-frame'));
    await click('Imprimer / PDF');
    assert.equal(prints, 1);
    assert.ok(document.querySelector('.site-meeting-active'));
    await render('LOT');
    document.querySelector('.site-frame').scrollTop = 800;
    await act(async () => window.dispatchEvent(new window.HashChangeEvent('hashchange')));
    assert.equal(document.querySelector('.site-frame').scrollTop, 0, 'Navigating starts the next workspace at the top');
    assert.ok(document.querySelector('.site-meeting-active'));
    assert.match(document.querySelector('main').textContent, /LOT/);
    document.querySelector('details').setAttribute('open', '');
    await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('details').open, false);
    assert.ok(document.querySelector('.site-meeting-active'), 'Escape closes options before leaving meeting mode');
    const modal = document.createElement('dialog'); modal.setAttribute('open', ''); document.body.appendChild(modal);
    await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.ok(document.querySelector('.site-meeting-active'), 'A local dialog handles Escape before the global mode');
    modal.remove();
    await act(async () => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.ok(!document.querySelector('.site-meeting-active'));
    assert.equal(document.body.style.overflow, '');
    assert.deepEqual(changes, [true, false]);
    assert.equal(scrolls.length, 1);
    await click('Activer le mode réunion');
    window.HTMLElement.prototype.requestFullscreen = async () => { throw new Error('Not allowed'); };
    await click('Plein écran');
    assert.match(document.querySelector('[role="status"]').textContent, /mode réunion reste actif/);
    await click('Quitter le mode réunion');
    assert.ok(!document.querySelector('.site-meeting-active'));
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close(); try { unlinkSync(path); } catch {}
    for (const [key, original] of Object.entries(originals)) { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; }
  }
});
