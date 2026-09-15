import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { createTranslator, languages, messages, readLanguage } from '../src/i18n.js';

test('all five languages cover every message and preserve interpolation fields', () => {
  assert.deepEqual(languages.map(({ code }) => code).sort(), ['ar', 'en', 'fr', 'it', 'zh']);
  for (const { code } of languages) {
    for (const [key, value] of Object.entries(messages.fr)) {
      const translated = messages[code][key];
      assert.ok(translated?.trim(), `${code}: ${key}`);
      assert.deepEqual(translated.match(/\{\w+\}/g)?.sort(), value.match(/\{\w+\}/g)?.sort(), `${code}: ${key}`);
    }
  }
});

test('language preferences recover from missing, invalid or inaccessible storage', () => {
  for (const { code } of languages) assert.equal(readLanguage({ getItem: () => code }), code);
  for (const value of [null, 'de', 'undefined']) assert.equal(readLanguage({ getItem: () => value }), 'fr');
  assert.equal(readLanguage({ getItem: () => { throw new Error('blocked'); } }), 'fr');
});

test('interpolation is literal and unknown machine identifiers remain intact', () => {
  const t = createTranslator('en');
  assert.equal(t('MYC-02-AIM-0001'), 'MYC-02-AIM-0001');
  assert.equal(t('Erreur sauvegarde: {error}', { error: '$& <offline>' }), 'Save error: $& <offline>');
  assert.equal(t('Injection'), 'Injection molding');
  assert.equal(createTranslator('ar')('Supprimer'), 'حذف');
});

test('rendered text and attributes use translations, while options retain stable values', () => {
  const ast = parse(readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  traverseModule.default(ast, {
    JSXText({ node }) {
      assert.ok(!/[A-Za-z]/.test(node.value), `Untranslated JSX: ${node.value}`);
    },
    JSXAttribute({ node }) {
      if (['title', 'placeholder', 'aria-label', 'name'].includes(node.name.name)) {
        assert.notEqual(node.value?.type, 'StringLiteral', `Untranslated attribute: ${node.name.name}`);
      }
    },
    JSXOpeningElement({ node }) {
      if (node.name.name === 'option') assert.ok(node.attributes.some(({ name }) => name?.name === 'value'), 'Options need an untranslated value');
    },
    CallExpression({ node }) {
      if (node.callee.name === 't' && node.arguments[0]?.type === 'StringLiteral') {
        assert.ok(Object.hasOwn(messages.fr, node.arguments[0].value), `Missing message: ${node.arguments[0].value}`);
      }
    },
  });
});
