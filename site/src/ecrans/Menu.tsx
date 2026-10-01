import { Link } from 'wouter';

import { Ecran } from '../ui/Ecran';
import { Icone, type NomIcone } from '../ui/Icone';

const ENTREES: { chemin: string; nom: string; detail: string; icone: NomIcone }[] = [
  { chemin: '/menu/profil', nom: 'Profil', detail: 'Nom, permis, coordonnées', icone: 'profil' },
  { chemin: '/menu/parametres', nom: 'Paramètres', detail: 'Valeurs par défaut, données de démonstration', icone: 'reglages' },
];

/** Profil et Paramètres. Rien d'autre. */
export default function Menu() {
  return (
    <Ecran titre="Menu">
      <div className="section-corps">
        {ENTREES.map((e) => (
          <div key={e.chemin} className="section-ligne">
            <Link href={e.chemin} className="ligne-historique">
              <Icone nom={e.icone} taille="grande" />
              <span className="ligne-historique-texte">
                <span className="forte">{e.nom}</span>
                <span className="footnote secondaire">{e.detail}</span>
              </span>
              <Icone nom="suivant" />
            </Link>
          </div>
        ))}
      </div>
    </Ecran>
  );
}
