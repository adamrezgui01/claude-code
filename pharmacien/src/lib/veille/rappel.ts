/**
 * Quels sujets la notification du soir nomme.
 *
 * « À réviser : Infections urinaires, Bronchite » se lit d'un coup d'œil sur un
 * écran verrouillé, alors que « 4 révisions » ne dit rien et se balaie sans y
 * penser.
 *
 * Jamais de bilan d'activité. « Vous avez consulté 3 sujets cette semaine » ne
 * mène à aucune action, et une notification qui ne mène à rien apprend à
 * ignorer toutes les autres.
 *
 * L'heure et la mise en forme ne sont plus ici : depuis qu'il n'y a qu'une
 * notification par jour, c'est le rendez-vous du soir qui les décide.
 */

export type SujetDu = { nom: string; notes: number };

/**
 * Les sujets, par nombre de notes dues, puis par ordre alphabétique. Le
 * rendez-vous du soir en garde deux au plus : trois noms sur un écran
 * verrouillé sont tronqués, et un nom tronqué ne sert à rien.
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
