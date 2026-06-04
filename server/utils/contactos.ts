// Normaliza una lista de contactos (teléfonos o emails) que llega del cliente:
// acepta solo arrays, recorta espacios y descarta los valores vacíos.
// Cualquier cosa que no sea array (undefined, null, string suelto) devuelve [].
export function cleanList(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(v => v.length > 0)
}
