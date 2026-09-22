import {
  FENETRE_CAPTURE_MINUTES,
  doitProposerBandeau,
  offresBandeau,
  type Consultation,
} from '../src/lib/veille/capture';

/**
 * Le bandeau de capture.
 *
 * Le module ne voit que ce qui passe par l'application. Toute sa valeur vient
 * donc du moment où l'usager revient d'un lien qu'il allait consulter de toute
 * façon : quatre touchers, et le point clé est écrit. Tout ce qui alourdit ce
 * geste coûte plus cher que ce qu'il rapporte.
 *
 * Le retour au premier plan arrive aussi quand on déverrouille son téléphone
 * ou qu'on revient d'une autre application. D'où la fenêtre de trente minutes,
 * et le bandeau qui ne se propose qu'une fois par consultation.
 */

const QUATORZE_HEURES = Date.parse('2026-09-21T14:00:00');
const MINUTE = 60 * 1000;

function consultation(champs: Partial<Consultation> = {}): Consultation {
  return { sourceId: 7, le: QUATORZE_HEURES, vue: false, captureDesactivee: false, ...champs };
}

describe('quand le bandeau se propose', () => {
  test('la fenêtre est de trente minutes', () => {
    expect(FENETRE_CAPTURE_MINUTES).toBe(30);
  });

  test('lien ouvert à 14 h, retour à 14 h 10 : bandeau', () => {
    expect(doitProposerBandeau(consultation(), QUATORZE_HEURES + 10 * MINUTE, true)).toBe(true);
  });

  test('lien ouvert à 14 h, retour à 14 h 45 : rien', () => {
    // Le téléphone s'est déverrouillé pour autre chose. Proposer d'écrire une
    // note sur un lien lu il y a trois quarts d'heure est du bruit.
    expect(doitProposerBandeau(consultation(), QUATORZE_HEURES + 45 * MINUTE, true)).toBe(false);
  });

  test('à la trentième minute pile, le bandeau se propose encore', () => {
    expect(doitProposerBandeau(consultation(), QUATORZE_HEURES + 30 * MINUTE, true)).toBe(true);
  });

  test('un bandeau déjà proposé pour cette consultation ne revient pas', () => {
    // Utilisé ou ignoré, c'est pareil : insister est le plus sûr moyen de
    // faire couper le bandeau dans les réglages.
    expect(
      doitProposerBandeau(consultation({ vue: true }), QUATORZE_HEURES + 20 * MINUTE, true)
    ).toBe(false);
  });

  test('aucune consultation, aucun bandeau', () => {
    expect(doitProposerBandeau(null, QUATORZE_HEURES, true)).toBe(false);
  });
});

describe('ce qui coupe le bandeau', () => {
  test('la source marquée « ne plus proposer »', () => {
    // Le PIQ se consulte pour une dose, pas pour apprendre. Vérifier chaque
    // fois est la bonne pratique, pas une lacune à réviser.
    expect(
      doitProposerBandeau(consultation({ captureDesactivee: true }), QUATORZE_HEURES + MINUTE, true)
    ).toBe(false);
  });

  test('le réglage général', () => {
    expect(doitProposerBandeau(consultation(), QUATORZE_HEURES + MINUTE, false)).toBe(false);
  });
});

describe('plusieurs liens ouverts à la suite', () => {
  test('le bandeau porte sur le dernier', () => {
    // 14 h puis 14 h 05, retour à 14 h 10 : c'est le second qu'on vient de
    // lire, et c'est de lui qu'on se souvient.
    const derniere = consultation({ sourceId: 9, le: QUATORZE_HEURES + 5 * MINUTE });
    expect(doitProposerBandeau(derniere, QUATORZE_HEURES + 10 * MINUTE, true)).toBe(true);
    expect(derniere.sourceId).toBe(9);
  });
});

describe('ce que le bandeau offre', () => {
  test('les sujets de la source qui ne sont pas encore suivis', () => {
    expect(offresBandeau([1, 2, 3], new Set([2]))).toEqual({ note: true, suivre: [1, 3] });
  });

  test('tous les sujets déjà suivis : plus rien à suivre', () => {
    expect(offresBandeau([1, 2], new Set([1, 2]))).toEqual({ note: true, suivre: [] });
  });

  test('une source sans aucun sujet propose quand même d’écrire une note', () => {
    // C'est l'offre principale. Un sujet à suivre est un bonus.
    expect(offresBandeau([], new Set())).toEqual({ note: true, suivre: [] });
  });
});
