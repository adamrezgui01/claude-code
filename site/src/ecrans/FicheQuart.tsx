import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';

import { magasin, useDonnees } from '../donnees';
import { useMaintenant } from '../horloge';
import { etatDuQuart, marqueDe } from '../lib/etats';
import { quartDepuisSaisie, type Saisie } from '../lib/fiche';
import { argent, ecrireNombre, heures, nombre } from '../lib/format';
import { conditionsDuQuart } from '../lib/heritage';
import { jourLong } from '../lib/horaire';
import { montantsDuQuart } from '../lib/montants';
import { aujourdhui, traverseMinuit } from '../lib/temps';
import type { Pharmacie, Quart, Reglages } from '../lib/types';
import { adresseDeLHoraire } from '../memoire';
import { Bouton, Champ, Rangee, Repere, Replie, Retour, Section } from '../ui/composants';
import { Ecran, Vide } from '../ui/Ecran';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);

function saisieDe(quart: Quart): Saisie {
  return {
    pharmacie_id: `${quart.pharmacie_id}`,
    date: quart.date,
    heure_debut: quart.heure_debut,
    heure_fin: quart.heure_fin,
    pause: `${quart.pause_minutes}`,
    taux_horaire: ecrireNombre(quart.taux_horaire),
    taux_par_km: ecrireNombre(quart.taux_par_km),
    kilometrage: ecrireNombre(quart.kilometrage),
    aller_retour: quart.aller_retour,
    per_diem: ecrireNombre(quart.per_diem),
    notes: quart.notes,
  };
}

function saisieNeuve(date: string): Saisie {
  return {
    pharmacie_id: '',
    date,
    heure_debut: '09:00',
    heure_fin: '17:00',
    pause: '',
    taux_horaire: '',
    taux_par_km: '',
    kilometrage: '',
    aller_retour: true,
    per_diem: '',
    notes: '',
  };
}

/**
 * La fiche d'un quart : il s'ouvre, se crée et se modifie ici. Les taux et la
 * distance viennent de la pharmacie et se figent à l'enregistrement ; ils
 * restent repliés, parce qu'on ne les touche presque jamais. Un quart facturé
 * se lit, il ne se modifie plus.
 */
export default function FicheQuart({ params }: { params: { id: string } }) {
  const donnees = useDonnees();
  const nouveau = params.id === 'nouveau';
  const quart = nouveau ? undefined : donnees.quarts.find((q) => `${q.id}` === params.id);

  if (!nouveau && !quart) {
    return (
      <>
        <Retour vers={adresseDeLHoraire()} />
        <Ecran titre="Quart">
          <Vide texte="Ce quart n’existe plus." />
        </Ecran>
      </>
    );
  }
  return <Formulaire key={params.id} quart={quart} pharmacies={donnees.pharmacies} reglages={donnees.reglages} />;
}

function Formulaire({
  quart,
  pharmacies,
  reglages,
}: {
  quart?: Quart;
  pharmacies: Pharmacie[];
  reglages: Reglages;
}) {
  const donnees = useDonnees();
  const [, naviguer] = useLocation();
  const recherche = new URLSearchParams(useSearch());
  const dateDemandee = recherche.get('date') ?? '';

  const [saisie, setSaisie] = useState<Saisie>(() =>
    quart ? saisieDe(quart) : saisieNeuve(DATE.test(dateDemandee) ? dateDemandee : aujourdhui())
  );
  const [erreur, setErreur] = useState('');

  const fige = !!quart?.numero_facture;
  const maintenant = useMaintenant();
  const etat = quart ? etatDuQuart(quart, donnees.factures, maintenant) : null;
  const marque = etat ? marqueDe(etat) : null;
  const pharmacie = pharmacies.find((p) => `${p.id}` === saisie.pharmacie_id);
  const herite = pharmacie ? conditionsDuQuart(pharmacie, reglages) : null;
  const resultat = quartDepuisSaisie(saisie, pharmacies, reglages);
  const apercu = 'quart' in resultat ? montantsDuQuart({ ...resultat.quart, id: 0, numero_facture: '' }) : null;

  const changer = (champs: Partial<Saisie>) => {
    setSaisie((s) => ({ ...s, ...champs }));
    setErreur('');
  };

  /** Choisir une pharmacie reprend son aller-retour : c'est elle qui le décide. */
  const choisirPharmacie = (id: string) => {
    const p = pharmacies.find((x) => `${x.id}` === id);
    changer({ pharmacie_id: id, ...(p && !quart ? { aller_retour: p.aller_retour } : {}) });
  };

  function enregistrer() {
    if (!('quart' in resultat)) {
      setErreur(resultat.erreur);
      return;
    }
    if (quart) magasin.modifierQuart(quart.id, resultat.quart);
    else magasin.creerQuart(resultat.quart);
    naviguer(adresseDeLHoraire(resultat.quart.date));
  }

  function supprimer() {
    if (!quart || !window.confirm('Supprimer ce quart ?')) return;
    magasin.supprimerQuart(quart.id);
    naviguer(adresseDeLHoraire());
  }

  /** Ce qu'un champ vide vaudra : la valeur de la pharmacie, ou des réglages. */
  const indice = (valeur: number | null | undefined) =>
    !herite ? '' : valeur === null || valeur === undefined ? 'Inconnue' : nombre(valeur, 2);

  return (
    <>
      <Retour vers={adresseDeLHoraire()} />
      <Ecran titre={quart ? (pharmacie?.nom ?? 'Quart') : 'Nouveau quart'}>
        {quart && marque && (
          <p className="sous-titre">
            <span>{majuscule(jourLong(quart.date))}</span>
            {marque.repere !== 'aucun' && (
              <span className="etat-fiche">
                <Repere forme={marque.repere} />
                {marque.nom}
              </span>
            )}
          </p>
        )}
        {fige && <p className="aide note-fige">Facturé ({quart?.numero_facture}) : ce quart est figé.</p>}

        <form
          className="formulaire"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrer();
          }}>
          <fieldset className="groupe" disabled={fige}>
            <Champ etiquette="Pharmacie">
              <select
                className="saisie"
                value={saisie.pharmacie_id}
                onChange={(e) => choisirPharmacie(e.target.value)}>
                <option value="" disabled>
                  Choisir
                </option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ etiquette="Date">
              <input
                className="saisie"
                type="date"
                value={saisie.date}
                onChange={(e) => changer({ date: e.target.value })}
              />
            </Champ>
            <div className="deux-colonnes">
              <Champ etiquette="Début">
                <input
                  className="saisie"
                  type="time"
                  step={900}
                  value={saisie.heure_debut}
                  onChange={(e) => changer({ heure_debut: e.target.value })}
                />
              </Champ>
              <Champ etiquette="Fin">
                <input
                  className="saisie"
                  type="time"
                  step={900}
                  value={saisie.heure_fin}
                  onChange={(e) => changer({ heure_fin: e.target.value })}
                />
              </Champ>
            </div>
            {traverseMinuit(saisie.heure_debut, saisie.heure_fin) && (
              <p className="aide">Finit le lendemain. Le quart reste rangé au jour où il commence.</p>
            )}
            <Champ etiquette="Pause non payée (minutes)">
              <input
                className="saisie"
                inputMode="numeric"
                value={saisie.pause}
                placeholder={`${herite?.pause_minutes ?? reglages.pause_minutes}`}
                onChange={(e) => changer({ pause: e.target.value })}
              />
            </Champ>

            <Replie titre="Taux et déplacement">
              <p className="aide">
                {quart
                  ? 'Les chiffres figés à la création du quart.'
                  : 'Vide, un champ prend la valeur de la pharmacie. Zéro reste zéro.'}
              </p>
              <Champ etiquette="Taux horaire ($)">
                <input
                  className="saisie"
                  inputMode="decimal"
                  value={saisie.taux_horaire}
                  placeholder={indice(herite?.taux_horaire)}
                  onChange={(e) => changer({ taux_horaire: e.target.value })}
                />
              </Champ>
              <div className="deux-colonnes">
                <Champ etiquette="Distance aller simple (km)">
                  <input
                    className="saisie"
                    inputMode="decimal"
                    value={saisie.kilometrage}
                    placeholder={indice(herite?.kilometrage)}
                    onChange={(e) => changer({ kilometrage: e.target.value })}
                  />
                </Champ>
                <Champ etiquette="Taux par km ($)">
                  <input
                    className="saisie"
                    inputMode="decimal"
                    value={saisie.taux_par_km}
                    placeholder={indice(herite?.taux_par_km)}
                    onChange={(e) => changer({ taux_par_km: e.target.value })}
                  />
                </Champ>
              </div>
              <label className="case">
                <input
                  type="checkbox"
                  checked={saisie.aller_retour}
                  onChange={(e) => changer({ aller_retour: e.target.checked })}
                />
                Aller-retour
              </label>
              <Champ etiquette="Per diem ($)">
                <input
                  className="saisie"
                  inputMode="decimal"
                  value={saisie.per_diem}
                  placeholder={indice(herite?.per_diem)}
                  onChange={(e) => changer({ per_diem: e.target.value })}
                />
              </Champ>
              <Champ etiquette="Notes">
                <textarea
                  className="saisie"
                  rows={3}
                  value={saisie.notes}
                  onChange={(e) => changer({ notes: e.target.value })}
                />
              </Champ>
            </Replie>
          </fieldset>

          {apercu && (
            <Section>
              <Rangee etiquette="Heures" valeur={heures(apercu.heures)} />
              <Rangee etiquette="Honoraires" valeur={argent(apercu.honoraires)} />
              <Rangee
                etiquette={apercu.kilometrage === null ? 'Kilométrage' : `Kilométrage · ${nombre(apercu.km)} km`}
                valeur={apercu.kilometrage === null ? 'Distance inconnue' : argent(apercu.kilometrage)}
              />
              {apercu.perDiem > 0 && <Rangee etiquette="Per diem" valeur={argent(apercu.perDiem)} />}
              <Rangee etiquette="Total" valeur={argent(apercu.total)} fort />
            </Section>
          )}

          {erreur && (
            <p className="alerte" role="alert">
              {erreur}
            </p>
          )}

          {!fige && (
            <div className="actions">
              <Bouton icone="coche" titre="Enregistrer" variante="principal" type="submit" />
              {quart && <Bouton icone="supprimer" titre="Supprimer" variante="danger" onClick={supprimer} />}
            </div>
          )}
        </form>
      </Ecran>
    </>
  );
}
