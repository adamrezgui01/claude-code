import { etatQuart } from './echeance';

/**
 * Ce que l'horaire montre, et comment il le range.
 *
 * Trois vues — le mois, la timeline, la liste — et une seule réponse à la
 * question « quels quarts ». Un filtre écrit vue par vue s'oublie à la
 * quatrième, et c'est justement ce qui est arrivé : les quarts annulés étaient
 * retirés de « À venir » et nulle part ailleurs.
 */

type QuartHoraire = {
  date: string;
  heure_debut: string;
  heure_fin: string;
  annule: number;
};

/**
 * Les quarts que l'horaire affiche : tout, sauf les annulés.
 *
 * Un quart annulé n'a pas eu lieu. Barré au milieu d'une semaine, il occupe la
 * place d'un vrai quart et se relit comme un engagement à chaque coup d'œil.
 * Il ne disparaît pas de l'application pour autant : sa ligne reste sur la
 * fiche de la pharmacie, avec qui a annulé, et sa fiche s'ouvre de là.
 */
export function quartsVisibles<T extends { annule?: number }>(quarts: T[]): T[] {
  return quarts.filter((q) => !q.annule);
}

/** Les quarts d'une date, pour la grille du mois et la timeline. */
export function parJour<T extends { date: string }>(quarts: T[]): Map<string, T[]> {
  const carte = new Map<string, T[]>();
  for (const q of quarts) {
    const liste = carte.get(q.date) ?? [];
    liste.push(q);
    carte.set(q.date, liste);
  }
  return carte;
}

/**
 * Les trois paquets de la liste.
 *
 * Un quart bascule dans « Antérieurs » quand il est fini, pas quand sa date
 * est passée : à 18 h, un quart du jour même terminé à 17 h est derrière soi.
 * Les annulés ne tombent dans aucun des trois — « fini » dirait oui de l'un
 * d'eux, et la liste des quarts faits se remplirait de quarts qui n'ont pas eu
 * lieu.
 */
export function repartir<T extends QuartHoraire>(
  quarts: T[],
  maintenant = Date.now()
): { enCours: T[]; aVenir: T[]; anterieurs: T[] } {
  const enCours: T[] = [];
  const aVenir: T[] = [];
  const anterieurs: T[] = [];
  for (const q of quartsVisibles(quarts)) {
    const etat = etatQuart(q, maintenant);
    if (etat === 'enCours') enCours.push(q);
    else if (etat === 'anterieur') anterieurs.push(q);
    else aVenir.push(q);
  }
  // Du plus récent au plus ancien : on cherche ce qu'on vient de faire.
  anterieurs.sort((a, b) =>
    a.date === b.date ? b.heure_debut.localeCompare(a.heure_debut) : b.date.localeCompare(a.date)
  );
  return { enCours, aVenir, anterieurs };
}
