import type { NomIcone } from './ui/Icone';

/**
 * Les cinq onglets : mêmes noms, même ordre que l'application. Clinique au
 * centre, là où le pouce tombe sur un téléphone.
 *
 * Chaque onglet possède aussi les écrans qu'il ouvre : une fiche de quart reste
 * sous l'Horaire, une fiche de pharmacie sous le Répertoire.
 */
export const ONGLETS: { chemin: string; nom: string; icone: NomIcone; possede: string[] }[] = [
  { chemin: '/', nom: 'Horaire', icone: 'calendrier', possede: ['/quart'] },
  { chemin: '/repertoire', nom: 'Répertoire', icone: 'pharmacie', possede: [] },
  { chemin: '/clinique', nom: 'Clinique', icone: 'trousse', possede: [] },
  { chemin: '/statistiques', nom: 'Statistiques', icone: 'graphique', possede: [] },
  { chemin: '/menu', nom: 'Menu', icone: 'menu', possede: [] },
];

/** L'onglet auquel appartient une adresse. */
export function ongletDe(chemin: string): string {
  const trouve = ONGLETS.find(
    (o) =>
      (o.chemin === '/' ? chemin === '/' : chemin === o.chemin || chemin.startsWith(`${o.chemin}/`)) ||
      o.possede.some((p) => chemin === p || chemin.startsWith(`${p}/`))
  );
  return trouve?.chemin ?? '/';
}
