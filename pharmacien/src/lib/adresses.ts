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

/** Champs d'adresse tels qu'ils vivent dans les réglages, sous un préfixe. */
export type AdresseReglages = {
  adresse_numero_civique: string;
  adresse_rue: string;
  adresse_local: string;
  adresse_code_postal: string;
  adresse_ville: string;
  adresse_province: string;
  adresse_latitude: number | null;
  adresse_longitude: number | null;
};

/** Vue `Adresse` des réglages, pour réutiliser la même saisie et le même rendu. */
export function adresseDesReglages(r: AdresseReglages): Adresse {
  return {
    numero_civique: r.adresse_numero_civique,
    rue: r.adresse_rue,
    local: r.adresse_local,
    code_postal: r.adresse_code_postal,
    ville: r.adresse_ville,
    province: r.adresse_province,
    latitude: r.adresse_latitude,
    longitude: r.adresse_longitude,
  };
}

export function champsAdresseReglages(a: Adresse): AdresseReglages {
  return {
    adresse_numero_civique: a.numero_civique,
    adresse_rue: a.rue,
    adresse_local: a.local,
    adresse_code_postal: a.code_postal,
    adresse_ville: a.ville,
    adresse_province: a.province,
    adresse_latitude: a.latitude,
    adresse_longitude: a.longitude,
  };
}

/** Adresse sur une ligne, pour un itinéraire ou un géocodage. */
export function adresseUneLigne(a: Adresse): string {
  return [ligneRue(a), ligneVille(a)].filter(Boolean).join(', ');
}
