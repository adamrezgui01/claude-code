import { readFileSync } from 'node:fs';

import { parJour, quartsVisibles, repartir } from '../src/lib/horaire';
import { pharmacieQuiAnnule, annulationsImputables, SEUIL_ANNULATIONS } from '../src/lib/repertoire';
import { instant, unQuart } from './fabriques';

/**
 * Un quart annulé n'a pas eu lieu.
 *
 * Il ne se travaille pas, il ne se facture pas, et il n'a rien à faire dans
 * un horaire : barré au milieu d'une semaine, il occupe la place d'un vrai
 * quart et se relit comme un engagement à chaque coup d'œil. Il quitte donc
 * les trois vues d'un coup.
 *
 * Ce qu'il ne quitte pas, c'est la fiche de la pharmacie. Une pharmacie qui
 * annule trois fois est exactement ce que les favoris et les « à éviter »
 * doivent voir, et une ligne effacée ne dit rien du tout.
 *
 * Date de référence : jeudi 24 septembre 2026, 20 h.
 */

const MAINTENANT = instant('2026-09-24', '20:00');

describe('le quart annulé quitte l’horaire', () => {
  const ANNULE = unQuart({ id: 1, date: '2026-09-25', annule: 1, annule_par: 'pharmacie' });
  const AVENIR = unQuart({ id: 2, date: '2026-09-26' });
  const PASSE = unQuart({ id: 3, date: '2026-09-22' });
  const TOUS = [ANNULE, AVENIR, PASSE];

  test('il ne paraît dans aucun des trois paquets de la liste', () => {
    const { enCours, aVenir, anterieurs } = repartir(TOUS, MAINTENANT);
    const vus = [...enCours, ...aVenir, ...anterieurs].map((q) => q.id);
    expect(vus).not.toContain(ANNULE.id);
    expect(vus.sort()).toEqual([AVENIR.id, PASSE.id]);
  });

  test('un quart annulé passé ne tombe pas dans « Antérieurs » non plus', () => {
    // C'est le piège : « fini » dirait oui, et la liste des quarts faits se
    // remplirait de quarts qui n'ont pas eu lieu.
    const annulePasse = unQuart({ id: 4, date: '2026-09-20', annule: 1, annule_par: 'moi' });
    const { anterieurs } = repartir([annulePasse, PASSE], MAINTENANT);
    expect(anterieurs.map((q) => q.id)).toEqual([PASSE.id]);
  });

  test('il ne paraît pas dans la grille du mois', () => {
    const grille = parJour(quartsVisibles(TOUS));
    expect(grille.get('2026-09-25')).toBeUndefined();
    expect(grille.get('2026-09-26')?.map((q) => q.id)).toEqual([AVENIR.id]);
  });

  test('il ne paraît pas non plus dans la journée de la timeline', () => {
    // Même source pour les deux : la timeline et la grille lisent la même
    // carte par jour, et un quart retiré d'un côté ne peut pas rester de
    // l'autre.
    const grille = parJour(quartsVisibles([ANNULE]));
    expect(grille.size).toBe(0);
  });

  test('rien d’autre ne disparaît', () => {
    expect(quartsVisibles(TOUS).map((q) => q.id).sort()).toEqual([AVENIR.id, PASSE.id]);
  });

  test('l’horaire ne montre que les quarts visibles', () => {
    // L'écran ne filtre pas vue par vue : il filtre une fois, en haut, et les
    // trois vues partent de là. Un filtre par vue s'oublie à la quatrième.
    const source = readFileSync('app/(tabs)/index.tsx', 'utf8');
    expect(source).toContain('quartsVisibles');
  });

  test('la fiche de la pharmacie garde ses lignes d’annulation', () => {
    const source = readFileSync('app/pharmacie/[id].tsx', 'utf8');
    expect(source).toContain('quartsAnnulesPharmacie');
  });
});

/**
 * Une pharmacie qui annule.
 *
 * Trois fois en un an, c'est un motif, pas un accident : ça se dit, une fois,
 * sur la fiche et dans le répertoire — là où l'on choisit chez qui aller.
 * L'application ne décide rien à la place de l'usager ; elle lui montre ce
 * qu'elle a déjà dans sa base et qu'il ne compterait pas de tête.
 */
describe('la pharmacie qui annule', () => {
  const CEJOUR = '2026-09-24';

  function annulation(date: string, par: string) {
    return { date, annule_par: par };
  }

  test('trois annulations de la pharmacie en douze mois : signalée', () => {
    const annules = [
      annulation('2026-09-20', 'pharmacie'),
      annulation('2026-06-02', 'pharmacie'),
      annulation('2026-01-15', 'pharmacie'),
    ];
    expect(SEUIL_ANNULATIONS).toBe(3);
    expect(pharmacieQuiAnnule(annules, CEJOUR)).toBe(true);
  });

  test('deux ne suffisent pas', () => {
    // Deux annulations en un an arrivent à tout le monde. Signaler là, c'est
    // apprendre à l'usager à ne plus lire le signal.
    const annules = [annulation('2026-09-20', 'pharmacie'), annulation('2026-06-02', 'pharmacie')];
    expect(pharmacieQuiAnnule(annules, CEJOUR)).toBe(false);
  });

  test('celles qu’on a annulées soi-même ne comptent pas', () => {
    // Elles restent sur la fiche — c'est de l'histoire —, mais elles ne disent
    // rien sur la pharmacie, et c'est la pharmacie qu'on signale.
    const annules = [
      annulation('2026-09-20', 'moi'),
      annulation('2026-06-02', 'moi'),
      annulation('2026-01-15', 'moi'),
    ];
    expect(annulationsImputables(annules, CEJOUR)).toHaveLength(0);
    expect(pharmacieQuiAnnule(annules, CEJOUR)).toBe(false);
  });

  test('celles dont on ne sait pas qui les a faites ne comptent pas', () => {
    // Un quart annulé avant que l'application pose la question. On n'impute
    // pas à la pharmacie ce qu'on ne sait pas.
    const annules = [
      annulation('2026-09-20', ''),
      annulation('2026-06-02', ''),
      annulation('2026-01-15', ''),
    ];
    expect(pharmacieQuiAnnule(annules, CEJOUR)).toBe(false);
  });

  test('une annulation de plus de douze mois ne compte plus', () => {
    const annules = [
      annulation('2026-09-20', 'pharmacie'),
      annulation('2026-06-02', 'pharmacie'),
      annulation('2025-09-01', 'pharmacie'),
    ];
    expect(annulationsImputables(annules, CEJOUR)).toHaveLength(2);
    expect(pharmacieQuiAnnule(annules, CEJOUR)).toBe(false);
  });

  test('une annulation d’un quart à venir compte tout de suite', () => {
    // C'est même le cas le plus parlant : elle vient d'arriver, et le
    // remplacement de la semaine prochaine est à refaire.
    const annules = [
      annulation('2026-10-10', 'pharmacie'),
      annulation('2026-06-02', 'pharmacie'),
      annulation('2026-01-15', 'pharmacie'),
    ];
    expect(pharmacieQuiAnnule(annules, CEJOUR)).toBe(true);
  });

  test('une pharmacie sans annulation n’est pas signalée', () => {
    expect(pharmacieQuiAnnule([], CEJOUR)).toBe(false);
  });
});
