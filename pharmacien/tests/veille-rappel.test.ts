import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import {
  HEURE_DEFAUT,
  heureDuRappel,
  sujetsNommes,
  texteDuRappel,
} from '../src/lib/veille/rappel';

/**
 * La notification du soir.
 *
 * Deux vibrations à une heure d'intervalle, c'est une de trop, et c'est celle
 * qu'on coupe. D'où le regroupement. Et une notification qui ne mène à rien
 * apprend à ignorer toutes les autres : celle-ci nomme ce qu'il y a à faire,
 * jamais ce qui a été fait.
 */

function traduire(langue: 'fr' | 'en') {
  const section = (langue === 'fr' ? fr : en).notifications as Record<string, string>;
  return (cle: string, valeurs?: Record<string, unknown>) => {
    const nu = cle.replace('notifications.', '');
    const compte = Number(valeurs?.count ?? 0);
    const pluriel = langue === 'fr' ? (compte > 1 ? 'other' : 'one') : compte === 1 ? 'one' : 'other';
    let texte = section[nu] ?? section[`${nu}_${pluriel}`] ?? cle;
    for (const [nom, valeur] of Object.entries(valeurs ?? {})) {
      texte = texte.replace(`{{${nom}}}`, `${valeur}`);
    }
    return texte;
  };
}

describe('à quelle heure elle part', () => {
  test('vingt heures par défaut', () => {
    expect(HEURE_DEFAUT).toBe('20:00');
  });

  test('aucune autre notification ce soir-là : à l’heure choisie', () => {
    expect(heureDuRappel('20:00', [])).toBe('20:00');
  });

  test('un mémo de fin de quart à 19 h : la veille part avec lui', () => {
    // Après un quart de 9 h à 17 h, le mémo tombe à 19 h. Sauter la veille ce
    // jour-là la ferait sauter presque chaque jour travaillé, et les révisions
    // s'accumuleraient jusqu'aux congés.
    expect(heureDuRappel('20:00', ['19:00'])).toBe('19:00');
  });

  test('une relance à 18 h et un mémo à 19 h : la veille part à 18 h', () => {
    expect(heureDuRappel('20:00', ['19:00', '18:00'])).toBe('18:00');
  });

  test('un mémo à 23 h est hors de la plage : la veille garde son heure', () => {
    expect(heureDuRappel('20:00', ['23:00'])).toBe('20:00');
  });

  test('un mémo à 16 h non plus', () => {
    expect(heureDuRappel('20:00', ['16:00'])).toBe('20:00');
  });

  test('heure réglée à 21 h, rien d’autre : 21 h', () => {
    expect(heureDuRappel('21:00', [])).toBe('21:00');
  });

  test('une heure choisie le matin ne se fait pas tirer vers le soir', () => {
    // Quelqu'un qui règle son rappel à 8 h le veut le matin. L'avancer à 19 h
    // parce qu'un mémo de quart y tombe serait défaire son choix.
    expect(heureDuRappel('08:00', ['19:00'])).toBe('08:00');
  });
});

describe('quels sujets sont nommés', () => {
  test('deux au plus, les plus fournis d’abord', () => {
    expect(
      sujetsNommes([
        { nom: 'A', notes: 3 },
        { nom: 'B', notes: 2 },
        { nom: 'C', notes: 1 },
        { nom: 'D', notes: 1 },
      ])
    ).toEqual({ nommes: ['A', 'B'], autres: 2 });
  });

  test('à égalité, l’ordre alphabétique', () => {
    expect(
      sujetsNommes([
        { nom: 'Zona', notes: 2 },
        { nom: 'Anémie', notes: 2 },
      ])
    ).toEqual({ nommes: ['Anémie', 'Zona'], autres: 0 });
  });
});

describe('ce que la notification dit', () => {
  test('deux sujets dus', () => {
    const texte = texteDuRappel(
      [
        { nom: 'Infections urinaires', notes: 2 },
        { nom: 'Bronchite', notes: 1 },
      ],
      0,
      traduire('fr')
    );
    expect(texte).toEqual({
      titre: 'Veille clinique',
      corps: 'À réviser : Infections urinaires, Bronchite',
    });
  });

  test('quatre sujets : deux nommés, puis « et 2 autres »', () => {
    const texte = texteDuRappel(
      [
        { nom: 'A', notes: 3 },
        { nom: 'B', notes: 2 },
        { nom: 'C', notes: 1 },
        { nom: 'D', notes: 1 },
      ],
      0,
      traduire('fr')
    );
    expect(texte?.corps).toBe('À réviser : A, B et 2 autres');
  });

  test('une source à revérifier s’ajoute sur une seconde ligne', () => {
    const texte = texteDuRappel([{ nom: 'Infections urinaires', notes: 2 }], 1, traduire('fr'));
    expect(texte?.corps).toBe('À réviser : Infections urinaires\n1 source à revérifier');
  });

  test('seulement une source à revérifier', () => {
    expect(texteDuRappel([], 1, traduire('fr'))?.corps).toBe('1 source à revérifier');
  });

  test('rien à faire : aucune notification', () => {
    expect(texteDuRappel([], 0, traduire('fr'))).toBeNull();
  });

  test('en anglais, le sujet créé par l’usager reste tel qu’il l’a tapé', () => {
    // « Bronchite » ne se traduit pas : c'est son mot, pas celui de
    // l'application.
    const texte = texteDuRappel(
      [
        { nom: 'Urinary tract infections', notes: 2 },
        { nom: 'Bronchite', notes: 1 },
      ],
      0,
      traduire('en')
    );
    expect(texte).toEqual({
      titre: 'Clinical watch',
      corps: 'To review: Urinary tract infections, Bronchite',
    });
  });

  test('aucun bilan d’activité, jamais', () => {
    const textes = Object.entries(fr.notifications as Record<string, string>)
      .filter(([cle]) => cle.startsWith('veille'))
      .map(([, texte]) => texte);
    expect(textes.some((t) => /consult|semaine|cette année|bravo/i.test(t))).toBe(false);
  });
});
