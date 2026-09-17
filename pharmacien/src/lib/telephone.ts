/**
 * Masque de téléphone québécois : `(514) 968-7204`. Toujours le même, jamais
 * d'international.
 *
 * Tout passe par les chiffres seuls. Les parenthèses, l'espace et le tiret ne
 * sont pas des caractères qu'on efface : ils se réécrivent à partir des
 * chiffres restants. C'est ce qui permet de reculer un chiffre à la fois sans
 * se battre avec eux.
 */

export function chiffresSeuls(texte: string): string {
  return texte.replace(/\D/g, '').slice(0, 10);
}

/** Met en forme ce qu'il y a de chiffres, sans rien exiger de plus. */
export function formaterTelephone(texte: string): string {
  const n = chiffresSeuls(texte);
  if (n.length === 0) return '';
  if (n.length < 3) return n;
  if (n.length === 3) return `(${n})`;
  if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

/**
 * Met en forme une frappe, en tenant compte de ce qu'il y avait avant.
 *
 * Le cas qui casse toujours est l'effacement d'un séparateur : reculer sur le
 * `)` de `(514)` redonnerait `(514` , que la mise en forme refermerait aussitôt
 * en `(514)`. L'usager resterait coincé. Quand une frappe raccourcit le texte
 * sans retirer de chiffre, c'est donc un séparateur qui a été visé, et c'est le
 * chiffre qu'il suivait qui part.
 */
export function formaterTelephoneSaisie(precedent: string, saisi: string): string {
  const avant = chiffresSeuls(precedent);
  const apres = chiffresSeuls(saisi);

  if (saisi.length < precedent.length && apres.length === avant.length) {
    return formaterTelephone(apres.slice(0, -1));
  }
  return formaterTelephone(apres);
}
