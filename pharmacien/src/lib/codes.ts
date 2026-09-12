import * as SecureStore from 'expo-secure-store';

import type { CodeAcces, IdentifiantsLogiciel } from '../db/types';

/**
 * Codes de porte et identifiants de logiciel vivent dans le trousseau du
 * système (Keychain sur iOS, Keystore sur Android), jamais dans la base SQLite.
 */
const cleCodes = (pharmacieId: number) => `codes_pharmacie_${pharmacieId}`;
const cleIdentifiants = (pharmacieId: number) => `identifiants_pharmacie_${pharmacieId}`;

async function lireJson<T>(cle: string, defaut: T): Promise<T> {
  try {
    const brut = await SecureStore.getItemAsync(cle);
    if (!brut) return defaut;
    return JSON.parse(brut) as T;
  } catch {
    return defaut;
  }
}

async function effacer(cle: string) {
  try {
    await SecureStore.deleteItemAsync(cle);
  } catch {
    // Rien à supprimer.
  }
}

export async function lireCodes(pharmacieId: number): Promise<CodeAcces[]> {
  const codes = await lireJson<CodeAcces[]>(cleCodes(pharmacieId), []);
  return Array.isArray(codes) ? codes : [];
}

export async function ecrireCodes(pharmacieId: number, codes: CodeAcces[]): Promise<void> {
  const utiles = codes.filter((c) => c.libelle.trim() || c.valeur.trim());
  if (utiles.length === 0) {
    await effacer(cleCodes(pharmacieId));
    return;
  }
  await SecureStore.setItemAsync(cleCodes(pharmacieId), JSON.stringify(utiles));
}

export async function lireIdentifiants(pharmacieId: number): Promise<IdentifiantsLogiciel> {
  const vide: IdentifiantsLogiciel = { utilisateur: '', motDePasse: '' };
  const identifiants = await lireJson<IdentifiantsLogiciel>(cleIdentifiants(pharmacieId), vide);
  return {
    utilisateur: identifiants.utilisateur ?? '',
    motDePasse: identifiants.motDePasse ?? '',
  };
}

export async function ecrireIdentifiants(
  pharmacieId: number,
  identifiants: IdentifiantsLogiciel
): Promise<void> {
  if (!identifiants.utilisateur.trim() && !identifiants.motDePasse.trim()) {
    await effacer(cleIdentifiants(pharmacieId));
    return;
  }
  await SecureStore.setItemAsync(cleIdentifiants(pharmacieId), JSON.stringify(identifiants));
}

/** À appeler quand une pharmacie est supprimée. */
export async function supprimerSecrets(pharmacieId: number): Promise<void> {
  await effacer(cleCodes(pharmacieId));
  await effacer(cleIdentifiants(pharmacieId));
}
