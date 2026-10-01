import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00'));
});

import { magasin } from '../src/donnees';
import { pharmacieDepuisSaisie, SAISIE_VIDE } from '../src/lib/fichePharmacie';
import { libelleControle, VISIBLES } from '../src/lib/listes';
import { dernierQuart, filtrerPharmacies, historique, trierPharmacies } from '../src/lib/repertoire';
import type { Pharmacie, Quart } from '../src/lib/types';
import { actionsPrincipales, commandesSansIcone, rendre } from './rendu';

beforeEach(() => magasin.reinitialiser());

function pharmacie(id: number, nom: string, champs: Partial<Pharmacie> = {}): Pharmacie {
  return {
    id, nom, ville: '', adresse: '', telephone: '', courriel: '', contact: '',
    taux_horaire: null, taux_par_km: null, distance_km: null, aller_retour: true, per_diem: null,
    favori: false, a_eviter: false, notes: '', ...champs,
  };
}

const quart = (id: number, pharmacie_id: number, date: string, heure_debut = '09:00') =>
  ({ id, pharmacie_id, date, heure_debut }) as Quart;

describe('chercher et trier', () => {
  const liste = [
    pharmacie(1, 'Pharmacie Lévis', { ville: 'Lévis' }),
    pharmacie(2, 'Familiprix', { ville: 'Saint-Jérôme' }),
    pharmacie(3, 'Uniprix', { ville: 'Québec' }),
  ];

  test('la recherche ignore la casse et les accents, sur le nom et la ville', () => {
    expect(filtrerPharmacies(liste, 'LEVIS').map((p) => p.id)).toEqual([1]);
    expect(filtrerPharmacies(liste, 'jerome').map((p) => p.id)).toEqual([2]);
    expect(filtrerPharmacies(liste, 'québec').map((p) => p.id)).toEqual([3]);
    expect(filtrerPharmacies(liste, '  ')).toHaveLength(3);
  });

  test('les favorites en tête, puis de A à Z', () => {
    const avecFavori = [...liste.slice(0, 2), { ...liste[2], favori: true }];
    expect(trierPharmacies(avecFavori, 'alphabetique', [], '2026-10-01').map((p) => p.nom)).toEqual([
      'Uniprix',
      'Familiprix',
      'Pharmacie Lévis',
    ]);
  });

  test('« Récentes » : de la dernière travaillée à celle où l’on n’est jamais allé', () => {
    const quarts = [quart(1, 1, '2026-09-01'), quart(2, 2, '2026-09-20'), quart(3, 1, '2026-12-01')];
    // Le quart de décembre est à venir : il ne fait pas de Lévis la plus récente.
    expect(dernierQuart(quarts, 1, '2026-10-01')).toBe('2026-09-01');
    expect(trierPharmacies(liste, 'recentes', quarts, '2026-10-01').map((p) => p.id)).toEqual([2, 1, 3]);
  });

  test('l’historique va du plus récent au plus ancien', () => {
    const quarts = [quart(1, 1, '2026-09-01'), quart(2, 1, '2026-09-20'), quart(3, 2, '2026-09-25'), quart(4, 1, '2026-09-20', '13:00')];
    expect(historique(quarts, 1).map((q) => q.id)).toEqual([4, 2, 1]);
  });
});

describe('la fiche d’une pharmacie', () => {
  test('un taux vide hérite des réglages, un zéro reste zéro', () => {
    const r = pharmacieDepuisSaisie({ ...SAISIE_VIDE, nom: 'Test', taux_par_km: '0', taux_horaire: '' });
    if ('erreur' in r) throw new Error(r.erreur);
    expect(r.champs.taux_par_km).toBe(0);
    expect(r.champs.taux_horaire).toBeNull();
    expect(r.champs.distance_km).toBeNull();
  });

  test('une pharmacie sans nom ne s’enregistre pas', () => {
    expect(pharmacieDepuisSaisie({ ...SAISIE_VIDE, nom: '  ' })).toEqual({ erreur: 'Donnez un nom à la pharmacie.' });
  });

  test('coordonnées, conditions, historique et repères à l’écran', () => {
    const html = rendre('/repertoire/1');
    expect(html).toContain('Coordonnées');
    expect(html).toContain('pharmacie-a@example.com');
    expect(html).toContain('Conditions');
    expect(html).toContain('Historique');
    // La pharmacie A est favorite dans le jeu de démonstration.
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Favori/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>(?:(?!<\/button>).)*À éviter/);
  });

  test('un taux hérité le dit, un zéro s’affiche comme un zéro, une distance inconnue aussi', () => {
    magasin.modifierPharmacie(1, { taux_horaire: null, per_diem: 0, distance_km: null });
    const html = rendre('/repertoire/1');
    expect(html).toContain('90,00 $ / h (réglages)');
    expect(html).toMatch(/Per diem<\/span><span class="rangee-valeur">0,00 \$</);
    expect(html).toContain('Distance inconnue');
  });

  test('l’historique montre trois quarts, puis « Voir les N »', () => {
    const n = magasin.lire().quarts.filter((q) => q.pharmacie_id === 1).length;
    const html = rendre('/repertoire/1');
    const liste = html.match(/<div class="liste-repliable">([\s\S]*?)<\/div><\/div><\/div>/)![1];
    expect((liste.match(/class="ligne-historique ton-/g) ?? []).length).toBe(VISIBLES);
    expect(liste).toContain(`Voir les ${n}`);
    expect(liste).toMatch(/aria-expanded="false"[^>]*><svg/);
  });

  test('le contrôle dit le nombre réel, et « Réduire » une fois ouvert', () => {
    expect(libelleControle(12, false)).toBe('Voir les 12');
    expect(libelleControle(12, true)).toBe('Réduire');
  });
});

describe('le répertoire à l’écran', () => {
  test('la liste entière, favorites en tête', () => {
    const html = rendre('/repertoire');
    const noms = [...html.matchAll(/<span class="headline">(.*?)<\/span>/g)].map((m) => m[1]);
    expect(noms).toHaveLength(8);
    expect(noms.slice(0, 2)).toEqual(['Pharmacie A', 'Pharmacie C']);
  });

  test('« à éviter » se lit sur la ligne, avec son icône', () => {
    expect(rendre('/repertoire')).toMatch(/a-eviter"><svg[^]*?<\/svg>À éviter/);
  });

  test('l’étoile est une icône seule qui porte son étiquette', () => {
    const html = rendre('/repertoire');
    expect(html.match(/aria-label="Favori"/g)).toHaveLength(8);
  });

  test('aucune commande n’est du texte seul, et une seule action principale', () => {
    for (const adresse of ['/repertoire', '/repertoire/1', '/repertoire/nouvelle']) {
      const html = rendre(adresse);
      expect({ adresse, fautes: commandesSansIcone(html) }).toEqual({ adresse, fautes: [] });
      expect(actionsPrincipales(html)).toBeLessThanOrEqual(1);
    }
  });
});
