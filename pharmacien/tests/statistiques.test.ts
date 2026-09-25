import { readFileSync } from 'node:fs';

import { montantHebergement } from '../src/lib/defauts';
import { rattacher } from '../src/lib/facturation';
import { MESURES, mesureVoisine, serieMensuelle, valeurDe } from '../src/lib/mensuel';
import { calculerStatistiques } from '../src/lib/stats';
import { unePharmacie, unQuart } from './fabriques';

/**
 * Les statistiques lisent les quarts, jamais les factures. Le quart est la
 * seule source de vérité : une facture n'est qu'une mise en page de quarts
 * existants, elle ne produit aucune donnée nouvelle.
 *
 * Conséquence directe, et c'est le point du premier test : générer autant de
 * factures qu'on veut, sur des périodes qui se chevauchent, ne peut rien
 * changer aux chiffres.
 */

const QUARTS = [
  unQuart({
    id: 1,
    date: '2026-09-10',
    taux_horaire: 65,
    pause_minutes: 60,
    kilometrage: 40,
    taux_par_km: 0.55,
    aller_retour: 1,
    per_diem_reclame: 25,
    pharmacie_mode_deplacement: 'km',
  }),
  unQuart({
    id: 2,
    date: '2026-09-20',
    taux_horaire: 65,
    pause_minutes: 60,
    kilometrage: 40,
    taux_par_km: 0.55,
    aller_retour: 1,
    per_diem_reclame: 25,
    pharmacie_mode_deplacement: 'km',
  }),
];

describe('les factures n’entrent pas dans les statistiques', () => {
  test('une, deux ou dix factures sur des périodes qui se chevauchent donnent les mêmes chiffres', () => {
    const nu = calculerStatistiques(QUARTS);

    // Une facture sur tout le mois.
    const uneFacture = calculerStatistiques(rattacher(QUARTS, '2026-001'));

    // Deux factures qui se recoupent : le 1er au 30, puis le 14 au 30. Le
    // quart du 20 se retrouverait compté deux fois si les statistiques
    // lisaient les factures.
    const deuxFactures = calculerStatistiques([
      ...rattacher([QUARTS[0]], '2026-001'),
      ...rattacher([QUARTS[1]], '2026-002'),
    ]);

    // Dix générations successives sur des périodes qui se chevauchent.
    let dix = QUARTS;
    for (let i = 0; i < 10; i++) dix = rattacher(dix, `2026-0${i}`);
    const dixFactures = calculerStatistiques(dix);

    for (const stats of [uneFacture, deuxFactures, dixFactures]) {
      expect(stats.revenuEstime).toBeCloseTo(nu.revenuEstime, 2);
      expect(stats.totalHeures).toBeCloseTo(nu.totalHeures, 6);
      expect(stats.totalKm).toBeCloseTo(nu.totalKm, 6);
    }

    // Et les chiffres eux-mêmes : 2 × 7 h, 2 × 80 km, 2 × (455 + 44 + 25).
    expect(nu.totalHeures).toBeCloseTo(14, 6);
    expect(nu.totalKm).toBeCloseTo(160, 6);
    expect(nu.revenuEstime).toBeCloseTo(1048, 2);
  });
});

describe('heures et pause', () => {
  test('un quart de 9 h à 17 h avec 1 h de pause non payée compte 7 h', () => {
    const stats = calculerStatistiques([unQuart({ pause_minutes: 60, pause_payee: 0 })]);
    expect(stats.totalHeures).toBeCloseTo(7, 6);
  });
});

describe('hébergement', () => {
  test('un hébergement fourni est absent de tous les totaux', () => {
    const pharmacie = unePharmacie({ hebergement_montant: 120, hebergement_fourni: 1 });
    // Fourni, il ne vaut rien : le quart hérite donc de zéro, et zéro entre
    // partout sans rien changer.
    expect(montantHebergement(pharmacie)).toBe(0);
    const stats = calculerStatistiques([unQuart({ hebergement_reclame: 0 })]);
    expect(stats.montantHebergement).toBe(0);
  });

  test('un hébergement payé entre dans « Argent »', () => {
    const stats = calculerStatistiques([unQuart({ taux_horaire: 0, hebergement_reclame: 120 })]);
    expect(stats.montantHebergement).toBe(120);
    expect(stats.revenuEstime).toBe(120);
  });
});

describe('série des douze mois', () => {
  test('toujours douze valeurs, un mois vide valant zéro', () => {
    const serie = serieMensuelle(() => ({ quarts: [], frais: [] }), '2026-09-17');
    expect(serie).toHaveLength(12);
    for (const mois of serie) {
      expect(valeurDe(mois, 'argent')).toBe(0);
      expect(valeurDe(mois, 'heures')).toBe(0);
      expect(valeurDe(mois, 'kilometres')).toBe(0);
    }
  });

  test('un mois sans quart reste dans la série au lieu d’en disparaître', () => {
    const serie = serieMensuelle(
      ([debut]) => ({
        quarts: debut === '2026-09-01' ? [unQuart({ date: '2026-09-10' })] : [],
        frais: [],
      }),
      '2026-09-17'
    );
    expect(serie).toHaveLength(12);
    expect(serie.filter((m) => valeurDe(m, 'heures') > 0)).toHaveLength(1);
    expect(serie[serie.length - 1].mois).toBe('2026-09-01');
  });
});

/**
 * Les trois mesures du graphique, et les deux façons d'en changer.
 *
 * Le balayage ne se voit pas. Rien, sur un graphique, ne dit qu'il y a deux
 * autres séries derrière celle qu'on regarde : un sélecteur visible est la
 * seule chose qui les annonce, et le balayage devient alors un raccourci pour
 * qui l'a découvert. L'un ne remplace pas l'autre.
 *
 * Les deux parcourent la même liste, dans le même ordre. Deux ordres
 * différents — un pour les onglets, un pour le balayage — donneraient deux
 * applications dans la même.
 */
describe('les mesures du graphique', () => {
  test('trois mesures, dans cet ordre', () => {
    // L'argent d'abord : c'est la question qu'on se pose en ouvrant l'écran.
    expect(MESURES).toEqual(['argent', 'heures', 'kilometres']);
  });

  test('le balayage vers la gauche passe à la suivante', () => {
    expect(mesureVoisine(MESURES, 'argent', 1)).toBe('heures');
    expect(mesureVoisine(MESURES, 'heures', 1)).toBe('kilometres');
  });

  test('le balayage vers la droite revient à la précédente', () => {
    expect(mesureVoisine(MESURES, 'kilometres', -1)).toBe('heures');
    expect(mesureVoisine(MESURES, 'heures', -1)).toBe('argent');
  });

  test('la liste boucle dans les deux sens', () => {
    // Un bord dur obligerait à revenir sur ses pas pour atteindre la troisième.
    expect(mesureVoisine(MESURES, 'kilometres', 1)).toBe('argent');
    expect(mesureVoisine(MESURES, 'argent', -1)).toBe('kilometres');
  });

  test('un décalage nul rend la mesure courante', () => {
    expect(mesureVoisine(MESURES, 'heures', 0)).toBe('heures');
  });

  test('chaque mesure a son icône et son mot dans le sélecteur', () => {
    // Une icône seule ne dit pas laquelle des trois : trois abstractions se
    // ressemblent trop à dix-huit points. L'icône donne le repère, le mot
    // donne la réponse.
    const source = readFileSync('app/(tabs)/statistiques.tsx', 'utf8');
    for (const mesure of MESURES) {
      const ligne = source
        .split('\n')
        .find((l) => l.includes(`valeur: '${mesure}'`));
      expect(ligne).toBeDefined();
      expect(ligne).toContain('icone:');
      expect(ligne).toContain(`statistiques.${mesure}`);
    }
  });

  test('le sélecteur et le balayage parcourent la même liste', () => {
    // Le graphique reçoit `MESURES` ; il n'en garde pas une copie à lui.
    const source = readFileSync('app/(tabs)/statistiques.tsx', 'utf8');
    expect(source).toContain('mesures={MESURES}');
    expect(readFileSync('src/ui/Graphique.tsx', 'utf8')).toContain('mesureVoisine');
  });
});
