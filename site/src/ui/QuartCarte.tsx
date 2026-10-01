import { Link } from 'wouter';

import { marqueDe, type Etat } from '../lib/etats';
import { argent, heureLisible, heures } from '../lib/format';
import { montantsDuQuart } from '../lib/montants';
import { traverseMinuit } from '../lib/temps';
import type { Pharmacie, Quart } from '../lib/types';
import { Repere } from './composants';
import { Icone } from './Icone';

/**
 * Une carte par quart : la pharmacie, les heures, le montant. Facturé et payé
 * s'atténuent et se distinguent par leur repère ; à facturer garde son encre,
 * parce qu'il reste du travail dessus.
 */
export function QuartCarte({ quart, pharmacie, etat }: { quart: Quart; pharmacie?: Pharmacie; etat: Etat }) {
  const marque = marqueDe(etat);
  const montants = montantsDuQuart(quart);
  const nuit = traverseMinuit(quart.heure_debut, quart.heure_fin);
  return (
    <Link href={`/quart/${quart.id}`} className={`carte-lien carte-quart ton-${marque.ton}`}>
      <span className="carte-quart-texte">
        <span className="carte-quart-nom">{pharmacie?.nom ?? 'Pharmacie retirée'}</span>
        <span className="carte-quart-heures">
          {heureLisible(quart.heure_debut)} à {heureLisible(quart.heure_fin)}
          {nuit ? ' le lendemain' : ''} · {heures(montants.heures)}
        </span>
        {marque.repere !== 'aucun' && (
          <span className="carte-quart-etat">
            <Repere forme={marque.repere} />
            {marque.nom}
          </span>
        )}
      </span>
      <span className="carte-quart-montant">{argent(montants.total)}</span>
      <Icone nom="suivant" />
    </Link>
  );
}
