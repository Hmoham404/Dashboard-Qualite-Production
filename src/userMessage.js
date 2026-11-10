// Keep configuration and database diagnostics out of the application interface.
// Callers retain the original error in state for diagnosis.
export function userMessage(message, fallback = 'Service indisponible. Réessayez ou contactez votre administrateur.') {
  const value = String(message || '');
  return /supabase|\.sql\b|\.env\b|PGRST\d*|SQL Editor|(?:column|relation|constraint) .*(?:exist|violat)|customer_complaints|sorting_hours|lot_inspections|monthly_closures/i.test(value) ? fallback : value;
}
