import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatPlageDates } from '../src/lib/dates';
import {
  aimanterHeure,
  apresLaTape,
  apresLeGlisser,
  ajusterAutourDuQuart,
  bornerPlage,
  chevauchement,
  joursTraverses,
  disponibilites,
  disponibilitesEntre,
  finProposee,
  fusionner,
  joursOfferts,
  moisCouverts,
  plageNommee,
  plageValide,
  resumerPlages,
  BORNES_DEFAUT,
  type PlageDispo,
} from '../src/lib/disponibilites';

/**
 * Les disponibilités : ce qu'on offre, et rien d'autre.
 *
 * La règle qui tient tout le fichier : une journée n'est disponible que si
 * l'usager l'a déclarée. Une journée sans quart n'est pas une journée libre —
 * c'est peut-être un rendez-vous, une obligation, ou simplement un jour où il
 * ne veut pas travailler. Envoyer une image qui la montre libre, c'est
 * s'engager sur une journée qu'on n'a jamais offerte.
 *
 * Date de référence : lundi 21 septembre 2026.
 */

const DEPART = '2026-09-21';

function plage(date: string, debut = '', fin = ''): PlageDispo {
  return { date, toute_la_journee: debut === '', heure_debut: debut, heure_fin: fin };
}

// ===========================================================================
// Groupe 1 — rien n'est disponible par défaut
// ===========================================================================

describe('groupe 1 — le renversement', () => {
  test('sans déclaration, aucune journée n’est disponible', () => {
    const periode = disponibilites([], DEPART, 2);
    expect(periode.jours).toHaveLength(14);
    expect(periode.jours.every((j) => j.etat === 'neutre')).toBe(true);
    expect(joursOfferts(periode)).toBe(0);
  });

  test('une journée déclarée entière est complète', () => {
    const periode = disponibilites([plage('2026-09-24')], DEPART, 2);
    const jeudi = periode.jours.find((j) => j.date === '2026-09-24');
    expect(jeudi?.etat).toBe('complet');
    expect(jeudi?.plages).toEqual([]);
    expect(joursOfferts(periode)).toBe(1);
  });

  test('une journée déclarée en partie porte ses heures', () => {
    const periode = disponibilites([plage('2026-09-24', '08:00', '12:00')], DEPART, 2);
    const jeudi = periode.jours.find((j) => j.date === '2026-09-24');
    expect(jeudi?.etat).toBe('partiel');
    expect(jeudi?.plages).toEqual([{ debut: '08:00', fin: '12:00' }]);
  });

  test('une déclaration hors période ne rentre pas dans la grille', () => {
    const periode = disponibilites([plage('2026-12-25')], DEPART, 2);
    expect(joursOfferts(periode)).toBe(0);
  });

  test('la période garde ses bornes', () => {
    const periode = disponibilites([], DEPART, 2);
    expect({ debut: periode.debut, fin: periode.fin }).toEqual({
      debut: '2026-09-21',
      fin: '2026-10-04',
    });
  });

  test('les mois couverts se découpent comme avant', () => {
    const blocs = moisCouverts(disponibilites([], DEPART, 2));
    expect(blocs.map((b) => b.mois)).toEqual(['2026-09-01', '2026-10-01']);
  });
});

// ===========================================================================
// Groupe 2 — fusion des plages
// ===========================================================================

describe('groupe 2 — fusionner', () => {
  test('deux plages qui se chevauchent n’en font qu’une', () => {
    expect(
      fusionner([plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24', '10:00', '14:00')])
    ).toEqual([plage('2026-09-24', '08:00', '14:00')]);
  });

  test('deux plages qui se touchent n’en font qu’une', () => {
    // De midi à dix-sept heures puis de dix-sept à vingt et une, c'est de midi
    // à vingt et une. Garder deux lignes n'apprendrait rien à personne.
    expect(
      fusionner([plage('2026-09-24', '12:00', '17:00'), plage('2026-09-24', '17:00', '21:00')])
    ).toEqual([plage('2026-09-24', '12:00', '21:00')]);
  });

  test('deux plages disjointes restent deux lignes', () => {
    const plages = [plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24', '17:00', '21:00')];
    expect(fusionner(plages)).toEqual(plages);
  });

  test('deux jours différents ne se mêlent jamais', () => {
    const plages = [plage('2026-09-24', '08:00', '12:00'), plage('2026-09-25', '10:00', '14:00')];
    expect(fusionner(plages)).toEqual(plages);
  });

  test('une journée entière absorbe les plages du même jour', () => {
    expect(
      fusionner([plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24')])
    ).toEqual([plage('2026-09-24')]);
  });

  test('les plages sortent en ordre', () => {
    expect(
      fusionner([plage('2026-09-24', '17:00', '21:00'), plage('2026-09-24', '08:00', '12:00')])
    ).toEqual([plage('2026-09-24', '08:00', '12:00'), plage('2026-09-24', '17:00', '21:00')]);
  });
});

// ===========================================================================
// Groupe 3 — les heures
// ===========================================================================

describe('groupe 3 — les heures', () => {
  test('une fin avant le début est refusée', () => {
    expect(plageValide('17:00', '09:00')).toBe(false);
  });

  test('une plage de durée nulle est refusée : elle n’offre rien', () => {
    expect(plageValide('09:00', '09:00')).toBe(false);
  });

  test('une plage ordinaire est acceptée', () => {
    expect(plageValide('09:00', '17:00')).toBe(true);
  });

  test('les heures s’aimantent à la demi-heure, et la demie exacte monte', () => {
    expect(aimanterHeure('09:10')).toBe('09:00');
    expect(aimanterHeure('09:15')).toBe('09:30');
    expect(aimanterHeure('09:45')).toBe('10:00');
    expect(aimanterHeure('09:30')).toBe('09:30');
  });

  test('les plages nommées suivent les bornes des réglages', () => {
    expect(plageNommee('matin', BORNES_DEFAUT)).toEqual({ debut: '08:00', fin: '12:00' });
    expect(plageNommee('apresMidi', BORNES_DEFAUT)).toEqual({ debut: '12:00', fin: '17:00' });
    expect(plageNommee('soir', BORNES_DEFAUT)).toEqual({ debut: '17:00', fin: '21:00' });
  });

  test('des bornes personnalisées déplacent le matin et le soir, pas midi', () => {
    const bornes = { debut: '07:00', fin: '23:00' };
    expect(plageNommee('matin', bornes)).toEqual({ debut: '07:00', fin: '12:00' });
    expect(plageNommee('apresMidi', bornes)).toEqual({ debut: '12:00', fin: '17:00' });
    expect(plageNommee('soir', bornes)).toEqual({ debut: '17:00', fin: '23:00' });
  });

  test('la fin proposée suit la borne de fin de journée', () => {
    expect(finProposee('09:00', BORNES_DEFAUT)).toBe('21:00');
  });

  test('un début après la borne propose une heure de plus', () => {
    // Personne n'offre de neuf heures du soir à neuf heures du soir : quand le
    // début dépasse la borne, la fin prend une heure d'avance sur lui.
    expect(finProposee('21:00', BORNES_DEFAUT)).toBe('22:00');
    expect(finProposee('22:30', BORNES_DEFAUT)).toBe('23:30');
  });

  test('la fin proposée ne traverse jamais minuit', () => {
    expect(finProposee('23:30', BORNES_DEFAUT)).toBe('23:30');
  });

  test('les bornes par défaut sont 8 h et 21 h', () => {
    expect(BORNES_DEFAUT).toEqual({ debut: '08:00', fin: '21:00' });
  });
});

describe('groupe 3b — les heures, en très court', () => {
  test('les minutes rondes tombent', () => {
    expect(resumerPlages([{ debut: '08:00', fin: '12:00' }])).toBe('8\u201312');
  });

  test('les demies restent', () => {
    expect(resumerPlages([{ debut: '08:30', fin: '12:00' }])).toBe('8:30\u201312');
  });

  test('deux plages se séparent par une virgule', () => {
    expect(
      resumerPlages([
        { debut: '08:00', fin: '12:00' },
        { debut: '17:00', fin: '21:00' },
      ])
    ).toBe('8\u201312, 17\u201321');
  });
});

// ===========================================================================
// Groupe 3c — les gestes
// ===========================================================================

describe('groupe 3c — les gestes', () => {
  test('la tape offre une journée non déclarée', () => {
    expect(apresLaTape('neutre')).toBe('offrir');
  });

  test('une deuxième tape la retire', () => {
    expect(apresLaTape('complet')).toBe('retirer');
  });

  test('la tape sur une journée offerte en partie la retire aussi', () => {
    // Elle est offerte : la tape enlève ce qui est offert. Les heures se
    // reprennent par l'appui long, qui est le geste fait pour ça.
    expect(apresLaTape('partiel')).toBe('retirer');
  });

  test('le glisser applique l’inverse de sa première journée', () => {
    expect(apresLeGlisser('neutre')).toBe('offrir');
    expect(apresLeGlisser('complet')).toBe('retirer');
    expect(apresLeGlisser('partiel')).toBe('retirer');
  });

  test('le glisser traverse les journées dans l’ordre', () => {
    expect(joursTraverses('2026-09-22', '2026-09-25')).toEqual([
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ]);
  });

  test('le glisser fonctionne à reculons', () => {
    expect(joursTraverses('2026-09-25', '2026-09-23')).toEqual([
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ]);
  });

  test('le glisser traverse les semaines', () => {
    // Du vendredi au lundi suivant : la fin de semaine est traversée comme le
    // reste, la grille n'y change rien.
    expect(joursTraverses('2026-09-25', '2026-09-28')).toHaveLength(4);
  });

  test('un glisser qui n’a pas bougé ne touche qu’une journée', () => {
    expect(joursTraverses('2026-09-24', '2026-09-24')).toEqual(['2026-09-24']);
  });
});

// ===========================================================================
// Groupe 3d — un quart ne bloque pas la journée
// ===========================================================================

describe('groupe 3d — les quarts', () => {
  const QUART = { date: '2026-09-24', heure_debut: '09:00', heure_fin: '13:00' };

  test('un quart ne rend pas la journée disponible', () => {
    const periode = disponibilites([], DEPART, 2, [QUART]);
    expect(periode.jours.find((j) => j.date === '2026-09-24')?.etat).toBe('neutre');
  });

  test('un quart ne retire pas une journée déclarée', () => {
    // Un quart de neuf heures à une heure laisse l'après-midi et la soirée
    // entièrement libres. La journée reste offerte ; le quart se voit.
    const periode = disponibilites([plage('2026-09-24')], DEPART, 2, [QUART]);
    const jeudi = periode.jours.find((j) => j.date === '2026-09-24');
    expect(jeudi?.etat).toBe('complet');
    expect(jeudi?.quarts).toEqual([{ debut: '09:00', fin: '13:00' }]);
  });

  test('un quart annulé ne se montre pas', () => {
    const periode = disponibilites([], DEPART, 2, [{ ...QUART, annule: 1 }]);
    expect(periode.jours.find((j) => j.date === '2026-09-24')?.quarts).toEqual([]);
  });

  test('une plage qui mord sur un quart est signalée', () => {
    expect(chevauchement({ debut: '08:00', fin: '12:00' }, [QUART])).toEqual({
      debut: '09:00',
      fin: '13:00',
    });
  });

  test('une plage qui suit le quart ne chevauche rien', () => {
    expect(chevauchement({ debut: '13:00', fin: '17:00' }, [QUART])).toBeNull();
  });

  test('un quart de nuit occupe jusqu’à minuit, jamais le lendemain', () => {
    const nuit = { date: '2026-09-24', heure_debut: '22:00', heure_fin: '07:00' };
    expect(chevauchement({ debut: '21:00', fin: '23:00' }, [nuit])).not.toBeNull();
    expect(chevauchement({ debut: '08:00', fin: '12:00' }, [nuit])).toBeNull();
  });

  test('ajuster retire le quart du début de la plage', () => {
    expect(ajusterAutourDuQuart({ debut: '09:00', fin: '17:00' }, { debut: '09:00', fin: '13:00' }))
      .toEqual({ debut: '13:00', fin: '17:00' });
  });

  test('ajuster retire le quart de la fin de la plage', () => {
    expect(ajusterAutourDuQuart({ debut: '09:00', fin: '17:00' }, { debut: '13:00', fin: '17:00' }))
      .toEqual({ debut: '09:00', fin: '13:00' });
  });

  test('un quart au milieu laisse le plus grand morceau', () => {
    expect(ajusterAutourDuQuart({ debut: '08:00', fin: '20:00' }, { debut: '12:00', fin: '14:00' }))
      .toEqual({ debut: '14:00', fin: '20:00' });
  });

  test('à morceaux égaux, celui du matin l’emporte', () => {
    expect(ajusterAutourDuQuart({ debut: '09:00', fin: '17:00' }, { debut: '12:00', fin: '14:00' }))
      .toEqual({ debut: '09:00', fin: '12:00' });
  });

  test('un quart qui couvre tout ne laisse rien à ajuster', () => {
    expect(ajusterAutourDuQuart({ debut: '09:00', fin: '17:00' }, { debut: '08:00', fin: '18:00' }))
      .toBeNull();
  });
});

// ===========================================================================
// Groupe 4 — ce que l'image ne porte pas
// ===========================================================================

describe('groupe 4 — l’image', () => {
  test('elle ne parle ni de pharmacie, ni d’argent', () => {
    // L'image circule dans des groupes de remplaçants. Un nom de pharmacie ou
    // un taux qui s'y glisse ne se rattrape plus.
    const source = readFileSync(join('app', 'disponibilites.tsx'), 'utf8');
    const fautes: string[] = [];
    for (const ligne of source.split('\n')) {
      const nu = ligne.trim();
      if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) continue;
      for (const interdit of ['pharmacie', 'montant', 'argent', 'taux', 'facture']) {
        if (nu.toLowerCase().includes(interdit)) fautes.push(`${interdit} → ${nu.slice(0, 60)}`);
      }
    }
    expect(fautes).toEqual([]);
  });
});

// ===========================================================================
// Groupe 5 — la plage personnalisée
// ===========================================================================

/**
 * Deux, quatre et huit semaines ne couvrent pas la demande la plus banale :
 * « t'es libre en décembre ? » posée en septembre. La plage personnalisée
 * existe pour ça, et ses bornes existent pour qu'elle reste une plage.
 */
describe('groupe 5 — les bornes de la plage', () => {
  test('un début passé remonte à aujourd’hui', () => {
    // On n'offre pas hier.
    expect(bornerPlage('2026-08-01', '2026-10-31', DEPART)).toEqual({
      debut: DEPART,
      fin: '2026-10-31',
    });
  });

  test('une fin au-delà de douze mois s’arrête à la limite', () => {
    expect(bornerPlage(DEPART, '2028-01-01', DEPART)).toEqual({
      debut: DEPART,
      fin: '2027-09-21',
    });
  });

  test('une plage entièrement dans les bornes passe telle quelle', () => {
    expect(bornerPlage('2026-12-01', '2026-12-31', DEPART)).toEqual({
      debut: '2026-12-01',
      fin: '2026-12-31',
    });
  });

  test('une fin avant le début devient une seule journée', () => {
    expect(bornerPlage('2026-12-01', '2026-11-01', DEPART)).toEqual({
      debut: '2026-12-01',
      fin: '2026-12-01',
    });
  });

  test('une plage entièrement passée se replie sur aujourd’hui', () => {
    expect(bornerPlage('2026-01-01', '2026-02-01', DEPART)).toEqual({
      debut: DEPART,
      fin: DEPART,
    });
  });

  test('le dernier jour offert est celui-là même, dans douze mois', () => {
    expect(bornerPlage('2027-09-21', '2027-09-21', DEPART)).toEqual({
      debut: '2027-09-21',
      fin: '2027-09-21',
    });
  });
});

describe('groupe 5 — la période entre deux dates', () => {
  test('les deux bornes sont comprises', () => {
    const vue = disponibilitesEntre([], '2026-12-01', '2026-12-31');
    expect(vue.jours).toHaveLength(31);
    expect(vue.debut).toBe('2026-12-01');
    expect(vue.fin).toBe('2026-12-31');
  });

  test('une plage d’un seul jour tient une seule case', () => {
    const vue = disponibilitesEntre([], '2026-12-01', '2026-12-01');
    expect(vue.jours).toHaveLength(1);
    expect(vue.fin).toBe('2026-12-01');
  });

  test('trois mois traversés donnent trois blocs', () => {
    const vue = disponibilitesEntre([], '2026-11-15', '2027-01-15');
    expect(moisCouverts(vue).map((b) => b.mois)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
    ]);
  });

  test('la grille qu’on modifie couvre l’année entière', () => {
    // C'est ce que l'écran demande à la grille modifiable : aucun mur devant
    // soi, quelle que soit la fenêtre qu'on partage.
    const vue = disponibilitesEntre([], DEPART, '2027-09-21');
    expect(vue.jours).toHaveLength(366);
    expect(moisCouverts(vue)).toHaveLength(13);
  });

  test('une journée déclarée hors de la plage n’y entre pas', () => {
    const vue = disponibilitesEntre(
      [plage('2026-11-30'), plage('2026-12-02')],
      '2026-12-01',
      '2026-12-31'
    );
    expect(joursOfferts(vue)).toBe(1);
    expect(vue.jours.find((j) => j.date === '2026-12-02')?.etat).toBe('complet');
  });
});

describe('groupe 5 — le titre de l’image', () => {
  test('un même mois ne se répète pas', () => {
    expect(formatPlageDates('2026-12-01', '2026-12-31', 'fr')).toBe('1er au 31 décembre 2026');
  });

  test('le français écrit le premier du mois « 1er »', () => {
    expect(formatPlageDates('2026-12-20', '2027-01-01', 'fr')).toBe(
      '20 décembre 2026 au 1er janvier 2027'
    );
  });

  test('deux mois de la même année ne portent l’année qu’une fois', () => {
    expect(formatPlageDates('2026-11-28', '2026-12-31', 'fr')).toBe(
      '28 novembre au 31 décembre 2026'
    );
  });

  test('deux années portent chacune la sienne', () => {
    expect(formatPlageDates('2026-12-28', '2027-01-04', 'fr')).toBe(
      '28 décembre 2026 au 4 janvier 2027'
    );
  });

  test('une seule journée se nomme seule', () => {
    expect(formatPlageDates('2026-12-01', '2026-12-01', 'fr')).toBe('1er décembre 2026');
  });

  test('l’anglais garde sa virgule et son tiret', () => {
    expect(formatPlageDates('2026-12-01', '2026-12-31', 'en')).toBe('December 1 – 31, 2026');
    expect(formatPlageDates('2026-11-28', '2026-12-31', 'en')).toBe(
      'November 28 – December 31, 2026'
    );
    expect(formatPlageDates('2026-12-28', '2027-01-04', 'en')).toBe(
      'December 28, 2026 – January 4, 2027'
    );
    expect(formatPlageDates('2026-12-01', '2026-12-01', 'en')).toBe('December 1, 2026');
  });
});
