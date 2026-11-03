import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQualityNote, extractArticleReference, extractClientName, extractQualityNote } from '../src/qualityNote.js';

test('client, article reference and observations survive save and edit independently', () => {
  const note = buildQualityNote(' ART-17 ', ' Contrôle validé ', ' Client A & B ');
  assert.equal(extractClientName(note), 'Client A & B');
  assert.equal(extractArticleReference(note), 'ART-17');
  assert.equal(extractQualityNote(note), 'Contrôle validé');
  const edited = buildQualityNote(extractArticleReference(note), extractQualityNote(note), 'Client C');
  assert.equal(extractClientName(edited), 'Client C');
  assert.equal(extractQualityNote(edited), 'Contrôle validé');
  assert.equal(extractClientName(buildQualityNote('ART-17', 'OK', '')), '');
});

test('old records without a client remain readable and metadata stays out of observations', () => {
  const historical = 'REF_ARTICLE: OLD\nNOTE_QUALITE: Note ancienne\nSAISIE_QUALITE_SEULE: oui\nREPARTITION_DEFAUTS: [{"type":"Bavure","qty":2}]';
  assert.equal(extractClientName(historical), '');
  assert.equal(extractQualityNote(historical), 'Note ancienne');
  assert.equal(extractClientName('CLIENT: \nNOTE_QUALITE: OK'), '');
  assert.equal(extractArticleReference('REF_ARTICLE: \nCLIENT: A'), '');
  assert.equal(extractQualityNote('Observation libre sans métadonnées'), 'Observation libre sans métadonnées');
});
