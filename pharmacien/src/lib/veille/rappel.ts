/**
 * La notification du soir.
 *
 * Une par jour au plus, et seulement s'il y a quelque chose à faire. Elle
 * nomme les sujets : « À réviser : Infections urinaires, Bronchite » se lit
 * d'un coup d'œil sur un écran verrouillé, alors que « 4 révisions » ne dit
 * rien et se balaie sans y penser.
 *
 * Jamais de bilan d'activité. « Vous avez consulté 3 sujets cette semaine »
 * ne mène à aucune action, et une notification qui ne mène à rien apprend à
 * ignorer toutes les autres.
 */

export const HEURE_DEFAUT = '20:00';

/** La plage où deux notifications se regroupent plutôt que de sonner deux fois. */
export const FENETRE_DEBUT = 17;
export const FENETRE_FIN = 22;

function heures(heure: string): number {
  return Number(heure.slice(0, 2));
}

function dansLaFenetre(heure: string): boolean {
  const h = heures(heure);
  return h >= FENETRE_DEBUT && h <= FENETRE_FIN;
}

/**
 * À quelle heure la veille doit partir.
 *
 * Si une autre notification de l'application est déjà prévue le même soir, la
 * veille part avec elle : deux vibrations à une heure d'intervalle, c'est une
 * de trop, et c'est celle qu'on coupe.
 *
 * Le regroupement ne s'applique que si l'heure choisie est elle-même dans la
 * plage du soir. Quelqu'un qui règle son rappel à 8 h le veut le matin ;
 * l'avancer à 19 h parce qu'un mémo de quart y tombe serait défaire son choix.
 */
export function heureDuRappel(heureChoisie: string, autresHeures: string[]): string {
  if (!dansLaFenetre(heureChoisie)) return heureChoisie;
  const voisines = autresHeures.filter(dansLaFenetre).sort();
  return voisines[0] ?? heureChoisie;
}

export type SujetDu = { nom: string; notes: number };

/**
 * Les sujets nommés, par nombre de notes dues, puis par ordre alphabétique.
 *
 * Deux au plus : trois noms sur un écran verrouillé sont tronqués, et un nom
 * tronqué ne sert à rien.
 */
export function sujetsNommes(sujets: SujetDu[], combien = 2): { nommes: string[]; autres: number } {
  const ordonnes = [...sujets].sort((a, b) =>
    b.notes === a.notes ? a.nom.localeCompare(b.nom) : b.notes - a.notes
  );
  return {
    nommes: ordonnes.slice(0, combien).map((s) => s.nom),
    autres: Math.max(0, ordonnes.length - combien),
  };
}

export type TexteRappel = { titre: string; corps: string } | null;

export function texteDuRappel(
  sujets: SujetDu[],
  sourcesARevoir: number,
  traduire: (cle: string, valeurs?: Record<string, unknown>) => string
): TexteRappel {
  const lignes: string[] = [];

  if (sujets.length > 0) {
    const { nommes, autres } = sujetsNommes(sujets);
    const liste =
      autres > 0
        ? `${nommes.join(', ')} ${traduire('notifications.veilleEtAutres', { count: autres })}`
        : nommes.join(', ');
    lignes.push(traduire('notifications.veilleAReviser', { sujets: liste }));
  }

  if (sourcesARevoir > 0) {
    lignes.push(traduire('notifications.veilleSources', { count: sourcesARevoir }));
  }

  if (lignes.length === 0) return null;
  return { titre: traduire('notifications.veilleTitre'), corps: lignes.join('\n') };
}
