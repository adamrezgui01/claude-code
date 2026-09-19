/** Sépare les milliers par une espace insécable étroite, comme au Québec. */
function separerMilliers(entier: string): string {
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function argent(montant: number): string {
  const negatif = montant < 0;
  const [entier, decimales] = Math.abs(montant).toFixed(2).split('.');
  return `${negatif ? '−' : ''}${separerMilliers(entier)},${decimales} $`;
}

/** 7,5 → « 7 h 30 ». */
export function heures(total: number): string {
  const minutes = Math.round(total * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${`${m}`.padStart(2, '0')}`;
}

export function nombre(valeur: number, decimales = 1): string {
  const texte = valeur.toFixed(decimales).replace('.', ',');
  return texte.replace(/,0$/, '');
}

/**
 * Accorde un compteur : « 0 quart », « 1 quart », « 2 quarts ». En français,
 * zéro prend le singulier — contrairement à l'anglais. Le pluriel irrégulier se
 * donne en troisième argument.
 */
export function pluriel(compte: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${compte} ${Math.abs(compte) < 2 ? singulier : pluriel}`;
}

/** Lit un montant saisi au clavier, en acceptant la virgule décimale. */
export function analyserNombre(texte: string): number {
  const valeur = parseFloat(texte.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(valeur) ? valeur : 0;
}

/**
 * Une durée, pas une heure d'horloge : « 1 h 45 », « 45 min », « Aucune ».
 * La distinction compte — la même roulette servirait à lire 13 h 45 comme un
 * moment de la journée, ce qui n'a rien à voir avec un bloc de temps.
 */
export function formaterDuree(minutes: number): string {
  if (minutes <= 0) return 'Aucune';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}
