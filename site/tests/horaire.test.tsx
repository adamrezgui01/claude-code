import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00'));
});

import { magasin } from '../src/donnees';
import { REGLAGES_DEFAUT } from '../src/lib/demo';
import { etatDuQuart, type Etat } from '../src/lib/etats';
import { quartDepuisSaisie, type Saisie } from '../src/lib/fiche';
import { decaler, grilleDuMois, joursDeLaSemaine, quartsDuJour, titreDeLaVue } from '../src/lib/horaire';
import type { Pharmacie } from '../src/lib/types';
import { actionsPrincipales, commandesSansIcone, rendre } from './rendu';

beforeEach(() => magasin.reinitialiser());

describe('les trois vues', () => {
  test('un quart de nuit se range au jour où il commence', () => {
    const quarts = [
      { id: 1, date: '2026-03-10', heure_debut: '22:00' },
      { id: 2, date: '2026-03-10', heure_debut: '08:00' },
      { id: 3, date: '2026-03-11', heure_debut: '09:00' },
    ];
    expect(quartsDuJour(quarts, '2026-03-10').map((q) => q.id)).toEqual([2, 1]);
    expect(quartsDuJour(quarts, '2026-03-11').map((q) => q.id)).toEqual([3]);
  });

  test('la semaine va du lundi au dimanche', () => {
    expect(joursDeLaSemaine('2026-10-01')).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
  });

  test('le mois d’octobre 2026 commence un jeudi et finit un samedi', () => {
    const grille = grilleDuMois('2026-10-15');
    expect(grille).toHaveLength(5);
    expect(grille[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(grille[4]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
  });

  test('précédent et suivant avancent d’une période', () => {
    expect(decaler('2026-10-01', 'jour', 1)).toBe('2026-10-02');
    expect(decaler('2026-10-01', 'semaine', -1)).toBe('2026-09-24');
    // Le 31 janvier plus un mois n'existe pas : on tombe au 1er février.
    expect(decaler('2026-01-31', 'mois', 1)).toBe('2026-02-01');
    expect(decaler('2026-03-31', 'mois', -1)).toBe('2026-02-01');
  });

  test('le titre de chaque vue', () => {
    expect(titreDeLaVue('2026-10-01', 'jour')).toBe('jeudi 1 octobre 2026');
    expect(titreDeLaVue('2026-10-01', 'semaine')).toBe('28 sept. au 4 oct. 2026');
    expect(titreDeLaVue('2026-10-01', 'mois')).toBe('octobre 2026');
  });
});

describe('la fiche d’un quart', () => {
  const pharmacie: Pharmacie = {
    id: 7, nom: 'Pharmacie X', ville: '', adresse: '', telephone: '', courriel: '', contact: '',
    taux_horaire: 88, taux_par_km: 0, distance_km: 42, aller_retour: true, per_diem: null,
    favori: false, a_eviter: false, notes: '',
  };
  const saisie: Saisie = {
    pharmacie_id: '7', date: '2026-11-03', heure_debut: '09:00', heure_fin: '17:00', pause: '',
    taux_horaire: '', taux_par_km: '', kilometrage: '', aller_retour: true, per_diem: '', notes: '',
  };
  const lire = (s: Partial<Saisie>) => {
    const r = quartDepuisSaisie({ ...saisie, ...s }, [pharmacie], REGLAGES_DEFAUT);
    if (!('quart' in r)) throw new Error(r.erreur);
    return r.quart;
  };

  test('un champ vide prend la valeur de la pharmacie, puis des réglages', () => {
    const q = lire({});
    expect([q.taux_horaire, q.kilometrage, q.per_diem, q.pause_minutes]).toEqual([88, 42, 0, 30]);
  });

  test('zéro reste zéro', () => {
    // La pharmacie ne paie pas le kilométrage : son 0 ne cède pas aux 0,55 $.
    expect(lire({}).taux_par_km).toBe(0);
    expect(lire({ pause: '0' }).pause_minutes).toBe(0);
    expect(lire({ kilometrage: '0' }).kilometrage).toBe(0);
  });

  test('une virgule décimale se lit', () => {
    expect(lire({ taux_horaire: '92,5' }).taux_horaire).toBe(92.5);
  });

  test('un quart de nuit s’enregistre tel quel, à la date de son début', () => {
    const q = lire({ heure_debut: '22:00', heure_fin: '06:00' });
    expect([q.date, q.heure_debut, q.heure_fin]).toEqual(['2026-11-03', '22:00', '06:00']);
  });

  test('sans pharmacie, rien ne s’enregistre', () => {
    expect(quartDepuisSaisie({ ...saisie, pharmacie_id: '' }, [pharmacie], REGLAGES_DEFAUT)).toEqual({
      erreur: 'Choisissez une pharmacie.',
    });
  });
});

/** Le premier quart du jeu dans chaque état, vu le 1er octobre 2026 à midi. */
function exemples(): Record<Etat, { id: number; date: string }> {
  const { quarts, factures } = magasin.lire();
  const maintenant = new Date();
  const trouves = {} as Record<Etat, { id: number; date: string }>;
  for (const q of quarts) {
    const etat = etatDuQuart(q, factures, maintenant);
    trouves[etat] ??= q;
  }
  return trouves;
}

describe('l’horaire à l’écran', () => {
  test('le mois est la vue d’ouverture', () => {
    expect(rendre('/')).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*Mois/);
  });

  test('le sélecteur de vue porte une icône et un mot par vue', () => {
    const groupe = rendre('/').match(/<div class="choix"[^>]*>(.*?)<\/div>/)![1];
    const boutons = [...groupe.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1]);
    expect(boutons.map((b) => b.replace(/<[^>]+>/g, ''))).toEqual(['Jour', 'Semaine', 'Mois']);
    for (const b of boutons) expect(b).toContain('<svg');
  });

  test('les quatre états se lisent sur leur carte', () => {
    const e = exemples();
    const carte = (id: number, date: string) => {
      const html = rendre(`/?vue=jour&jour=${date}`);
      return html.match(new RegExp(`href="/quart/${id}"[^>]*>(.*?)</a>`))![1];
    };
    expect(carte(e.paye.id, e.paye.date)).toMatch(/repere-plein.*Payé/);
    expect(carte(e.facture.id, e.facture.date)).toMatch(/repere-creux.*Facturé/);
    expect(carte(e.aFacturer.id, e.aFacturer.date)).toMatch(/repere-creux.*À facturer/);
    expect(carte(e.aVenir.id, e.aVenir.date)).not.toContain('repere');
    // Facturé et payé s'atténuent ; à facturer garde son encre.
    expect(rendre(`/?vue=jour&jour=${e.paye.date}`)).toContain('ton-gris');
    expect(rendre(`/?vue=jour&jour=${e.aFacturer.date}`)).toContain('ton-vif');
  });

  test('un quart de nuit paraît le jour où il commence, pas le lendemain', () => {
    const { pharmacies, quarts } = magasin.lire();
    const { id: _id, numero_facture: _n, ...modele } = quarts[0];
    magasin.creerQuart({ ...modele, pharmacie_id: pharmacies[0].id, date: '2026-12-15', heure_debut: '22:00', heure_fin: '06:00' });
    expect(rendre('/?vue=jour&jour=2026-12-15')).toContain('22 h à 6 h le lendemain');
    expect(rendre('/?vue=jour&jour=2026-12-16')).not.toContain('22 h à 6 h');
  });

  test('aucune commande n’est du texte seul, et une seule action principale', () => {
    const e = exemples();
    for (const adresse of [
      '/',
      '/?vue=semaine&jour=2026-09-28',
      `/?vue=jour&jour=${e.aFacturer.date}`,
      '/quart/nouveau',
      `/quart/${e.aVenir.id}`,
      `/quart/${e.paye.id}`,
    ]) {
      const html = rendre(adresse);
      expect({ adresse, fautes: commandesSansIcone(html) }).toEqual({ adresse, fautes: [] });
      expect(actionsPrincipales(html)).toBeLessThanOrEqual(1);
    }
  });
});

describe('la fiche à l’écran', () => {
  test('un nouveau quart prend le jour d’où l’on vient, et ses taux restent repliés', () => {
    const html = rendre('/quart/nouveau?date=2026-12-03');
    expect(html).toContain('value="2026-12-03"');
    expect(html).toMatch(/<details class="replie">/);
    expect(html).not.toMatch(/<details[^>]*open/);
  });

  test('un quart facturé se lit, il ne se modifie plus', () => {
    const html = rendre(`/quart/${exemples().paye.id}`);
    expect(html).toMatch(/<fieldset[^>]*disabled/);
    expect(html).not.toContain('Enregistrer');
    expect(html).not.toContain('Supprimer');
    expect(html).toContain('ce quart est figé');
  });

  test('un quart à venir se modifie et se supprime', () => {
    const html = rendre(`/quart/${exemples().aVenir.id}`);
    expect(html).not.toMatch(/<fieldset[^>]*disabled/);
    expect(html).toContain('Enregistrer');
    expect(html).toContain('Supprimer');
  });
});
