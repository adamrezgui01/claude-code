/**
 * La péremption des sources et des contenus.
 *
 * C'est la règle qui justifie tout le volet clinique. Une note tirée d'une
 * ligne directrice de 2024 n'est pas fausse : elle est périmée, ce qui est
 * pire, parce qu'elle a l'air juste. Un pharmacien qui révise pendant deux ans
 * un point clé retiré des recommandations se trompe avec méthode.
 *
 * Rien ici n'est stocké. « Cette note a plus de douze mois » est une
 * soustraction de dates : elle est vraie ou fausse à l'instant où on regarde,
 * et l'écrire en base demanderait une tâche de fond qui ne tourne que si
 * l'application est ouverte. Seul un vrai changement — une version de source
 * qui bouge — laisse une trace écrite. C'est le patron de `etatQuart`.
 *
 * Les quatre fonctions annoncées dans la proposition portent ici leur nom
 * français, comme tout le reste du code :
 *
 * | Proposition | Ici |
 * |---|---|
 * | `checkSource()` | `etatSource()` |
 * | `sourceChanged()` | `sourceAChange()` |
 * | `markSourceAsUpdated()` | `marquerSourceMiseAJour()`, dans `db/veille` |
 * | `invalidateDependentContent()` | `contenusAPerimer()`, ici, et son écriture dans `db/veille` |
 */

import { decalerMois } from '../dates';

/** Une source se revérifie deux fois par année. */
export const MOIS_VERIFICATION_SOURCE = 6;

/**
 * Le filet de sécurité. La détection d'une nouvelle version sera toujours
 * imparfaite — une ligne directrice change souvent d'adresse en changeant de
 * version. Au bout d'un an, on regarde de toute façon.
 */
export const MOIS_VALIDATION_CONTENU = 12;

/** La date est-elle assez vieille ? La limite est incluse. */
function echue(depuis: string, mois: number, aujourdhui: string): boolean {
  if (!depuis) return true;
  return decalerMois(depuis, mois) <= aujourdhui;
}

export type StatutSource = 'active' | 'aRevoir' | 'remplacee';

/**
 * L'état affiché d'une source.
 *
 * Une source sans date de vérification y passe : mieux vaut une ligne de trop
 * dans la liste qu'une source jamais regardée qui se fait oublier.
 */
export function etatSource(
  source: { date_verification: string; statut: string },
  aujourdhui: string
): StatutSource {
  if (source.statut === 'remplacee') return 'remplacee';
  return echue(source.date_verification, MOIS_VERIFICATION_SOURCE, aujourdhui)
    ? 'aRevoir'
    : 'active';
}

export type StatutContenu = 'brouillon' | 'actif' | 'perimeSource' | 'desactive';
export type EtatContenu = 'brouillon' | 'actif' | 'aRevoir' | 'desactive';

export function etatContenu(
  contenu: { valide_le: string; statut: string },
  aujourdhui: string
): EtatContenu {
  if (contenu.statut === 'brouillon') return 'brouillon';
  if (contenu.statut === 'desactive') return 'desactive';
  if (contenu.statut === 'perimeSource') return 'aRevoir';
  return echue(contenu.valide_le, MOIS_VALIDATION_CONTENU, aujourdhui) ? 'aRevoir' : 'actif';
}

/** Un contenu ne se révise que dans un seul de ces quatre états. */
export function revisable(contenu: { valide_le: string; statut: string }, aujourdhui: string): boolean {
  return etatContenu(contenu, aujourdhui) === 'actif';
}

/**
 * Deux versions désignent-elles vraiment deux documents différents ?
 *
 * Une version vide qui arrive ne périme rien : effacer le champ par mégarde ne
 * doit pas faire basculer toutes les notes d'une source.
 */
export function sourceAChange(ancienne: string, nouvelle: string): boolean {
  const propre = (v: string) => v.trim().toLowerCase();
  if (!propre(nouvelle)) return false;
  return propre(ancienne) !== propre(nouvelle);
}

export type ContenuPerissable = {
  id: number;
  source_id: number | null;
  version_source: string;
  statut: string;
};

/**
 * Les contenus que fait basculer un changement de version.
 *
 * On compare à la version **nouvelle**, pas à l'ancienne : une note qui a déjà
 * traversé deux changements et qu'on vient de revalider ne doit pas rebasculer
 * une troisième fois. Ceux qui sont déjà à revérifier n'y retournent pas, et
 * une note sans source n'est jamais concernée — seul le filet des douze mois
 * la regarde.
 */
export function contenusAPerimer(
  contenus: ContenuPerissable[],
  sourceId: number,
  nouvelleVersion: string
): number[] {
  const cible = nouvelleVersion.trim().toLowerCase();
  return contenus
    .filter(
      (c) =>
        c.source_id === sourceId &&
        c.statut === 'actif' &&
        c.version_source.trim().toLowerCase() !== cible
    )
    .map((c) => c.id);
}
