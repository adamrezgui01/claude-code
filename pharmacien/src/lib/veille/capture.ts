/**
 * Le bandeau de capture, et quand il a le droit d'apparaître.
 *
 * Le module ne voit que ce qui passe par l'application : tout ce que le
 * pharmacien consulte ailleurs lui échappe. Sa valeur vient donc entièrement
 * du moment où l'usager revient d'un lien qu'il allait ouvrir de toute façon.
 *
 * Le bandeau se déclenche au retour de l'application au premier plan, et pas à
 * la fermeture d'un navigateur intégré : de cette façon il marche aussi quand
 * le lien est parti dans Safari, et le navigateur reste un réglage plutôt
 * qu'une obligation. Mais un retour au premier plan arrive aussi quand on
 * déverrouille son téléphone ou qu'on revient d'une autre application — d'où
 * la fenêtre de trente minutes et le bandeau qui ne se propose qu'une fois.
 */

/** Passé ce délai, la consultation n'est plus fraîche et le bandeau est du bruit. */
export const FENETRE_CAPTURE_MINUTES = 30;

export type Consultation = {
  sourceId: number;
  /** Instant de l'ouverture du lien, en millisecondes. */
  le: number;
  /** Vrai dès que le bandeau a été proposé, qu'il ait été utilisé ou ignoré. */
  vue: boolean;
  /** La source porte « ne plus proposer ». */
  captureDesactivee: boolean;
};

export function doitProposerBandeau(
  consultation: Consultation | null,
  maintenant: number,
  bandeauActif: boolean
): boolean {
  if (!bandeauActif) return false;
  if (!consultation) return false;
  if (consultation.vue) return false;
  if (consultation.captureDesactivee) return false;
  const minutes = (maintenant - consultation.le) / 60000;
  return minutes >= 0 && minutes <= FENETRE_CAPTURE_MINUTES;
}

/**
 * Ce que le bandeau propose.
 *
 * Écrire une note est l'offre principale, toujours là. Suivre un sujet est un
 * bonus, et seulement pour ceux qui ne le sont pas déjà.
 */
export function offresBandeau(
  sujetsDeLaSource: number[],
  dejaSuivis: Set<number>
): { note: boolean; suivre: number[] } {
  return {
    note: true,
    suivre: sujetsDeLaSource.filter((id) => !dejaSuivis.has(id)),
  };
}
