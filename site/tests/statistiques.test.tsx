// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00'));
});

import { magasin } from '../src/donnees';
import { jeuDemo } from '../src/lib/demo';
import {
  etiquette,
  etiquettesLisibles,
  formatDuGraphique,
  libellesDesMois,
  reperesDeLAxe,
  serieMensuelle,
  valeurComplete,
} from '../src/lib/mensuel';
import { PERIODE_DEFAUT, PERIODES, bornes, quartsDeLaPeriode } from '../src/lib/periodes';
import { calculerStatistiques } from '../src/lib/stats';
import type { Pharmacie, Quart } from '../src/lib/types';
import { Graphique } from '../src/ui/Graphique';
import { monter } from './dom';
import { actionsPrincipales, commandesSansIcone, rendre } from './rendu';

beforeEach(() => magasin.reinitialiser());

const AUJOURDHUI = '2026-10-01';

describe('les périodes', () => {
  test('dans l’ordre du prompt, douze mois à l’ouverture', () => {
    expect(PERIODES.map((p) => p.texte)).toEqual(['Mois dernier', 'Ce mois', '3 mois', '12 mois', 'Autre']);
    expect(PERIODE_DEFAUT).toBe('douzeMois');
  });

  test('leurs bornes, le 1er octobre 2026', () => {
    const autre: [string, string] = ['2026-03-15', '2026-02-01'];
    expect(bornes('moisDernier', AUJOURDHUI, autre)).toEqual(['2026-09-01', '2026-09-30']);
    expect(bornes('mois', AUJOURDHUI, autre)).toEqual(['2026-10-01', '2026-10-31']);
    expect(bornes('trimestre', AUJOURDHUI, autre)).toEqual(['2026-08-01', '2026-10-31']);
    expect(bornes('douzeMois', AUJOURDHUI, autre)).toEqual(['2025-11-01', '2026-10-31']);
    // Deux dates saisies à l'envers se remettent dans l'ordre.
    expect(bornes('autre', AUJOURDHUI, autre)).toEqual(['2026-02-01', '2026-03-15']);
  });

  test('un quart compte au jour de son début, bornes incluses', () => {
    const quarts = [
      { date: '2026-09-30' },
      { date: '2026-10-01' },
      { date: '2026-10-31' }, // 22 h à 7 h : il compte en entier en octobre
      { date: '2026-11-01' },
    ];
    expect(quartsDeLaPeriode(quarts, ['2026-10-01', '2026-10-31'])).toEqual([{ date: '2026-10-01' }, { date: '2026-10-31' }]);
  });
});

describe('les étiquettes du graphique', () => {
  test('on abrège dès le millier, sur la plus grande valeur du graphique', () => {
    expect(formatDuGraphique(999)).toBe('pleins');
    expect(formatDuGraphique(1000)).toBe('milliers');
  });

  test('1,2k, 9,7k, puis 12k et 124k', () => {
    expect(etiquette(1232, 'argent', 'milliers')).toBe('1,2k');
    expect(etiquette(9695, 'argent', 'milliers')).toBe('9,7k');
    expect(etiquette(12400, 'argent', 'milliers')).toBe('12k');
    expect(etiquette(124000, 'kilometres', 'milliers')).toBe('124k');
    // 999 999 fait mille milliers : « 1 000k » aurait six caractères.
    expect(etiquette(999999, 'argent', 'milliers')).toBe('1M');
  });

  test('sous le millier, les chiffres restent nus, même dans un graphique en milliers', () => {
    expect(etiquette(890, 'argent', 'milliers')).toBe('890');
    expect(etiquette(856.4, 'argent', 'pleins')).toBe('856');
    expect(etiquette(152, 'heures', 'pleins')).toBe('152 h');
  });

  test('un zéro ne pose pas d’étiquette sur une barre au sol', () => {
    expect(etiquette(0, 'argent', 'milliers')).toBe('');
  });

  test('trois repères sur l’axe : le maximum, le milieu, zéro', () => {
    expect(reperesDeLAxe(10835.8, 'argent', 'milliers').map((r) => r.texte)).toEqual(['11k', '5,4k', '0']);
  });

  test('la valeur exacte sous le pointeur garde ses cents et son unité', () => {
    expect(valeurComplete(10835.8, 'argent').replace(/\s/g, ' ')).toBe('10 835,80 $');
    expect(valeurComplete(7.5, 'heures')).toBe('7 h 30');
    expect(valeurComplete(182, 'kilometres')).toBe('182 km');
  });

  test('si la plus large n’entre pas, aucune ne s’affiche : jamais de troncature', () => {
    expect(etiquettesLisibles(40, ['1,2k', '9,7k'])).toBe(true);
    expect(etiquettesLisibles(20, ['1,2k', '9,7k'])).toBe(false);
    expect(etiquettesLisibles(10, ['', ''])).toBe(true);
  });

  test('les mois passent à l’initiale quand l’abréviation n’entre pas', () => {
    const serie = serieMensuelle([], [], AUJOURDHUI);
    expect(libellesDesMois(serie, 60).slice(0, 3)).toEqual(['nov.', 'déc.', 'janv.']);
    expect(libellesDesMois(serie, 20).slice(0, 3)).toEqual(['N', 'D', 'J']);
  });
});

describe('les totaux', () => {
  const p: Pharmacie[] = [1, 2].map((id) => ({
    id, nom: `P${id}`, ville: '', adresse: '', telephone: '', courriel: '', contact: '', taux_horaire: 80,
    taux_par_km: 0.55, distance_km: 0, aller_retour: false, per_diem: null, favori: false, a_eviter: false, notes: '',
  }));
  const q = (id: number, pharmacie_id: number, km: number | null): Quart => ({
    id, pharmacie_id, date: '2026-09-10', heure_debut: '09:00', heure_fin: '17:00', pause_minutes: 30,
    taux_horaire: 80, taux_par_km: 0.55, kilometrage: km, aller_retour: false, per_diem: 0, numero_facture: '', notes: '',
  });

  test('ils additionnent des montants déjà arrondis, quart par quart', () => {
    const s = calculerStatistiques([q(1, 1, 80.01), q(2, 1, 80.01), q(3, 2, 80.01)], p);
    expect(s.deplacement).toBe(132.03);
    expect(s.honoraires).toBe(1800);
    expect(s.revenu).toBe(1932.03);
  });

  test('une distance inconnue ne compte ni kilomètre ni dollar', () => {
    const s = calculerStatistiques([q(1, 1, null)], p);
    expect([s.km, s.deplacement]).toEqual([0, 0]);
  });

  test('par pharmacie, de celle qui rapporte le plus à celle qui rapporte le moins', () => {
    const s = calculerStatistiques([q(1, 2, 10), q(2, 1, 10), q(3, 1, 10)], p);
    expect(s.parPharmacie.map((x) => [x.nom, x.quarts])).toEqual([['P1', 2], ['P2', 1]]);
  });

  test('le graphique et le total de douze mois disent la même chose', () => {
    const { quarts, pharmacies } = magasin.lire();
    const serie = serieMensuelle(quarts, pharmacies, AUJOURDHUI);
    expect(serie).toHaveLength(12);
    expect(serie[0].mois).toBe('2025-11-01');
    expect(serie[11].mois).toBe('2026-10-01');
    const total = calculerStatistiques(quartsDeLaPeriode(quarts, bornes('douzeMois', AUJOURDHUI, ['', ''])), pharmacies);
    const enCents = serie.reduce((t, e) => t + Math.round(e.argent * 100), 0);
    expect(enCents).toBe(Math.round(total.revenu * 100));
  });

  test('un mois sans quart est une barre à zéro, pas un trou', () => {
    const serie = serieMensuelle([], [], AUJOURDHUI);
    expect(serie.map((e) => e.argent)).toEqual(Array(12).fill(0));
  });
});

describe('le graphique à l’écran', () => {
  const { quarts, pharmacies } = jeuDemo(AUJOURDHUI);
  const serie = serieMensuelle(quarts, pharmacies, AUJOURDHUI);
  const tous = new Set(serie.map((e) => e.mois));
  /** Dessiné dans jsdom : recharts pose son SVG après le premier rendu. */
  async function dessiner(largeur: number) {
    const { racine, demonter } = await monter(
      <Graphique serie={serie} mesure="argent" enValeur={tous} largeur={largeur} />
    );
    const html = racine.innerHTML;
    const axe = [...racine.querySelectorAll('.recharts-yAxis-tick-labels text')].map((t) => t.textContent);
    demonter();
    return { html, axe };
  }

  test('un axe à trois repères : le maximum, le milieu, zéro', async () => {
    expect((await dessiner(700)).axe).toEqual(['11k', '5,4k', '0']);
  });

  test('assez large, chaque barre porte son étiquette entière', async () => {
    const { html } = await dessiner(700);
    expect(html).toContain('data-etiquettes="visibles"');
    const etiquettes = [...html.matchAll(/etiquette-barre[^>]*><tspan[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(etiquettes).toHaveLength(12);
    for (const e of etiquettes) expect(e).toMatch(/^\d+(,\d)?k$/);
  });

  test('trop étroit, aucune étiquette plutôt qu’une étiquette coupée', async () => {
    const { html } = await dessiner(250);
    expect(html).toContain('data-etiquettes="masquees"');
    expect(html).not.toContain('etiquette-barre');
    expect(html).not.toContain('…');
  });
});

describe('les statistiques à l’écran', () => {
  test('12 mois choisi à l’ouverture, les mesures avec icône et mot', () => {
    const html = rendre('/statistiques');
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*12 mois/);
    const mesures = html.match(/aria-label="Mesure">(.*?)<\/div>/)![1];
    const boutons = [...mesures.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1]);
    expect(boutons.map((b) => b.replace(/<[^>]+>/g, ''))).toEqual(['Argent', 'Heures', 'Kilomètres']);
    for (const b of boutons) expect(b).toContain('<svg');
  });

  test('par pharmacie : trois, puis « Voir les 8 »', () => {
    const html = rendre('/statistiques');
    const liste = html.match(/Par pharmacie<\/h2>([\s\S]*?)<\/div><\/div><\/div>/)![1];
    expect((liste.match(/class="ligne-historique"/g) ?? []).length).toBe(3);
    expect(liste).toContain('Voir les 8');
  });

  test('aucune commande n’est du texte seul', () => {
    const html = rendre('/statistiques');
    expect(commandesSansIcone(html)).toEqual([]);
    expect(actionsPrincipales(html)).toBeLessThanOrEqual(1);
  });
});
