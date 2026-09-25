/**
 * Découper une phrase en plusieurs commandes.
 *
 * On dicte comme on parle : « ajoute un quart jeudi au Jean Coutu et annule
 * celui de vendredi ». Le lecteur refusait la phrase entière, et l'usager
 * devait la redire en deux fois — donc rouvrir le micro, donc y penser.
 *
 * Tout l'enjeu est de couper le moins possible. « et » ne sépare pas deux
 * commandes dans « jeudi et vendredi de 9 à 5 » : il sépare deux jours du même
 * quart, et couper là inventerait une deuxième commande sans heure ni
 * pharmacie. On ne coupe donc que lorsque ce qui suit le connecteur **commence
 * par un verbe de commande**. Tout le reste continue de se lire d'un bloc.
 */

/**
 * Trois commandes au plus.
 *
 * Quatre dictées d'un souffle, c'est une phrase qu'on a mal finie, ou un
 * découpage qui s'est trompé. Mieux vaut la rendre entière — elle partira au
 * journal, où l'usager la relira — que d'en exécuter trois sur quatre.
 */
export const COMMANDES_MAX = 3;

/**
 * Les verbes qui ouvrent une commande.
 *
 * C'est la liste des premiers mots qu'on prononce quand on demande quelque
 * chose : ajouter, annuler, noter une disponibilité. Un nom n'y est pas —
 * « déplacement » porte de l'argent, « dispo » suit souvent « je suis » — et un
 * jour de la semaine encore moins.
 */
const VERBES = [
  // Ajouter
  'ajoute', 'ajouter', 'rajoute', 'rajouter', 'mets', 'met', 'mettre', 'note', 'noter',
  'inscris', 'marque', 'planifie', 'reserve', 'reserver', 'bloque', 'bloquer',
  'enregistre', 'sauvegarde', 'cedule', 'ceduler', 'add', 'schedule', 'book', 'booke',
  // Annuler
  'annule', 'annuler', 'cancelle', 'cancel', 'supprime', 'supprimer', 'efface', 'effacer',
  'enleve', 'enlever', 'retire', 'retirer', 'delete',
  // Déclarer une disponibilité
  'je', 'libre', 'dispo', 'disponible', 'offre', 'offrir',
  // Créer une pharmacie
  'cree', 'creer', 'nouvelle', 'nouveau', 'new',
];

/**
 * Les connecteurs, du plus explicite au moins explicite.
 *
 * La virgule en fait partie : la dictée en met partout, et « ajoute un quart
 * lundi, annule celui de vendredi » est exactement la phrase qu'on prononce.
 * Elle ne coupe pas plus facilement qu'un « et » pour autant — la règle du
 * verbe s'applique pareil.
 */
const CONNECTEURS = ['puis', 'ensuite', 'et aussi', 'et', 'and then', 'then', 'and', ','];

const OUVRE = new RegExp(`^(?:${VERBES.join('|')})\\b`);

/**
 * Coupe la phrase préparée en segments. Un seul segment veut dire « rien à
 * découper » : l'appelant lit alors la phrase comme il l'a toujours fait.
 */
export function decouper(prepare: string): string[] {
  const segments = [prepare];

  // On avance segment par segment : une phrase à trois commandes se coupe en
  // deux temps, et chaque coupe ne regarde que ce qui la suit immédiatement.
  for (let i = 0; i < segments.length; i++) {
    const coupe = premiereCoupe(segments[i]);
    if (!coupe) continue;
    segments.splice(i, 1, coupe.avant, coupe.apres);
  }

  // Au-delà de la limite, on ne rend rien de coupé : la phrase entière part
  // telle quelle, et c'est l'appelant qui décidera qu'elle est illisible.
  if (segments.length > COMMANDES_MAX) return [prepare];
  return segments.filter((s) => s.length > 0);
}

/** La première coupe valide d'un segment, s'il y en a une. */
function premiereCoupe(segment: string): { avant: string; apres: string } | null {
  let meilleure: { avant: string; apres: string; position: number } | null = null;

  for (const connecteur of CONNECTEURS) {
    // La virgule est déjà un jeton isolé après la normalisation ; les mots ont
    // besoin de leurs espaces pour ne pas être trouvés au milieu d'un autre.
    const motif = new RegExp(`(?:^|\\s)${connecteur === ',' ? ',' : connecteur}(?=\\s)`, 'g');
    let trouve: RegExpExecArray | null;
    while ((trouve = motif.exec(segment))) {
      const fin = trouve.index + trouve[0].length;
      const apres = segment.slice(fin).trim();
      if (!OUVRE.test(apres)) continue;
      const avant = segment.slice(0, trouve.index).trim();
      // Un connecteur en tête de segment ne coupe rien : il n'y a rien avant.
      if (!avant) continue;
      if (!meilleure || trouve.index < meilleure.position) {
        meilleure = { avant, apres, position: trouve.index };
      }
    }
  }

  return meilleure ? { avant: meilleure.avant, apres: meilleure.apres } : null;
}
