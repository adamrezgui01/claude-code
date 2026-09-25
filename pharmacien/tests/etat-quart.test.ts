import { readFileSync } from 'node:fs';

import { etatFacturation, marqueDuQuart } from '../src/lib/facturation';
import { instant, unQuart } from './fabriques';

/**
 * Les états d'un quart, et ce qu'ils veulent dire à l'œil.
 *
 * Le gris ne dit qu'une chose : facturé, donc figé, la facture est partie chez
 * le client. Un quart fait mais pas encore facturé est exactement le
 * contraire — c'est celui sur lequel il reste du travail, et c'est l'étape qui
 * rapporte. Le griser dirait « rien à voir ici » sur la seule chose qui
 * attend.
 *
 * Date de référence : jeudi 24 septembre 2026, 20 h.
 */

const MAINTENANT = instant('2026-09-24', '20:00');

describe('l’état d’un quart', () => {
  test('un quart à venir est à venir', () => {
    const quart = unQuart({ date: '2026-09-25', heure_debut: '09:00', heure_fin: '17:00' });
    expect(etatFacturation(quart, MAINTENANT)).toBe('aVenir');
  });

  test('un quart fini sans facture est à facturer', () => {
    const quart = unQuart({ date: '2026-09-23', heure_debut: '09:00', heure_fin: '17:00' });
    expect(etatFacturation(quart, MAINTENANT)).toBe('aFacturer');
  });

  test('un quart fini et facturé est facturé', () => {
    const quart = unQuart({
      date: '2026-09-23',
      heure_debut: '09:00',
      heure_fin: '17:00',
      numero_facture: '2026-014',
    });
    expect(etatFacturation(quart, MAINTENANT)).toBe('facture');
  });

  test('une facture ne fige rien avant la fin du quart', () => {
    // C'est la règle du verrou depuis la 1.4.1 : on facture parfois d'avance,
    // et le quart reste modifiable jusqu'à ce qu'il soit fait.
    const quart = unQuart({
      date: '2026-09-25',
      heure_debut: '09:00',
      heure_fin: '17:00',
      numero_facture: '2026-014',
    });
    expect(etatFacturation(quart, MAINTENANT)).toBe('aVenir');
  });

  test('un quart annulé l’est avant tout le reste', () => {
    const quart = unQuart({
      date: '2026-09-23',
      heure_debut: '09:00',
      heure_fin: '17:00',
      numero_facture: '2026-014',
      annule: 1,
    });
    expect(etatFacturation(quart, MAINTENANT)).toBe('annule');
  });

  test('un quart du jour même, pas encore fini, reste à venir', () => {
    // Fini veut dire fini : un quart de 18 h à 23 h n'est pas « passé » à 20 h
    // parce que sa date l'est.
    const quart = unQuart({ date: '2026-09-24', heure_debut: '18:00', heure_fin: '23:00' });
    expect(etatFacturation(quart, MAINTENANT)).toBe('aVenir');
  });

  test('un quart de nuit qui court encore n’est pas à facturer', () => {
    // Commencé hier 22 h, fini ce matin 7 h : celui-là est bien fini.
    const nuit = unQuart({ date: '2026-09-23', heure_debut: '22:00', heure_fin: '07:00' });
    expect(etatFacturation(nuit, MAINTENANT)).toBe('aFacturer');

    // Commencé ce soir 22 h : il finit demain matin, il n'est pas fait.
    const ceSoir = unQuart({ date: '2026-09-24', heure_debut: '22:00', heure_fin: '07:00' });
    expect(etatFacturation(ceSoir, MAINTENANT)).toBe('aVenir');
  });

  test('« fini » veut dire la même chose partout : l’horaire prévu', () => {
    // Un quart écourté à 17 h mais prévu jusqu'à 23 h reste « à venir » à
    // 20 h. C'est discutable à l'œil, et c'est voulu : la même définition de
    // « fini » sert au verrou de facturation, à la bascule vers « Antérieurs »
    // et à la couleur. Deux définitions finiraient par diverger, et le verrou
    // est celle qui protège une facture déjà envoyée.
    const quart = unQuart({
      date: '2026-09-24',
      heure_debut: '09:00',
      heure_fin: '23:00',
      heure_fin_reelle: '17:00',
    });
    expect(etatFacturation(quart, MAINTENANT)).toBe('aVenir');
  });
});

/**
 * Quatre états, et ce que l'œil doit pouvoir en tirer sans lire.
 *
 * Le quatrième est le paiement. Un quart facturé et un quart payé sont deux
 * situations différentes — dans l'une, on attend de l'argent ; dans l'autre,
 * l'affaire est close — et les distinguer par deux nuances de gris ne les
 * distingue pas du tout : personne ne compare deux gris de mémoire, d'un écran
 * à l'autre, en plein soleil. Ils partagent donc le gris et diffèrent par leur
 * pastille.
 */
describe('les quatre états, et leur marque', () => {
  const FINI = { date: '2026-09-23', heure_debut: '09:00', heure_fin: '17:00' };
  const PAYEES = new Set(['2026-014']);

  test('un quart facturé mais pas payé est facturé', () => {
    const quart = unQuart({ ...FINI, numero_facture: '2026-015' });
    expect(etatFacturation(quart, MAINTENANT, PAYEES)).toBe('facture');
  });

  test('un quart dont la facture est payée est payé', () => {
    const quart = unQuart({ ...FINI, numero_facture: '2026-014' });
    expect(etatFacturation(quart, MAINTENANT, PAYEES)).toBe('paye');
  });

  test('facturé et payé partagent le gris, et diffèrent par la pastille', () => {
    const facture = marqueDuQuart('facture');
    const paye = marqueDuQuart('paye');
    expect(facture.ton).toBe(paye.ton);
    expect(facture.ton).toBe('gris');
    expect(facture.creuse).not.toBe(paye.creuse);
  });

  test('chacun des quatre a sa propre marque', () => {
    // Deux états qui se ressemblent à l'œil sont un état de moins.
    const marques = (['aVenir', 'aFacturer', 'facture', 'paye'] as const).map((etat) => {
      const m = marqueDuQuart(etat);
      return `${m.ton}-${m.creuse ? 'creuse' : 'pleine'}`;
    });
    expect(new Set(marques).size).toBe(4);
  });

  test('un quart à venir garde la couleur d’accent, un quart réglé prend le gris', () => {
    expect(marqueDuQuart('aVenir').ton).toBe('accent');
    // Fait, pas encore facturé : c'est l'étape qui rapporte, elle reste vive.
    expect(marqueDuQuart('aFacturer').ton).toBe('accent');
    expect(marqueDuQuart('facture').ton).toBe('gris');
    expect(marqueDuQuart('paye').ton).toBe('gris');
  });

  test('sans liste de factures payées, rien n’est payé', () => {
    // La liste vient de la base. Un écran qui ne la donne pas ne doit pas
    // inventer un paiement.
    const quart = unQuart({ ...FINI, numero_facture: '2026-014' });
    expect(etatFacturation(quart, MAINTENANT)).toBe('facture');
  });

  test('une facture payée ne fige rien avant la fin du quart', () => {
    // Même règle que pour le verrou : on facture parfois d'avance.
    const quart = unQuart({
      date: '2026-09-25',
      heure_debut: '09:00',
      heure_fin: '17:00',
      numero_facture: '2026-014',
    });
    expect(etatFacturation(quart, MAINTENANT, PAYEES)).toBe('aVenir');
  });

  test('l’annulation passe avant le paiement', () => {
    const quart = unQuart({ ...FINI, numero_facture: '2026-014', annule: 1 });
    expect(etatFacturation(quart, MAINTENANT, PAYEES)).toBe('annule');
  });

  test('les trois vues de l’horaire lisent le même état', () => {
    // Le mois, la timeline et la liste ont chacune leur façon de dessiner, et
    // aucune n'a le droit de recalculer l'état elle-même : trois calculs
    // finiraient par diverger, et c'est le gris qui dit « facture partie ».
    for (const chemin of ['src/ui/Calendrier.tsx', 'src/ui/VueColonnes.tsx', 'src/ui/LigneQuart.tsx']) {
      const source = readFileSync(chemin, 'utf8');
      expect(source).toContain('EtatFacturation');
      expect(source).not.toContain('numero_facture &&');
    }
  });
});
