import { useState } from 'react';

import { magasin, useDonnees } from '../donnees';
import { defautsDepuisSaisie, saisieDesDefauts, type SaisieDefauts } from '../lib/reglages';
import { Bouton, Champ, Retour } from '../ui/composants';
import { Ecran } from '../ui/Ecran';

/**
 * Les réglages globaux : les valeurs par défaut, au sommet de la hiérarchie,
 * et le jeu de démonstration. Rien qui ne touche qu'un écran.
 */
export default function Parametres() {
  const { reglages } = useDonnees();
  const [saisie, setSaisie] = useState<SaisieDefauts>(() => saisieDesDefauts(reglages));
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const champ = (cle: keyof SaisieDefauts, etiquette: string) => (
    <Champ etiquette={etiquette}>
      <input
        className="saisie"
        inputMode="decimal"
        value={saisie[cle]}
        onChange={(e) => {
          setSaisie((s) => ({ ...s, [cle]: e.target.value }));
          setMessage(null);
        }}
      />
    </Champ>
  );

  function enregistrer() {
    const r = defautsDepuisSaisie(saisie);
    if ('erreur' in r) {
      setMessage({ texte: r.erreur, erreur: true });
      return;
    }
    magasin.modifierReglages(r.defauts);
    setMessage({ texte: 'Enregistré. Les quarts déjà entrés gardent leurs chiffres.', erreur: false });
  }

  function reinitialiser() {
    if (!window.confirm('Remettre le jeu de démonstration ? Ce que vous avez ajouté ou modifié sera perdu.')) return;
    magasin.reinitialiser();
    setSaisie(saisieDesDefauts(magasin.lire().reglages));
    setMessage(null);
  }

  return (
    <>
      <Retour vers="/menu" />
      <Ecran titre="Paramètres">
        <form
          className="formulaire"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrer();
          }}>
          <h2 className="en-tete">Valeurs par défaut</h2>
          <p className="aide">
            Une pharmacie dont un taux est vide prend celui-ci. Un quart fige ses chiffres le jour de sa création :
            changer un défaut ne réécrit rien de ce qui est déjà entré.
          </p>
          <div className="deux-colonnes">
            {champ('taux_horaire', 'Taux horaire ($)')}
            {champ('taux_par_km', 'Taux par km ($)')}
          </div>
          <div className="deux-colonnes">
            {champ('per_diem', 'Per diem ($)')}
            {champ('pause_minutes', 'Pause non payée (min)')}
          </div>
          {message && (
            <p className={message.erreur ? 'alerte' : 'aide'} role={message.erreur ? 'alert' : 'status'}>
              {message.texte}
            </p>
          )}
          <div className="actions">
            <Bouton icone="coche" titre="Enregistrer" variante="principal" type="submit" />
          </div>
        </form>

        {/* Une seule commande, sans en-tête : la phrase dit ce qu'elle fait. */}
        <div className="section">
          <p className="aide donnees-aide">
            Les données vivent dans ce navigateur seulement. Les remettre à zéro réinstalle le jeu de démonstration :
            huit pharmacies et une année de quarts.
          </p>
          <div className="actions actions-seules">
            <Bouton icone="supprimer" titre="Remettre la démonstration" variante="danger" onClick={reinitialiser} />
          </div>
        </div>
      </Ecran>
    </>
  );
}
