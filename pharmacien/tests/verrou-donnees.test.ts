/**
 * Le refus de modifier un quart facturé doit vivre dans la couche de données,
 * pas seulement dans l'écran. Masquer les champs de la fiche suffirait tant
 * que tous les chemins y passent — mais le glisser-déposer, la duplication et
 * le mémo de fin de quart n'y passent pas.
 *
 * La base n'est pas ouverte ici : on lui substitue un carnet en mémoire, et on
 * vérifie que l'écriture est bel et bien refusée.
 */

const lignes: Record<string, unknown>[] = [];
const ecritures: string[] = [];

jest.mock('../src/db/index', () => ({
  db: {
    execSync: () => {},
    runSync: (sql: string) => {
      ecritures.push(sql);
      return { lastInsertRowId: 0, changes: 0 };
    },
    getAllSync: () => lignes,
    getFirstSync: () => lignes[0] ?? null,
  },
}));

import { corrigerHeures, deplacerQuart, modifierQuart } from '../src/db/quarts';
import { QuartVerrouilleErreur } from '../src/lib/facturation';
import { unQuart } from './fabriques';

/** Un quart effectué hier, déjà porté par une facture. */
function poserQuartVerrouille() {
  const hier = new Date(Date.now() - 86400000);
  const date = `${hier.getFullYear()}-${`${hier.getMonth() + 1}`.padStart(2, '0')}-${`${hier.getDate()}`.padStart(2, '0')}`;
  lignes.length = 0;
  lignes.push(unQuart({ date, heure_debut: '09:00', heure_fin: '17:00', numero_facture: '2026-001' }));
}

function poserQuartLibre() {
  const hier = new Date(Date.now() - 86400000);
  const date = `${hier.getFullYear()}-${`${hier.getMonth() + 1}`.padStart(2, '0')}-${`${hier.getDate()}`.padStart(2, '0')}`;
  lignes.length = 0;
  lignes.push(unQuart({ date, heure_debut: '09:00', heure_fin: '17:00', numero_facture: '' }));
}

beforeEach(() => {
  ecritures.length = 0;
});

describe('la couche de données refuse de toucher un quart facturé', () => {
  test('modifier est refusé, et rien n’est écrit', () => {
    poserQuartVerrouille();
    expect(() => modifierQuart(1, unQuart() as never)).toThrow(QuartVerrouilleErreur);
    expect(ecritures).toHaveLength(0);
  });

  test('déplacer est refusé, et rien n’est écrit', () => {
    poserQuartVerrouille();
    expect(() => deplacerQuart(1, '2026-09-20', '10:00')).toThrow(QuartVerrouilleErreur);
    expect(ecritures).toHaveLength(0);
  });

  test('corriger les heures est refusé, et rien n’est écrit', () => {
    poserQuartVerrouille();
    expect(() => corrigerHeures(1, '09:30', '17:30')).toThrow(QuartVerrouilleErreur);
    expect(ecritures).toHaveLength(0);
  });

  test('le message nomme la facture à supprimer pour rouvrir le quart', () => {
    poserQuartVerrouille();
    expect(() => corrigerHeures(1, '09:30', '17:30')).toThrow(/2026-001/);
  });

  test('un quart effectué mais non facturé se modifie normalement', () => {
    poserQuartLibre();
    expect(() => corrigerHeures(1, '09:30', '17:30')).not.toThrow();
    expect(ecritures.length).toBeGreaterThan(0);
  });
});
