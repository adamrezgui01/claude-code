import { urgenceQuart } from '../src/lib/echeance';
import { joursEnAttente, relanceDue } from '../src/lib/relance';
import { formaterTelephone, formaterTelephoneSaisie } from '../src/lib/telephone';
import { instant, uneFacture } from './fabriques';

/**
 * Trois règles courtes, groupées : la couleur d'un point sur la carte, la
 * relance d'une facture impayée, et le masque du téléphone.
 */

describe('couleur des points sur la carte', () => {
  // Les bornes appartiennent au palier le plus pressant.
  const cas: { titre: string; heures: number; attendu: string }[] = [
    { titre: '47 h', heures: 47, attendu: 'urgent' },
    { titre: '48 h', heures: 48, attendu: 'urgent' },
    { titre: '49 h', heures: 49, attendu: 'proche' },
    { titre: '14 jours', heures: 14 * 24, attendu: 'proche' },
    { titre: '15 jours', heures: 15 * 24, attendu: 'lointain' },
  ];

  test.each(cas)('$titre avant le début : $attendu', ({ heures, attendu }) => {
    expect(urgenceQuart(heures)).toBe(attendu);
  });
});

describe('relance des factures impayées', () => {
  const genereeLe = '2026-09-01';
  const facture = (champs = {}) => uneFacture({ date_generation: genereeLe, ...champs });

  test('délai de 30 jours, en attente depuis 31 jours : rappel dû', () => {
    expect(relanceDue(facture(), 30, instant('2026-10-02', '09:00'))).toBe(true);
  });

  test('délai de 30 jours, en attente depuis 29 jours : aucun rappel', () => {
    expect(relanceDue(facture(), 30, instant('2026-09-30', '09:00'))).toBe(false);
  });

  test('facture payée, générée il y a 40 jours : aucun rappel', () => {
    expect(
      relanceDue(facture({ statut_paiement: 'payee' }), 30, instant('2026-10-11', '09:00'))
    ).toBe(false);
  });

  test('délai réglé à 15 jours, en attente depuis 16 jours : rappel dû', () => {
    expect(relanceDue(facture(), 15, instant('2026-09-17', '09:00'))).toBe(true);
  });

  test('rappel déjà envoyé : aucun second rappel', () => {
    // Un rappel doux ne se répète pas.
    expect(
      relanceDue(facture({ relance_faite: 1 }), 30, instant('2026-10-31', '09:00'))
    ).toBe(false);
  });

  test('un délai de zéro éteint la relance', () => {
    expect(relanceDue(facture(), 0, instant('2027-01-01', '09:00'))).toBe(false);
  });

  test('les jours d’attente se comptent depuis la génération', () => {
    expect(joursEnAttente(facture(), instant('2026-09-01', '12:00'))).toBe(0);
    expect(joursEnAttente(facture(), instant('2026-10-01', '00:00'))).toBe(30);
  });
});

describe('masque du téléphone', () => {
  test('dix chiffres deviennent (514) 968-7204', () => {
    expect(formaterTelephone('5149687204')).toBe('(514) 968-7204');
    expect(formaterTelephoneSaisie('', '5149687204')).toBe('(514) 968-7204');
  });

  test('un numéro déjà ponctué se reformate pareil', () => {
    expect(formaterTelephone('514-968-7204')).toBe('(514) 968-7204');
    expect(formaterTelephoneSaisie('', '514-968-7204')).toBe('(514) 968-7204');
  });

  test('effacer retire un chiffre, pas seulement un séparateur', () => {
    // Sans cette règle, reculer sur « (514) » ne ferait que réécrire la
    // parenthèse, et le curseur resterait bloqué.
    expect(formaterTelephoneSaisie('(514) 968-7204', '(514) 968-720')).toBe('(514) 968-720');
    expect(formaterTelephoneSaisie('(514', '(51')).toBe('51');
  });
});
