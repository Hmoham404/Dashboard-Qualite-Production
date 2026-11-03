// Store quality metadata in the existing note column, including older archives.
export function extractArticleReference(note = '') {
  return String(note).match(/^REF_ARTICLE:[ \t]*(.*)$/m)?.[1]?.trim() || '';
}

export function extractClientName(note = '') {
  return String(note).match(/^CLIENT:[ \t]*(.*)$/m)?.[1]?.trim() || '';
}

export function extractQualityNote(note = '') {
  return String(note)
    .replace(/^REF_ARTICLE:.*$/m, '')
    .replace(/^CLIENT:.*$/m, '')
    .replace(/^SAISIE_QUALITE_SEULE:.*$/m, '')
    .replace(/^NOTE_QUALITE:[ \t]*/m, '')
    .replace(/^REPARTITION_DEFAUTS:.*$/m, '')
    .trim();
}

export function buildQualityNote(articleReference, qualityNote, clientName = '') {
  return [
    articleReference?.trim() ? `REF_ARTICLE: ${articleReference.trim()}` : '',
    clientName?.trim() ? `CLIENT: ${clientName.trim()}` : '',
    qualityNote?.trim() ? `NOTE_QUALITE: ${qualityNote.trim()}` : '',
  ].filter(Boolean).join('\n');
}
