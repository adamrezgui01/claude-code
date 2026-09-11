import * as SecureStore from 'expo-secure-store';

import type { CodeAcces } from '../db/types';

/**
 * Les codes d'accès sont conservés dans le trousseau du système (Keychain sur
 * iOS, Keystore sur Android) et jamais dans la base SQLite.
 */
const cle = (pharmacieId: number) => `codes_pharmacie_${pharmacieId}`;

export async function lireCodes(pharmacieId: number): Promise<CodeAcces[]> {
  try {
    const brut = await SecureStore.getItemAsync(cle(pharmacieId));
    if (!brut) return [];
    const codes = JSON.parse(brut);
    return Array.isArray(codes) ? codes : [];
  } catch {
    return [];
  }
}

export async function ecrireCodes(pharmacieId: number, codes: CodeAcces[]): Promise<void> {
  const utiles = codes.filter((c) => c.libelle.trim() || c.valeur.trim());
  if (utiles.length === 0) {
    await supprimerCodes(pharmacieId);
    return;
  }
  await SecureStore.setItemAsync(cle(pharmacieId), JSON.stringify(utiles));
}

export async function supprimerCodes(pharmacieId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(cle(pharmacieId));
  } catch {
    // Rien à supprimer.
  }
}
