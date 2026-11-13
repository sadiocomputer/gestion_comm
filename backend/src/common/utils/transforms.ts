/** Pour @Transform : "  texte " -> "texte". */
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Pour @Transform : "  " ou "" -> null (un champ vidé = pas de valeur). */
export const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
