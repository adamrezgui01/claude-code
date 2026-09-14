import type { Adresse } from '../db/types';

/**
 * Forme des adresses structurées : valeurs par défaut, code postal, lignes
 * postales. Aucun appel natif ici, pour que la facture reste vérifiable hors de
 * l'application ; l'autocomplétion et le géocodage vivent dans
 * `adressesRecherche.ts`.
 */

export function adresseVide(): Adresse {
  return {
    numero_civique: '',
    rue: '',
    local: '',
    code_postal: '',
    ville: '',
    province: 'Québec',
    latitude: null,
    longitude: null,
  };
}

export function adresseRenseignee(a: Adresse): boolean {
  return !!(a.rue.trim() || a.ville.trim());
}

export function estLocalisee(a: Adresse): boolean {
  return a.latitude !== null && a.longitude !== null;
}

/** `A1A1A1` et `a1a 1a1` deviennent `A1A 1A1`. */
export function formaterCodePostal(saisie: string): string {
  const propre = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return propre.length > 3 ? `${propre.slice(0, 3)} ${propre.slice(3)}` : propre;
}

export function codePostalValide(code: string): boolean {
  return /^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(formaterCodePostal(code));
}

/** Première ligne postale : numéro, rue, puis local. */
export function ligneRue(a: Adresse): string {
  const debut = [a.numero_civique.trim(), a.rue.trim()].filter(Boolean).join(' ');
  const local = a.local.trim();
  return local ? `${debut}, local ${local}` : debut;
}

/** Deuxième ligne postale : `Ville (Québec) A1A 1A1`. */
export function ligneVille(a: Adresse): string {
  const ville = a.ville.trim();
  const province = a.province.trim();
  const code = a.code_postal.trim();
  const debut = ville && province ? `${ville} (${province})` : ville || province;
  return [debut, code].filter(Boolean).join(' ');
}

/** Adresse sur deux lignes, convention postale canadienne. */
export function adresseComplete(a: Adresse): string {
  return [ligneRue(a), ligneVille(a)].filter(Boolean).join('\n');
}

/** Adresse sur une ligne, pour un itinéraire ou un géocodage. */
export function adresseUneLigne(a: Adresse): string {
  return [ligneRue(a), ligneVille(a)].filter(Boolean).join(', ');
}
