import { useState } from 'react';
import { Link } from 'wouter';

import { magasin, useDonnees } from '../donnees';
import { argent } from '../lib/format';
import { valeur } from '../lib/heritage';
import { filtrerPharmacies, trierPharmacies, type Tri } from '../lib/repertoire';
import { aujourdhui } from '../lib/temps';
import type { Pharmacie } from '../lib/types';
import { Choix } from '../ui/composants';
import { Vide } from '../ui/Ecran';
import { Icone } from '../ui/Icone';

/**
 * Le répertoire : la liste entière, parce qu'ici la liste est le contenu. Les
 * favorites en tête. La recherche porte sur le nom et la ville, sans souci des
 * accents. Pas de carte géographique dans cette version.
 */
export default function Repertoire() {
  const donnees = useDonnees();
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('alphabetique');

  const liste = trierPharmacies(
    filtrerPharmacies(donnees.pharmacies, recherche),
    tri,
    donnees.quarts,
    aujourdhui()
  );

  return (
    <section className="ecran">
      <div className="barre-titre">
        <h1 className="titre-ecran">Répertoire</h1>
        <Link href="/repertoire/nouvelle" className="bouton bouton-principal" data-action-principale="">
          <Icone nom="ajouter" />
          <span>Ajouter</span>
        </Link>
      </div>

      <label className="recherche">
        <Icone nom="rechercher" />
        <input
          className="recherche-saisie"
          type="search"
          value={recherche}
          placeholder="Nom ou ville"
          aria-label="Chercher une pharmacie"
          onChange={(e) => setRecherche(e.target.value)}
        />
      </label>

      <div className="repertoire-tri">
        <Choix
          etiquette="Trier"
          options={[
            { valeur: 'alphabetique' as const, texte: 'A – Z', icone: 'menu' as const },
            { valeur: 'recentes' as const, texte: 'Récentes', icone: 'horloge' as const },
          ]}
          valeur={tri}
          onChange={setTri}
        />
      </div>

      {liste.length === 0 ? (
        <Vide texte="Aucune pharmacie ne correspond." />
      ) : (
        <div className="section-corps repertoire">
          {liste.map((p) => (
            <div key={p.id} className="section-ligne">
              <LignePharmacie pharmacie={p} tauxDefaut={donnees.reglages.taux_horaire} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LignePharmacie({ pharmacie, tauxDefaut }: { pharmacie: Pharmacie; tauxDefaut: number }) {
  return (
    <div className="ligne-pharmacie">
      <button
        type="button"
        className={pharmacie.favori ? 'bouton-icone etoile favori' : 'bouton-icone etoile'}
        aria-label="Favori"
        aria-pressed={pharmacie.favori}
        title={pharmacie.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        onClick={() => magasin.modifierPharmacie(pharmacie.id, { favori: !pharmacie.favori })}>
        <Icone nom="etoile" taille="grande" plein={pharmacie.favori} />
      </button>
      <Link href={`/repertoire/${pharmacie.id}`} className="ligne-pharmacie-lien">
        <span className="ligne-pharmacie-texte">
          <span className="headline">{pharmacie.nom}</span>
          {pharmacie.ville && <span className="subhead secondaire">{pharmacie.ville}</span>}
          {pharmacie.a_eviter && (
            <span className="subhead secondaire a-eviter">
              <Icone nom="eviter" taille="petite" />À éviter
            </span>
          )}
        </span>
        <span className="subhead secondaire taux">{argent(valeur(pharmacie.taux_horaire, tauxDefaut))} / h</span>
        <Icone nom="suivant" />
      </Link>
    </div>
  );
}
