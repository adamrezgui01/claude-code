import { decouper, COMMANDES_MAX } from '../src/lib/lecteur/decouper';
import { lireTout, type ContexteLecteur } from '../src/lib/lecteur';
import { preparer } from '../src/lib/lecteur/texte';

/**
 * Plusieurs commandes dans une phrase.
 *
 * On dicte comme on parle : « ajoute un quart jeudi au Jean Coutu et annule
 * celui de vendredi ». Le lecteur refusait la phrase entière, et l'usager
 * devait la redire en deux fois — donc rouvrir le micro, donc y penser.
 *
 * Le découpage est prudent, et c'est tout l'enjeu. « et » ne sépare pas deux
 * commandes dans « jeudi et vendredi de 9 à 5 » : il sépare deux jours du même
 * quart. On ne coupe donc que lorsque ce qui suit le connecteur **commence par
 * un verbe de commande**. Tout le reste continue de se lire comme une seule
 * phrase, et les cent soixante-dix phrases déjà couvertes ne bougent pas.
 *
 * Date de référence : jeudi 24 septembre 2026.
 */

const CONTEXTE: ContexteLecteur = {
  aujourdhui: '2026-09-24',
  pharmacies: [
    { id: 1, nom: 'Jean Coutu', ville: 'Gatineau', surnom: '' },
    { id: 2, nom: 'Proxim', ville: 'Hull', surnom: '' },
  ],
  quarts: [
    { id: 10, pharmacieId: 1, date: '2026-09-25', heureDebut: '09:00', heureFin: '17:00' },
  ],
};

function segments(phrase: string): string[] {
  return decouper(preparer(phrase));
}

describe('où l’on coupe, et où l’on ne coupe pas', () => {
  test('deux jours du même quart ne se coupent pas', () => {
    // C'est le cas dangereux : couper ici inventerait deux commandes là où il
    // n'y en a qu'une, et la deuxième n'aurait ni heure ni pharmacie.
    expect(segments('ajoute un quart jeudi et vendredi de 9 à 5')).toHaveLength(1);
  });

  test('une énumération de dates ne se coupe pas', () => {
    expect(segments('quart le 12, 13 et 14 octobre au Jean Coutu')).toHaveLength(1);
  });

  test('un « et » suivi d’un verbe coupe', () => {
    const morceaux = segments('ajoute un quart jeudi au Jean Coutu et annule celui de vendredi');
    expect(morceaux).toHaveLength(2);
    expect(morceaux[1].startsWith('annule')).toBe(true);
  });

  test('« puis » coupe aussi', () => {
    expect(segments('mets un quart lundi puis note que je suis dispo samedi')).toHaveLength(2);
  });

  test('« ensuite » coupe aussi', () => {
    expect(segments('ajoute un quart lundi ensuite ajoute un quart mardi')).toHaveLength(2);
  });

  test('un « et » devant un mot d’argent ne coupe pas', () => {
    // « et 40 de per diem » complète le quart, il n'en ouvre pas un autre.
    expect(segments('quart jeudi de 9 à 5 et 40 de per diem')).toHaveLength(1);
  });

  test('trois commandes se coupent en trois', () => {
    const morceaux = segments(
      'ajoute un quart lundi, annule celui de vendredi et note que je suis dispo samedi'
    );
    expect(morceaux).toHaveLength(3);
  });

  test('au-delà de trois, on ne coupe plus rien', () => {
    // Quatre commandes dictées d'un souffle, c'est une phrase qu'on a mal
    // finie. Mieux vaut la rendre entière que d'en exécuter trois sur quatre.
    expect(COMMANDES_MAX).toBe(3);
    const morceaux = segments(
      'ajoute un quart lundi, ajoute un quart mardi, ajoute un quart mercredi et ajoute un quart jeudi'
    );
    expect(morceaux).toHaveLength(1);
  });

  test('une phrase sans connecteur reste entière', () => {
    expect(segments('quart jeudi de 9 à 17 au Jean Coutu')).toHaveLength(1);
  });

  test('une correction n’est pas un connecteur', () => {
    // « le 12, non, le 13 » est une hésitation : elle se règle ailleurs, et
    // couper ici donnerait deux commandes dont une vide.
    expect(segments('quart le 12 non le 13 octobre au Jean Coutu')).toHaveLength(1);
  });
});

describe('ce que le lecteur rend pour plusieurs commandes', () => {
  test('une seule commande se lit comme avant', () => {
    const lu = lireTout('ajoute un quart jeudi de 9 à 17 au Jean Coutu', CONTEXTE);
    expect(lu.action).toBe('quart');
  });

  test('deux commandes donnent deux fiches', () => {
    const lu = lireTout(
      'ajoute un quart lundi de 9 à 17 au Jean Coutu et annule celui de vendredi',
      CONTEXTE
    );
    if (lu.action !== 'commandes') throw new Error(`action inattendue : ${lu.action}`);
    expect(lu.fiches).toHaveLength(2);
    expect(lu.fiches[0].action).toBe('quart');
    expect(lu.fiches[1].action).toBe('annulation');
  });

  test('chaque fiche est complète, pas un fragment', () => {
    // La deuxième commande n'hérite de rien de la première : dire « et annule
    // celui de vendredi » ne doit pas lui coller les heures du lundi.
    const lu = lireTout(
      'ajoute un quart lundi de 9 à 17 au Jean Coutu et ajoute un quart mardi au Proxim',
      CONTEXTE
    );
    if (lu.action !== 'commandes') throw new Error(`action inattendue : ${lu.action}`);
    const premier = lu.fiches[0];
    const second = lu.fiches[1];
    if (premier.action !== 'quart' || second.action !== 'quart') throw new Error('pas deux quarts');
    expect(premier.pharmacieId).toBe(1);
    expect(second.pharmacieId).toBe(2);
    expect(second.heureDebut).toBeNull();
  });

  test('au-delà de trois, la phrase entière part au journal', () => {
    const lu = lireTout(
      'ajoute un quart lundi, ajoute un quart mardi, ajoute un quart mercredi et ajoute un quart jeudi',
      CONTEXTE
    );
    // Pas de découpage : la phrase se lit d'un bloc, et elle n'a plus de sens.
    expect(['incompris', 'nonPrisEnCharge']).toContain(lu.action);
  });

  test('un segment illisible ne fait pas tomber les autres', () => {
    const lu = lireTout(
      'ajoute un quart lundi de 9 à 17 au Jean Coutu et note euh',
      CONTEXTE
    );
    // Une seule commande lisible : on rend cette commande, pas une liste d'une
    // carte. Le segment perdu est rendu à part, pour le journal.
    expect(lu.action).toBe('quart');
    expect(lu.ignores).toHaveLength(1);
  });

  test('aucune commande lisible : la phrase est incomprise', () => {
    const lu = lireTout('note euh et mets bon', CONTEXTE);
    expect(lu.action).toBe('incompris');
  });
});
