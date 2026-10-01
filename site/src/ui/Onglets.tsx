import { Link, useLocation } from 'wouter';

import { ONGLETS, ongletDe } from '../navigation';
import { Icone } from './Icone';

/**
 * Une icône et un mot par onglet : cinq pictogrammes seuls ne se distinguent
 * pas d'un coup d'œil. L'onglet actif est l'élément actif de la page, et c'est
 * lui qui porte le mauve.
 */
export function Onglets() {
  const [chemin] = useLocation();
  const actif = ongletDe(chemin);
  return (
    <nav className="onglets" aria-label="Onglets">
      {ONGLETS.map((o) => (
        <Link
          key={o.chemin}
          href={o.chemin}
          className="onglet"
          aria-current={o.chemin === actif ? 'page' : undefined}>
          <Icone nom={o.icone} taille="grande" />
          <span className="onglet-nom">{o.nom}</span>
        </Link>
      ))}
    </nav>
  );
}
