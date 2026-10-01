/**
 * Où l'on était dans l'horaire, pour y revenir après une fiche : la vue et le
 * jour, tels qu'on les a laissés. Une adresse suffit, elle porte les deux.
 */
let adresseHoraire = '/';

export function retenirHoraire(adresse: string) {
  adresseHoraire = adresse;
}

/**
 * L'adresse de l'horaire, éventuellement posée sur un autre jour : après avoir
 * créé un quart en décembre, on revient sur décembre, dans la même vue.
 */
export function adresseDeLHoraire(jour?: string): string {
  if (!jour) return adresseHoraire;
  const [chemin, recherche = ''] = adresseHoraire.split('?');
  const params = new URLSearchParams(recherche);
  params.set('jour', jour);
  return `${chemin}?${params.toString()}`;
}
