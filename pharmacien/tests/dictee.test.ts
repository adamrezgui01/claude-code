import {
  dicteeDetaillee,
  parametresDuQuart,
  parametresNouvellePharmacie,
  suiteDeLaLecture,
  valeursDictees,
} from '../src/lib/dictee';
import { deposerPharmacieCreee, reprendrePharmacieCreee } from '../src/lib/retourPharmacie';
import { lire, type ContexteLecteur, type FicheQuart } from '../src/lib/lecteur';

/**
 * L'écran de dictée, et ce qu'il fait du résultat de la lecture.
 *
 * Deux règles tiennent tout ce fichier :
 *
 * 1. Un seul bouton, « Terminé ». L'usager n'a pas à savoir qu'il y a une
 *    étape de lecture : quand le lecteur a tout compris, la fiche s'ouvre
 *    sans second geste. Il ne reste à l'écran que ce qui demande une réponse.
 * 2. Le lecteur ne crée jamais une pharmacie. Un nom absent du répertoire
 *    devient une proposition de création, et la fiche de pharmacie s'ouvre
 *    préremplie. Ce qui avait été dicté pour le quart survit à ce détour.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-21',
  pharmacies: [
    { id: 1, nom: 'Pharmacie Tremblay et Associés inc.', banniere: 'Jean Coutu', ville: 'Laval', rue: 'boulevard Saint-Martin' },
    { id: 2, nom: 'Pharmacie Nguyen inc.', banniere: 'Jean Coutu', ville: 'Longueuil', rue: 'rue Saint-Charles' },
    { id: 3, nom: 'Pharmacie Lemieux', banniere: 'Familiprix', ville: 'Gatineau', rue: 'boulevard Maloney' },
  ],
  quarts: [],
};

function quart(phrase: string): FicheQuart {
  const fiche = lire(phrase, CONTEXTE);
  if (fiche.action !== 'quart') {
    throw new Error(`« ${phrase} » a donné « ${fiche.action} » au lieu d'un quart`);
  }
  return fiche;
}

// ===========================================================================
// Groupe 1 — un seul bouton
// ===========================================================================

describe('groupe 1 — « Terminé »', () => {
  test('une phrase entièrement comprise referme la dictée', () => {
    const fiche = quart('Ajoute un quart jeudi de 9 à 17 h au Familiprix de Gatineau');
    expect(fiche.questions).toHaveLength(0);
    expect(suiteDeLaLecture(fiche)).toBe('fermer');
  });

  test('une question retient l’écran le temps d’une réponse', () => {
    const fiche = quart('Ajoute un quart jeudi de 9 à 5 au Jean Coutu');
    expect(fiche.questions.length).toBeGreaterThan(0);
    expect(suiteDeLaLecture(fiche)).toBe('rester');
  });

  test('une recherche de pharmacie referme la dictée : elle mène ailleurs', () => {
    expect(suiteDeLaLecture({ action: 'pharmacie', recherche: 'lemieux' })).toBe('fermer');
  });

  test('une phrase incomprise reste affichée, sinon son message ne se lit pas', () => {
    expect(suiteDeLaLecture({ action: 'incompris' })).toBe('rester');
    expect(suiteDeLaLecture({ action: 'nonPrisEnCharge', raison: 'annulation' })).toBe('rester');
  });
});

// ===========================================================================
// Groupe 2 — la pharmacie entendue, jamais créée toute seule
// ===========================================================================

describe('groupe 2 — créer la pharmacie entendue', () => {
  test('un nom absent du répertoire laisse le champ vide et propose la création', () => {
    const fiche = quart('Ajoute un quart jeudi de 9 à 5 au Proxim de Trois-Rivières');
    expect(fiche.pharmacieId).toBeNull();

    const params = new URLSearchParams(parametresDuQuart(fiche));
    expect(params.get('pharmacie')).toBeNull();
    expect(params.get('creer')).toBe('Proxim Trois-Rivières');
  });

  test('le taux dicté suit jusque dans la fiche de pharmacie', () => {
    const fiche = quart(
      'Ajoute un quart jeudi de 9 à 5 au Proxim de Trois-Rivières à 70 piasses de l’heure'
    );
    expect(fiche.taux).toBe(70);

    const quartParams = new URLSearchParams(parametresDuQuart(fiche));
    expect(quartParams.get('taux')).toBe('70');

    const pharmacieParams = new URLSearchParams(
      parametresNouvellePharmacie('Proxim Trois-Rivières', '70')
    );
    expect(pharmacieParams.get('recherche')).toBe('Proxim Trois-Rivières');
    expect(pharmacieParams.get('taux')).toBe('70');
    // Sans cette marque, une pharmacie créée depuis le répertoire se
    // glisserait dans le prochain quart ouvert.
    expect(pharmacieParams.get('retour')).toBe('quart');
  });

  test('sans taux dicté, la fiche de pharmacie s’ouvre sans taux', () => {
    const params = new URLSearchParams(parametresNouvellePharmacie('Proxim Trois-Rivières', ''));
    expect(params.get('recherche')).toBe('Proxim Trois-Rivières');
    expect(params.get('taux')).toBeNull();
  });
});

// ===========================================================================
// Groupe 3 — ce qui a été dicté survit au détour
// ===========================================================================

describe('groupe 3 — la dictée survit à la création de la pharmacie', () => {
  const RIEN = {
    taux: null,
    pause: null,
    pausePayee: null,
    perDiem: null,
    kilometrage: null,
    allerRetour: null,
    montantFixe: null,
    hebergement: null,
  };

  test('les valeurs dictées se relisent, et zéro en est une', () => {
    expect(valeursDictees({ taux: '70', pause: '0', pausePayee: '0', perdiem: '0' })).toEqual({
      ...RIEN,
      taux: '70',
      pause: 0,
      pausePayee: false,
      perDiem: '0',
    });
  });

  test('ce qui n’a pas été dicté reste vide, et n’écrase donc rien', () => {
    expect(valeursDictees({})).toEqual(RIEN);
  });

  test('l’argent dicté passe par la route, et en revient tel quel', () => {
    const fiche = quart(
      'Ajoute un quart jeudi de 9 à 5 au Familiprix, per diem de 40, 120 km aller-retour, ' +
        '150 $ d’hébergement'
    );
    const params = Object.fromEntries(new URLSearchParams(parametresDuQuart(fiche)));
    expect(valeursDictees(params)).toEqual({
      ...RIEN,
      perDiem: '40',
      kilometrage: '120',
      allerRetour: true,
      hebergement: '150',
    });
  });

  test('un forfait de déplacement suit le même chemin', () => {
    const fiche = quart('Ajoute un quart jeudi de 9 à 5 au Familiprix, forfait de 60');
    const params = Object.fromEntries(new URLSearchParams(parametresDuQuart(fiche)));
    expect(valeursDictees(params).montantFixe).toBe('60');
  });

  test('une pause dictée traverse la création de la pharmacie', () => {
    const fiche = quart(
      'Ajoute un quart jeudi de 9 à 5 au Proxim de Trois-Rivières, break de 30 minutes'
    );
    expect(fiche.pauseMinutes).toBe(30);

    // Ce qui part vers la fiche du quart revient intact : c'est ce que la
    // fiche repose par-dessus les conditions de la pharmacie qu'on vient de
    // créer, où la pause vaut zéro par défaut.
    const params = new URLSearchParams(parametresDuQuart(fiche));
    expect(valeursDictees(Object.fromEntries(params)).pause).toBe(30);
  });

  test('« sans pause » traverse aussi : zéro est une valeur', () => {
    const fiche = quart('Ajoute un quart jeudi de 9 à 5 au Proxim de Trois-Rivières sans pause');
    expect(fiche.pauseMinutes).toBe(0);

    // Sans ce zéro, la pharmacie qu'on vient de créer imposerait sa pause
    // habituelle à un quart où l'usager a dit qu'il n'y en aurait pas.
    const params = new URLSearchParams(parametresDuQuart(fiche));
    expect(valeursDictees(Object.fromEntries(params)).pause).toBe(0);
  });

  test('une dictée qui porte de l’argent déplie les détails', () => {
    // Un per diem posé dans une section repliée se facturerait sans que
    // personne ne l'ait relu.
    expect(dicteeDetaillee(valeursDictees({ perdiem: '40' }))).toBe(true);
    expect(dicteeDetaillee(valeursDictees({ pause: '0' }))).toBe(true);
    expect(dicteeDetaillee(valeursDictees({}))).toBe(false);
  });

  test('la pharmacie créée se reprend une seule fois', () => {
    expect(reprendrePharmacieCreee()).toBeNull();
    deposerPharmacieCreee(12);
    expect(reprendrePharmacieCreee()).toBe(12);
    expect(reprendrePharmacieCreee()).toBeNull();
  });
});
