import { etatFacturation } from '../src/lib/facturation';
import { instant, unQuart } from './fabriques';

/**
 * Les trois états d'un quart, et ce qu'ils veulent dire à l'œil.
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
