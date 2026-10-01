import { useState } from 'react';
import { Link, useLocation } from 'wouter';

import { magasin, useDonnees } from '../donnees';
import { useMaintenant } from '../horloge';
import { sommeArgent } from '../lib/argent';
import { etatDuQuart, marqueDe } from '../lib/etats';
import {
  SAISIE_VIDE,
  pharmacieDepuisSaisie,
  saisieDePharmacie,
  type SaisiePharmacie,
} from '../lib/fichePharmacie';
import { argent, heureLisible, heures, nombre } from '../lib/format';
import { jourLong } from '../lib/horaire';
import { montantsDuQuart } from '../lib/montants';
import { historique } from '../lib/repertoire';
import type { Facture, Pharmacie, Quart, Reglages } from '../lib/types';
import { Bouton, Champ, Rangee, Repere, Retour, Section } from '../ui/composants';
import { Ecran, Vide } from '../ui/Ecran';
import { Icone } from '../ui/Icone';
import { ListeRepliable } from '../ui/ListeRepliable';

/**
 * La fiche d'une pharmacie : ses coordonnées, ses conditions, l'historique de
 * ses quarts, et deux repères — favori, à éviter — que l'usager pose lui-même.
 * Elle se lit d'abord ; « Modifier » la passe en formulaire.
 */
export default function FichePharmacie({ params }: { params: { id: string } }) {
  const donnees = useDonnees();
  const nouvelle = params.id === 'nouvelle';
  const pharmacie = nouvelle ? undefined : donnees.pharmacies.find((p) => `${p.id}` === params.id);

  if (!nouvelle && !pharmacie) {
    return (
      <>
        <Retour vers="/repertoire" />
        <Ecran titre="Pharmacie">
          <Vide texte="Cette pharmacie n’existe plus." />
        </Ecran>
      </>
    );
  }
  return <Fiche key={params.id} pharmacie={pharmacie} />;
}

function Fiche({ pharmacie }: { pharmacie?: Pharmacie }) {
  const [modifier, setModifier] = useState(!pharmacie);
  if (modifier || !pharmacie) {
    return <Formulaire pharmacie={pharmacie} fermer={() => setModifier(false)} />;
  }
  return <Lecture pharmacie={pharmacie} modifier={() => setModifier(true)} />;
}

function Lecture({ pharmacie, modifier }: { pharmacie: Pharmacie; modifier: () => void }) {
  const donnees = useDonnees();
  const maintenant = useMaintenant();
  const quarts = historique(donnees.quarts, pharmacie.id);
  const montants = quarts.map(montantsDuQuart);

  return (
    <>
      <Retour vers="/repertoire" />
      <Ecran titre={pharmacie.nom}>
        {pharmacie.ville && <p className="sous-titre">{pharmacie.ville}</p>}

        <div className="choix" role="group" aria-label="Repères">
          <button
            type="button"
            className="capsule"
            aria-pressed={pharmacie.favori}
            onClick={() => magasin.modifierPharmacie(pharmacie.id, { favori: !pharmacie.favori })}>
            <Icone nom="etoile" plein={pharmacie.favori} />
            <span>Favori</span>
          </button>
          <button
            type="button"
            className="capsule"
            aria-pressed={pharmacie.a_eviter}
            onClick={() => magasin.modifierPharmacie(pharmacie.id, { a_eviter: !pharmacie.a_eviter })}>
            <Icone nom="eviter" />
            <span>À éviter</span>
          </button>
        </div>

        <Section titre="Coordonnées">
          {pharmacie.adresse && <Rangee etiquette="Adresse" valeur={pharmacie.adresse} />}
          {pharmacie.telephone && <Rangee etiquette="Téléphone" valeur={pharmacie.telephone} />}
          {pharmacie.courriel && <Rangee etiquette="Courriel" valeur={pharmacie.courriel} />}
          {pharmacie.contact && <Rangee etiquette="Contact" valeur={pharmacie.contact} />}
        </Section>

        <Conditions pharmacie={pharmacie} reglages={donnees.reglages} />

        {quarts.length === 0 ? (
          <Vide texte="Aucun quart chez cette pharmacie." />
        ) : (
          <div className="section">
            <ListeRepliable
              elements={quarts}
              cle={(q) => q.id}
              enTete={
                <>
                  <h2 className="en-tete">Historique</h2>
                  <p className="resume-historique">
                    {quarts.length === 1 ? '1 quart' : `${quarts.length} quarts`} ·{' '}
                    {heures(montants.reduce((t, m) => t + m.heures, 0))} ·{' '}
                    {argent(sommeArgent(montants.map((m) => m.total)))}
                  </p>
                </>
              }
              rendre={(q) => <LigneHistorique quart={q} factures={donnees.factures} maintenant={maintenant} />}
            />
          </div>
        )}

        {pharmacie.notes && (
          <Section>
            <p className="notes">{pharmacie.notes}</p>
          </Section>
        )}

        <div className="actions">
          <Bouton icone="modifier" titre="Modifier" variante="principal" onClick={modifier} />
        </div>
      </Ecran>
    </>
  );
}

/**
 * Les conditions de la pharmacie. Un taux vide vient des réglages, et le dit ;
 * un zéro s'affiche comme un zéro ; une distance jamais établie s'affiche
 * comme inconnue, jamais comme 0 km.
 */
function Conditions({ pharmacie, reglages }: { pharmacie: Pharmacie; reglages: Reglages }) {
  const depuis = (propre: number | null, defaut: number, format: (n: number) => string) =>
    propre === null ? `${format(defaut)} (réglages)` : format(propre);
  const km =
    pharmacie.distance_km === null
      ? 'Distance inconnue'
      : `${nombre(pharmacie.distance_km)} km aller simple${pharmacie.aller_retour ? ', aller-retour' : ''}`;
  return (
    <Section titre="Conditions">
      <Rangee
        etiquette="Taux horaire"
        valeur={depuis(pharmacie.taux_horaire, reglages.taux_horaire, (n) => `${argent(n)} / h`)}
      />
      <Rangee etiquette="Kilométrage" valeur={km} />
      <Rangee
        etiquette="Taux par km"
        valeur={depuis(pharmacie.taux_par_km, reglages.taux_par_km, (n) => argent(n))}
      />
      <Rangee etiquette="Per diem" valeur={depuis(pharmacie.per_diem, reglages.per_diem, (n) => argent(n))} />
    </Section>
  );
}

function LigneHistorique({ quart, factures, maintenant }: { quart: Quart; factures: Facture[]; maintenant: Date }) {
  const marque = marqueDe(etatDuQuart(quart, factures, maintenant));
  return (
    <Link href={`/quart/${quart.id}`} className={`ligne-historique ton-${marque.ton}`}>
      <span className="ligne-historique-texte">
        <span>{jourLong(quart.date)} {quart.date.slice(0, 4)}</span>
        <span className="footnote secondaire">
          {heureLisible(quart.heure_debut)} à {heureLisible(quart.heure_fin)}
          {marque.repere !== 'aucun' && (
            <span className="etat-ligne">
              <Repere forme={marque.repere} />
              {marque.nom}
            </span>
          )}
        </span>
      </span>
      <span className="ligne-historique-montant">{argent(montantsDuQuart(quart).total)}</span>
      <Icone nom="suivant" />
    </Link>
  );
}

function Formulaire({ pharmacie, fermer }: { pharmacie?: Pharmacie; fermer: () => void }) {
  const donnees = useDonnees();
  const [, naviguer] = useLocation();
  const [saisie, setSaisie] = useState<SaisiePharmacie>(() => (pharmacie ? saisieDePharmacie(pharmacie) : SAISIE_VIDE));
  const [erreur, setErreur] = useState('');
  const r = donnees.reglages;

  const changer = (champs: Partial<SaisiePharmacie>) => {
    setSaisie((s) => ({ ...s, ...champs }));
    setErreur('');
  };

  function enregistrer() {
    const resultat = pharmacieDepuisSaisie(saisie);
    if ('erreur' in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    if (pharmacie) {
      magasin.modifierPharmacie(pharmacie.id, resultat.champs);
      fermer();
    } else {
      const id = magasin.creerPharmacie({ ...resultat.champs, favori: false, a_eviter: false });
      naviguer(`/repertoire/${id}`, { replace: true });
    }
  }

  const texte = (cle: keyof SaisiePharmacie, etiquette: string, options: { type?: string; indice?: string } = {}) => (
    <Champ etiquette={etiquette}>
      <input
        className="saisie"
        type={options.type ?? 'text'}
        inputMode={options.indice !== undefined ? 'decimal' : undefined}
        placeholder={options.indice}
        value={saisie[cle] as string}
        onChange={(e) => changer({ [cle]: e.target.value })}
      />
    </Champ>
  );

  return (
    <>
      <Retour vers="/repertoire" />
      <Ecran titre={pharmacie ? 'Modifier la pharmacie' : 'Nouvelle pharmacie'}>
        <form
          className="formulaire"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrer();
          }}>
          <h2 className="en-tete">Coordonnées</h2>
          {texte('nom', 'Nom')}
          {texte('ville', 'Ville')}
          {texte('adresse', 'Adresse')}
          <div className="deux-colonnes">
            {texte('telephone', 'Téléphone', { type: 'tel' })}
            {texte('courriel', 'Courriel', { type: 'email' })}
          </div>
          {texte('contact', 'Contact')}

          <h2 className="en-tete en-tete-groupe">Conditions</h2>
          <p className="aide">Vide, un taux prend la valeur des réglages. Zéro reste zéro.</p>
          {texte('taux_horaire', 'Taux horaire ($)', { indice: `${nombre(r.taux_horaire, 2)}` })}
          <div className="deux-colonnes">
            {texte('distance_km', 'Distance aller simple (km)', { indice: 'Inconnue' })}
            {texte('taux_par_km', 'Taux par km ($)', { indice: `${nombre(r.taux_par_km, 2)}` })}
          </div>
          <label className="case">
            <input
              type="checkbox"
              checked={saisie.aller_retour}
              onChange={(e) => changer({ aller_retour: e.target.checked })}
            />
            Aller-retour
          </label>
          {texte('per_diem', 'Per diem ($)', { indice: `${nombre(r.per_diem, 2)}` })}

          <Champ etiquette="Notes">
            <textarea className="saisie" rows={3} value={saisie.notes} onChange={(e) => changer({ notes: e.target.value })} />
          </Champ>

          {erreur && (
            <p className="alerte" role="alert">
              {erreur}
            </p>
          )}
          <div className="actions">
            <Bouton icone="coche" titre="Enregistrer" variante="principal" type="submit" />
            {pharmacie && <Bouton icone="fermer" titre="Annuler" onClick={fermer} />}
          </div>
        </form>
      </Ecran>
    </>
  );
}
