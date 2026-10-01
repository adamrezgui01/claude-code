import { describe, expect, test } from 'vitest';

import { CLE, creerMagasin, type Stockage } from '../src/donnees';

function stockageEnMemoire(): Stockage & { contenu: Map<string, string> } {
  const contenu = new Map<string, string>();
  return {
    contenu,
    getItem: (cle) => contenu.get(cle) ?? null,
    setItem: (cle, valeur) => void contenu.set(cle, valeur),
    removeItem: (cle) => void contenu.delete(cle),
  };
}

const jour = () => '2026-10-01';

describe('les données en mémoire, recopiées dans le navigateur', () => {
  test('le premier chargement installe le jeu de démonstration', () => {
    const magasin = creerMagasin(stockageEnMemoire(), jour);
    expect(magasin.lire().pharmacies).toHaveLength(8);
    expect(magasin.lire().quarts.length).toBeGreaterThan(100);
  });

  test('un changement se recopie, et survit à un rechargement', () => {
    const stockage = stockageEnMemoire();
    const premier = creerMagasin(stockage, jour);
    premier.modifierReglages({ nom: 'Test' });
    expect(stockage.contenu.has(CLE)).toBe(true);
    expect(creerMagasin(stockage, jour).lire().reglages.nom).toBe('Test');
  });

  test('un stockage illisible redonne le jeu de démonstration', () => {
    const stockage = stockageEnMemoire();
    stockage.setItem(CLE, '{pas du json');
    expect(creerMagasin(stockage, jour).lire().pharmacies).toHaveLength(8);
  });

  test('sans stockage, le site tourne en mémoire', () => {
    const magasin = creerMagasin(null, jour);
    magasin.modifierReglages({ nom: 'Test' });
    expect(magasin.lire().reglages.nom).toBe('Test');
  });

  test('chaque changement prévient les écrans abonnés', () => {
    const magasin = creerMagasin(null, jour);
    let appels = 0;
    const desabonner = magasin.abonner(() => (appels += 1));
    magasin.modifierReglages({ nom: 'A' });
    desabonner();
    magasin.modifierReglages({ nom: 'B' });
    expect(appels).toBe(1);
  });

  test('un quart facturé est figé', () => {
    const magasin = creerMagasin(null, jour);
    const facture = magasin.lire().quarts.find((q) => q.numero_facture)!;
    magasin.modifierQuart(facture.id, { heure_fin: '23:00' });
    magasin.supprimerQuart(facture.id);
    expect(magasin.lire().quarts.find((q) => q.id === facture.id)).toEqual(facture);
  });

  test('renégocier un taux ne réécrit aucun quart déjà entré', () => {
    const magasin = creerMagasin(null, jour);
    const avant = magasin.lire().quarts.filter((q) => q.pharmacie_id === 1);
    magasin.modifierPharmacie(1, { taux_horaire: 150 });
    expect(magasin.lire().quarts.filter((q) => q.pharmacie_id === 1)).toEqual(avant);
  });

  test('un nouveau quart prend un identifiant libre', () => {
    const magasin = creerMagasin(null, jour);
    const modele = magasin.lire().quarts[0];
    const { id: _id, numero_facture: _n, ...champs } = modele;
    const id = magasin.creerQuart({ ...champs, date: '2026-12-15' });
    expect(magasin.lire().quarts.filter((q) => q.id === id)).toHaveLength(1);
    expect(magasin.lire().quarts.find((q) => q.id === id)?.numero_facture).toBe('');
  });
});
