/**
 * Le rendez-vous du soir : une notification par jour, et rien d'autre.
 *
 * Six sortes de rappels automatiques vivaient chacun de leur côté — le quart,
 * le mémo de fin de quart, le document qui expire, la facture impayée, les
 * notes à réviser, les sources à revérifier. Rien n'empêchait qu'un mardi de
 * novembre en apporte quatre. Quatre vibrations dans la même soirée, et
 * l'usager coupe les notifications de l'application : toutes, y compris celle
 * qui lui aurait évité de manquer un quart.
 *
 * Une par jour, le soir, à la même heure. C'est un rendez-vous : on sait quand
 * il arrive, et il vaut la peine d'être ouvert parce qu'il dit tout.
 *
 * La seule exception est le rappel avant un quart que l'usager a réglé
 * lui-même, à l'avance qu'il a choisie, parce qu'il lui faut deux heures de
 * route. Celui-là, il l'a demandé ; le noyer dans le rendez-vous du soir le
 * rendrait inutile.
 */

/** Heure du rendez-vous, sauf réglage contraire. */
export const HEURE_DEFAUT = '20:00';

/**
 * Deux noms au plus dans le corps. Trois noms sur un écran verrouillé sont
 * tronqués, et un nom tronqué ne sert à rien.
 */
export const NOMS_MAX = 2;

export type Genre =
  /** Des notes à réviser ce soir. */
  | 'veille'
  /** Des sources dont la date de vérification est dépassée. */
  | 'sources'
  /** Un document professionnel qui approche de son expiration. */
  | 'document'
  /** Un quart demain. */
  | 'quart'
  /** Une facture toujours impayée. */
  | 'facture'
  /** Un quart fini : ses heures ont-elles changé ? */
  | 'memo';

export type Element = {
  genre: Genre;
  /** Ce qui se nomme : une pharmacie, un document, un sujet. Vide pour les sources. */
  nom: string;
};

/**
 * L'ordre d'urgence, du plus grave au moins grave.
 *
 * La veille d'abord : c'est la moitié de l'application qu'on oublie le plus
 * facilement, et une compétence qui se perd ne se rattrape pas d'un geste.
 *
 * Ensuite, dans l'organisation : sans document valide on ne travaille pas du
 * tout, donc il passe devant un quart ; manquer un quart coûte une journée ;
 * une facture impayée se rattrape ; un mémo ne coûte rien du tout, puisque les
 * heures prévues sont déjà comptées.
 */
export const ORDRE: Genre[] = ['veille', 'sources', 'document', 'quart', 'facture', 'memo'];

const CLINIQUE: Genre[] = ['veille', 'sources'];

function parUrgence(elements: Element[]): Element[] {
  return [...elements].sort((a, b) => ORDRE.indexOf(a.genre) - ORDRE.indexOf(b.genre));
}

type Traduire = (cle: string, valeurs?: Record<string, unknown>) => string;

/**
 * Le titre, choisi par élimination.
 *
 * « Veille clinique » dès qu'il y a quelque chose à réviser ; sinon le poste
 * d'organisation le plus urgent. Un titre qui essaierait de tout dire — « Trois
 * choses à voir » — ne dirait rien, et c'est le titre seul qu'on lit quand le
 * téléphone est posé sur la table.
 */
export function titreDuRendezVous(elements: Element[], traduire: Traduire): string | null {
  if (elements.length === 0) return null;
  if (elements.some((e) => CLINIQUE.includes(e.genre))) {
    return traduire('notifications.veilleTitre');
  }
  const premier = parUrgence(elements)[0];
  return traduire(`notifications.titre${majuscule(premier.genre)}`);
}

function majuscule(mot: string): string {
  return `${mot[0].toUpperCase()}${mot.slice(1)}`;
}

/**
 * Le corps : au plus deux lignes nommées, et aucun chiffre.
 *
 * « 4 révisions, 2 factures » ne mène à aucune action et se balaie sans y
 * penser. « À réviser : Infections urinaires » se lit d'un coup d'œil. Les
 * comptes ont leur place dans l'application — la bande d'attente de l'horaire
 * les porte — pas sur un écran verrouillé.
 */
export function corpsDuRendezVous(elements: Element[], traduire: Traduire): string {
  const ordonnes = parUrgence(elements);
  const lignes = ordonnes
    .slice(0, NOMS_MAX)
    .map((e) => traduire(`notifications.ligne${majuscule(e.genre)}`, { nom: e.nom }));
  // Le reste se dit sans se compter : « et d'autres » suffit à faire ouvrir
  // l'application, et c'est là que les comptes sont lisibles.
  if (ordonnes.length > NOMS_MAX) lignes.push(traduire('notifications.etDautres'));
  return lignes.join('\n');
}

export type Rendezvous = { titre: string; corps: string } | null;

export function rendezVous(elements: Element[], traduire: Traduire): Rendezvous {
  const titre = titreDuRendezVous(elements, traduire);
  if (!titre) return null;
  return { titre, corps: corpsDuRendezVous(elements, traduire) };
}
