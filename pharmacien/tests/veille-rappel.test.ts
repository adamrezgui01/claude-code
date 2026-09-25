import { fr } from '../src/i18n/fr';
import { sujetsNommes } from '../src/lib/veille/rappel';

/**
 * Quels sujets la notification du soir nomme.
 *
 * Une notification qui ne mène à rien apprend à ignorer toutes les autres :
 * celle-ci nomme ce qu'il y a à faire, jamais ce qui a été fait.
 *
 * L'heure et la mise en forme ne sont plus vérifiées ici : depuis qu'il n'y a
 * qu'une notification par jour, elles appartiennent au rendez-vous du soir, et
 * `tests/rendezvous.test.ts` s'en occupe. Le regroupement d'heures qui évitait
 * deux vibrations dans la même soirée n'a plus d'objet — il n'y a plus qu'une
 * seule notification à placer.
 */

describe('quels sujets sont nommés', () => {
  test('deux au plus, les plus fournis d’abord', () => {
    // Trois noms sur un écran verrouillé sont tronqués, et un nom tronqué ne
    // sert à rien.
    const { nommes, autres } = sujetsNommes([
      { nom: 'Bronchite', notes: 1 },
      { nom: 'Infections urinaires', notes: 4 },
      { nom: 'Vaccination', notes: 2 },
    ]);
    expect(nommes).toEqual(['Infections urinaires', 'Vaccination']);
    expect(autres).toBe(1);
  });

  test('à égalité, l’ordre alphabétique', () => {
    // Sans règle de départage, l'ordre suivrait celui de la base, et le même
    // soir donnerait deux résultats différents à deux ouvertures.
    const { nommes } = sujetsNommes([
      { nom: 'Vaccination', notes: 2 },
      { nom: 'Bronchite', notes: 2 },
    ]);
    expect(nommes).toEqual(['Bronchite', 'Vaccination']);
  });

  test('on peut demander tous les sujets, et le rendez-vous tranchera', () => {
    const sujets = [
      { nom: 'Bronchite', notes: 1 },
      { nom: 'Infections urinaires', notes: 4 },
      { nom: 'Vaccination', notes: 2 },
    ];
    expect(sujetsNommes(sujets, sujets.length).nommes).toHaveLength(3);
  });

  test('aucun sujet, aucun nom', () => {
    expect(sujetsNommes([])).toEqual({ nommes: [], autres: 0 });
  });
});

describe('ce que les notifications ne disent jamais', () => {
  test('aucun bilan d’activité, jamais', () => {
    // « Vous avez consulté 3 sujets cette semaine » ne mène à aucune action.
    const textes = Object.values(fr.notifications as Record<string, string>);
    expect(textes.some((t) => /consult|semaine|cette année|bravo/i.test(t))).toBe(false);
  });

  test('aucun compte dans le corps du rendez-vous', () => {
    // Les comptes sont lisibles dans l'application ; sur un écran verrouillé,
    // « 4 révisions, 2 factures » se balaie sans y penser.
    const corps = Object.entries(fr.notifications as Record<string, string>)
      .filter(([cle]) => cle.startsWith('ligne') || cle === 'etDautres')
      .map(([, texte]) => texte);
    expect(corps.length).toBeGreaterThan(0);
    expect(corps.some((t) => t.includes('{{count}}'))).toBe(false);
  });
});
