import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';

import App from '../src/App';

/**
 * Le site rendu à une adresse, sans navigateur. Les espaces insécables que
 * `Intl` pose devant « $ » et entre les milliers deviennent des espaces
 * ordinaires, pour qu'un test s'écrive comme on lit l'écran.
 */
export function rendre(adresse: string): string {
  const [chemin, recherche = ''] = adresse.split('?');
  return renderToStaticMarkup(
    <Router ssrPath={chemin} ssrSearch={recherche}>
      <App />
    </Router>
  ).replace(/[\u00a0\u202f]/g, ' ');
}

/**
 * Aucune commande n'est du texte seul. Chaque bouton et chaque lien porte une
 * icône. Deux exceptions, qui ne déclenchent rien : une case de calendrier
 * (un jour qu'on choisit) et une option d'un groupe de choix (une valeur qu'on
 * choisit, role="radio"). Là où le prompt veut une icône sur un choix — la vue
 * de l'horaire, les mesures —, le test de l'écran la vérifie à part.
 */
export function commandesSansIcone(html: string): string[] {
  const fautes: string[] = [];
  for (const m of html.matchAll(/<(button|a|summary)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    if (/role="(gridcell|radio)"/.test(m[2])) continue;
    if (!m[3].includes('<svg')) fautes.push(m[3].replace(/<[^>]+>/g, '').trim() || m[2]);
  }
  return fautes;
}

/** Une action principale par écran, au plus : c'est elle qui porte le mauve plein. */
export function actionsPrincipales(html: string): number {
  return (html.match(/data-action-principale=""/g) ?? []).length;
}
