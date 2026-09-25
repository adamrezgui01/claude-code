import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  bandeAttente,
  bandeEcartee,
  GENRES_ATTENTE,
  LIGNES_MAX,
  type ComptesAttente,
} from '../src/lib/attente';

/**
 * La bande d'attente : ce qui traîne, écrit une fois, à un seul endroit.
 *
 * C'est le pendant du rendez-vous du soir. La notification ne compte rien —
 * « 4 révisions, 2 factures » sur un écran verrouillé se balaie sans y penser —
 * mais une fois l'application ouverte, un chiffre est exactement ce qu'on
 * cherche : il dit s'il y a dix minutes de travail ou une heure.
 *
 * Elle ne vit que dans l'horaire. Répétée sur quatre onglets, elle devient du
 * décor, et on cesse de la lire là où elle comptait.
 */

function comptes(partiel: Partial<ComptesAttente> = {}): ComptesAttente {
  return {
    heures: 0,
    aFacturer: 0,
    factures: 0,
    documents: 0,
    ...partiel,
  };
}

describe('la bande d’attente', () => {
  test('rien en attente, aucune bande', () => {
    expect(bandeAttente(comptes())).toEqual({ lignes: [], reste: 0 });
  });

  test('une ligne par sorte, avec son compte', () => {
    // Le compte est permis ici, et seulement ici : l'application est ouverte,
    // et c'est lui qui dit s'il y a dix minutes de travail ou une heure.
    const { lignes } = bandeAttente(comptes({ aFacturer: 3, documents: 1 }));
    expect(lignes).toEqual([
      { genre: 'aFacturer', compte: 3 },
      { genre: 'documents', compte: 1 },
    ]);
  });

  test('ce qui est à zéro ne prend pas de ligne', () => {
    // « 0 facture impayée » est une ligne qu'on apprend à ne plus lire, et elle
    // emporte avec elle celles qui ne sont pas à zéro.
    const { lignes } = bandeAttente(comptes({ factures: 0, heures: 1 }));
    expect(lignes).toEqual([{ genre: 'heures', compte: 1 }]);
  });

  test('trois lignes au maximum, et le reste se compte', () => {
    expect(LIGNES_MAX).toBe(3);
    const { lignes, reste } = bandeAttente(
      comptes({ heures: 1, aFacturer: 2, factures: 3, documents: 4 })
    );
    expect(lignes).toHaveLength(3);
    // Une sorte de plus attend derrière « Voir tout ».
    expect(reste).toBe(1);
  });

  test('l’ordre est celui de l’urgence, pas celui de la base', () => {
    // Les heures d'abord : elles changent un montant qui n'est pas encore
    // facturé, et la fenêtre pour les corriger se referme à la facturation.
    // Ensuite ce qui n'est pas facturé, puis ce qui n'est pas payé, puis les
    // papiers. Les révisions n'y sont pas : l'horaire appartient au volet
    // organisation, qui n'importe rien du volet clinique.
    expect(GENRES_ATTENTE).toEqual(['heures', 'aFacturer', 'factures', 'documents']);
    const { lignes } = bandeAttente(comptes({ documents: 9, heures: 1 }));
    expect(lignes.map((l) => l.genre)).toEqual(['heures', 'documents']);
  });

  test('exactement trois sortes ne laissent aucun reste', () => {
    const { lignes, reste } = bandeAttente(comptes({ heures: 1, factures: 1, documents: 1 }));
    expect(lignes).toHaveLength(3);
    expect(reste).toBe(0);
  });

  test('écartée le jour même, elle ne revient pas', () => {
    // Un balayage vers la droite l'écarte. Pour la journée, pas pour toujours :
    // ce qui traîne traîne encore demain, et une bande qu'on peut faire taire
    // définitivement finit par cacher une facture de mille dollars.
    expect(bandeEcartee('2026-09-24', '2026-09-24')).toBe(true);
  });

  test('elle revient le lendemain', () => {
    expect(bandeEcartee('2026-09-24', '2026-09-25')).toBe(false);
  });

  test('jamais écartée, elle se montre', () => {
    expect(bandeEcartee('', '2026-09-24')).toBe(false);
  });

  test('une date d’écart dans le futur ne la fait pas taire', () => {
    // Un fuseau horaire ou une horloge reculée ne doit pas la museler.
    expect(bandeEcartee('2026-09-30', '2026-09-24')).toBe(false);
  });

  test('elle ne vit que dans l’horaire', () => {
    // Répétée sur quatre onglets, elle devient du décor.
    const fichiers: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier)) {
        const chemin = join(dossier, entree);
        if (statSync(chemin).isDirectory()) parcourir(chemin);
        else if (chemin.endsWith('.tsx')) fichiers.push(chemin);
      }
    };
    parcourir('app');
    const porteurs = fichiers.filter((f) => readFileSync(f, 'utf8').includes('BandeAttente'));
    expect(porteurs).toEqual([join('app', '(tabs)', 'index.tsx')]);
  });
});
