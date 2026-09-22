import {
  AUCUN_SERVICE,
  construireRequete,
  mesures,
  validerReponse,
  type NotePourIA,
} from '../src/lib/veille/ia';

/**
 * Ce qu'on envoie à l'IA, et ce qu'on accepte d'elle.
 *
 * Ces deux règles sont écrites et vérifiées en phase 1 alors que le service
 * n'existe pas encore. C'est volontaire : le jour où on branchera un
 * fournisseur, il sera tard pour découvrir qu'on lui envoyait le texte d'un
 * document protégé, ou qu'on acceptait une durée de traitement sortie de
 * nulle part.
 */

const NOTE: NotePourIA = {
  texte: 'Cystite non compliquée : nitrofurantoïne 100 mg 2 fois par jour pendant 5 jours.',
  question: '',
  source: 'INESSS — cystite',
  version: '2024',
};

describe('la phase 1 n’a pas de service', () => {
  test('il se déclare indisponible', () => {
    expect(AUCUN_SERVICE.disponible()).toBe(false);
  });

  test('et ne produit rien', async () => {
    expect(await AUCUN_SERVICE.genererQuestion([NOTE])).toEqual([]);
  });
});

describe('ce qu’on envoie', () => {
  test('les notes de l’usager, avec leurs références', () => {
    const requete = construireRequete([NOTE]);
    expect(requete).toContain('nitrofurantoïne 100 mg');
    expect(requete).toContain('INESSS — cystite');
    expect(requete).toContain('2024');
  });

  test('les consignes accompagnent chaque envoi', () => {
    const requete = construireRequete([NOTE]);
    expect(requete).toContain('N’utilise que les notes fournies');
    expect(requete).toContain('aucune dose, aucune durée');
  });

  test('une note sans source le dit franchement', () => {
    const requete = construireRequete([{ ...NOTE, source: '', version: '' }]);
    expect(requete).toContain('Source : aucune');
  });

  test('rien d’autre que les notes n’entre dans la requête', () => {
    // La base ne contient pas le texte des documents. Ce test existe pour que
    // ça reste vrai le jour où quelqu'un ajoutera un champ à la note.
    const requete = construireRequete([NOTE]);
    const attendus = ['Point clé', 'Source', 'Note 1'];
    const lignes = requete
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('N’') && !l.startsWith('Cite') && !l.startsWith('Réponds'));
    expect(lignes.every((l) => attendus.some((a) => l.startsWith(a)))).toBe(true);
  });
});

describe('les mesures citées', () => {
  test('une dose et une durée', () => {
    expect(mesures('100 mg pendant 5 jours')).toEqual(['100 mg', '5 jour']);
  });

  test('une fréquence', () => {
    expect(mesures('2 fois par jour')).toEqual(['2 fois par jour']);
  });

  test('un texte sans chiffre n’en contient aucune', () => {
    expect(mesures('Prendre avec de la nourriture')).toEqual([]);
  });
});

describe('ce qu’on accepte de recevoir', () => {
  function reponse(contenu: Record<string, unknown>) {
    return JSON.stringify({ contenus: [contenu] });
  }

  test('une réponse qui cite les mesures de la note', () => {
    const brut = reponse({
      type: 'question',
      question: 'Quelle dose de nitrofurantoïne ?',
      reponse: '100 mg 2 fois par jour pendant 5 jours',
      source: 'INESSS — cystite',
      version: '2024',
    });
    expect(validerReponse(brut, [NOTE]).ok).toBe(true);
  });

  test('une réponse qui invente une durée est refusée', () => {
    // La note dit 5 jours. « 7 jours » ne vient de nulle part.
    //
    // Ce filtre est une heuristique, pas une garantie : un programme ne peut
    // pas savoir si une posologie est inventée, seulement qu'un nombre suivi
    // d'une unité n'apparaît pas dans ce qu'on a envoyé. Le vrai garde-fou
    // reste l'approbation de l'usager, une par une.
    const brut = reponse({
      type: 'question',
      question: 'Quelle durée ?',
      reponse: '7 jours',
      source: 'INESSS — cystite',
      version: '2024',
    });
    const resultat = validerReponse(brut, [NOTE]);
    expect(resultat.ok).toBe(false);
    expect(resultat.refus).toContain('mesureInconnue');
  });

  test('une réponse sans aucun chiffre passe', () => {
    const brut = reponse({
      type: 'question',
      question: 'Quel antibiotique en première intention ?',
      reponse: 'La nitrofurantoïne',
      source: 'INESSS — cystite',
      version: '2024',
    });
    expect(validerReponse(brut, [NOTE]).ok).toBe(true);
  });

  test('une réponse sans source est refusée', () => {
    const brut = reponse({ type: 'question', question: 'Quoi ?', reponse: 'Ça' });
    expect(validerReponse(brut, [NOTE]).refus).toBe('sansSource');
  });

  test('une réponse à qui il manque un champ est refusée', () => {
    const brut = reponse({ type: 'question', question: 'Quoi ?', source: 'INESSS' });
    expect(validerReponse(brut, [NOTE]).refus).toBe('champManquant');
  });

  test('du JSON mal formé ne fait pas tomber l’application', () => {
    expect(validerReponse('{ ceci n’est pas du JSON', [NOTE])).toEqual({
      ok: false,
      contenus: [],
      refus: 'jsonInvalide',
    });
  });

  test('une réponse vide est refusée', () => {
    expect(validerReponse('{"contenus":[]}', [NOTE]).refus).toBe('structureInvalide');
  });

  test('une mesure inventée dans un choix est attrapée aussi', () => {
    const brut = reponse({
      type: 'question',
      question: 'Quelle durée ?',
      choix: ['3 jours', '5 jours'],
      reponse: '5 jours',
      source: 'INESSS — cystite',
      version: '2024',
    });
    expect(validerReponse(brut, [NOTE]).ok).toBe(false);
  });
});
