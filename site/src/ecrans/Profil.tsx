import { useState } from 'react';

import { magasin, useDonnees } from '../donnees';
import type { Reglages } from '../lib/types';
import { Bouton, Champ, Retour } from '../ui/composants';
import { Ecran } from '../ui/Ecran';

type Coordonnees = Pick<Reglages, 'nom' | 'permis' | 'adresse' | 'telephone' | 'courriel'>;

/**
 * Ce qui décrit l'usager. Le site ne produit pas de facture ; ces champs
 * existent pour que le profil ait l'air de celui de l'application, et rien
 * ne quitte le navigateur.
 */
export default function Profil() {
  const { reglages } = useDonnees();
  const [saisie, setSaisie] = useState<Coordonnees>(() => ({
    nom: reglages.nom,
    permis: reglages.permis,
    adresse: reglages.adresse,
    telephone: reglages.telephone,
    courriel: reglages.courriel,
  }));
  const [enregistre, setEnregistre] = useState(false);

  const champ = (cle: keyof Coordonnees, etiquette: string, type = 'text') => (
    <Champ etiquette={etiquette}>
      <input
        className="saisie"
        type={type}
        value={saisie[cle]}
        onChange={(e) => {
          setSaisie((s) => ({ ...s, [cle]: e.target.value }));
          setEnregistre(false);
        }}
      />
    </Champ>
  );

  return (
    <>
      <Retour vers="/menu" />
      <Ecran titre="Profil">
        <form
          className="formulaire"
          onSubmit={(e) => {
            e.preventDefault();
            magasin.modifierReglages(
              Object.fromEntries(Object.entries(saisie).map(([k, v]) => [k, v.trim()])) as Coordonnees
            );
            setEnregistre(true);
          }}>
          <h2 className="en-tete">Identité</h2>
          {champ('nom', 'Votre nom')}
          {champ('permis', 'Numéro de permis (OPQ)')}
          <h2 className="en-tete en-tete-groupe">Coordonnées</h2>
          {champ('adresse', 'Adresse')}
          <div className="deux-colonnes">
            {champ('telephone', 'Téléphone', 'tel')}
            {champ('courriel', 'Courriel', 'email')}
          </div>
          <div className="actions">
            <Bouton icone="coche" titre={enregistre ? 'Enregistré' : 'Enregistrer'} variante="principal" type="submit" />
          </div>
        </form>
      </Ecran>
    </>
  );
}
