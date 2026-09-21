/**
 * Ce qui décide quand partir chercher, pendant que l'usager tape.
 *
 * Trois règles, et chacune répond à un vrai gaspillage :
 *
 * - on attend une courte pause dans la frappe, sinon « Familiprix » part en
 *   dix requêtes dont neuf sont périmées avant d'être revenues ;
 * - on ne part pas avant trois caractères, parce qu'« fa » ramène le Québec
 *   entier et n'apprend rien ;
 * - une réponse qui arrive pour une saisie périmée est jetée. Sans ça, la
 *   liste se met à clignoter entre deux états quand le réseau est lent, et
 *   l'usager touche la mauvaise ligne.
 */

export type RechercheDifferee = {
  /** L'usager a tapé. Peut ne rien déclencher du tout. */
  saisir: (texte: string) => void;
  /** L'écran se ferme : plus rien ne doit revenir. */
  arreter: () => void;
};

export const DELAI_FRAPPE = 300;
export const MINIMUM_CARACTERES = 3;

export function creerRechercheDifferee<T>({
  executer,
  surResultat,
  surVide,
  delai = DELAI_FRAPPE,
  minimum = MINIMUM_CARACTERES,
}: {
  /** L'appel réseau. Le signal permet d'abandonner celui d'avant. */
  executer: (texte: string, signal: AbortSignal) => Promise<T>;
  surResultat: (resultat: T, texte: string) => void;
  /** Appelé quand la saisie est trop courte : la liste se vide. */
  surVide?: () => void;
  delai?: number;
  minimum?: number;
}): RechercheDifferee {
  let minuterie: ReturnType<typeof setTimeout> | null = null;
  let controleur: AbortController | null = null;
  // Le numéro de la dernière saisie partie. Une réponse portant un numéro plus
  // ancien est ignorée, même si elle arrive en dernier.
  let dernier = 0;

  function annulerEnCours() {
    if (minuterie) clearTimeout(minuterie);
    minuterie = null;
    controleur?.abort();
    controleur = null;
  }

  return {
    saisir(texte: string) {
      annulerEnCours();
      if (texte.trim().length < minimum) {
        surVide?.();
        return;
      }
      minuterie = setTimeout(() => {
        minuterie = null;
        const numero = ++dernier;
        const propre = new AbortController();
        controleur = propre;
        executer(texte, propre.signal)
          .then((resultat) => {
            if (numero !== dernier) return;
            surResultat(resultat, texte);
          })
          .catch(() => {
            // Un abandon volontaire n'est pas une panne : il n'y a rien à dire.
          });
      }, delai);
    },

    arreter() {
      annulerEnCours();
      dernier += 1;
    },
  };
}
