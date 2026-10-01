import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearch, useSearchParams } from 'wouter';

import { useDonnees } from '../donnees';
import { useMaintenant } from '../horloge';
import { etatDuQuart, marqueDe, type Etat } from '../lib/etats';
import { argent, heures } from '../lib/format';
import {
  INITIALES_SEMAINE,
  decaler,
  grilleDuMois,
  jourCourt,
  jourLong,
  joursDeLaSemaine,
  quartsDuJour,
  titreDeLaVue,
  type Vue,
} from '../lib/horaire';
import { montantsDuQuart } from '../lib/montants';
import { sommeArgent } from '../lib/argent';
import { aujourdhui } from '../lib/temps';
import type { Pharmacie, Quart } from '../lib/types';
import { retenirHoraire } from '../memoire';
import { BoutonIcone, Choix, Repere } from '../ui/composants';
import { Vide } from '../ui/Ecran';
import { Icone } from '../ui/Icone';
import { QuartCarte } from '../ui/QuartCarte';

const VUES: { valeur: Vue; texte: string; icone: 'jour' | 'semaine' | 'mois' }[] = [
  { valeur: 'jour', texte: 'Jour', icone: 'jour' },
  { valeur: 'semaine', texte: 'Semaine', icone: 'semaine' },
  { valeur: 'mois', texte: 'Mois', icone: 'mois' },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * L'horaire, en trois vues. La vue et le jour vivent dans l'adresse : on
 * revient d'une fiche exactement où l'on était, et une vue se partage par son
 * lien. Le mois est la vue d'ouverture, comme dans l'application.
 */
export default function Horaire() {
  const donnees = useDonnees();
  const [params, setParams] = useSearchParams();
  const [chemin] = useLocation();
  const recherche = useSearch();

  const vueDemandee = params.get('vue');
  const vue: Vue = vueDemandee === 'jour' || vueDemandee === 'semaine' ? vueDemandee : 'mois';
  const jourDemande = params.get('jour') ?? '';
  const jour = DATE.test(jourDemande) ? jourDemande : aujourdhui();

  useEffect(() => {
    retenirHoraire(recherche ? `${chemin}?${recherche}` : chemin);
  }, [chemin, recherche]);

  const pharmacies = useMemo(() => new Map(donnees.pharmacies.map((p) => [p.id, p])), [donnees.pharmacies]);
  const maintenant = useMaintenant();
  const etats = useMemo(
    () => new Map(donnees.quarts.map((q) => [q.id, etatDuQuart(q, donnees.factures, maintenant)])),
    [donnees.quarts, donnees.factures, maintenant]
  );

  const aller = (v: Vue, j: string) => setParams({ vue: v, jour: j }, { replace: true });
  const contient = (vue === 'jour' ? [jour] : vue === 'semaine' ? joursDeLaSemaine(jour) : [jour.slice(0, 7)]).some(
    (j) => (vue === 'mois' ? aujourdhui().startsWith(j) : j === aujourdhui())
  );

  return (
    <section className="ecran">
      <div className="barre-titre">
        <h1 className="titre-ecran">Horaire</h1>
        <Link href={`/quart/nouveau?date=${jour}`} className="bouton bouton-principal" data-action-principale="">
          <Icone nom="ajouter" />
          <span>Nouveau quart</span>
        </Link>
      </div>

      <Choix etiquette="Vue" options={VUES} valeur={vue} onChange={(v) => aller(v, jour)} />

      <div className="periode">
        <BoutonIcone icone="precedent" etiquette="Période précédente" onClick={() => aller(vue, decaler(jour, vue, -1))} />
        <h2 className="periode-titre">{titreDeLaVue(jour, vue)}</h2>
        <BoutonIcone icone="suivant" etiquette="Période suivante" onClick={() => aller(vue, decaler(jour, vue, 1))} />
      </div>
      {!contient && (
        <button type="button" className="capsule aujourdhui" onClick={() => aller(vue, aujourdhui())}>
          <Icone nom="calendrier" />
          <span>Revenir à aujourd’hui</span>
        </button>
      )}

      {vue === 'jour' && <VueJour jour={jour} quarts={donnees.quarts} pharmacies={pharmacies} etats={etats} />}
      {vue === 'semaine' && <VueSemaine jour={jour} quarts={donnees.quarts} pharmacies={pharmacies} etats={etats} />}
      {vue === 'mois' && (
        <VueMois
          jour={jour}
          quarts={donnees.quarts}
          pharmacies={pharmacies}
          etats={etats}
          choisir={(j) => aller('mois', j)}
        />
      )}
    </section>
  );
}

type Proprietes = {
  jour: string;
  quarts: Quart[];
  pharmacies: Map<number, Pharmacie>;
  etats: Map<number, Etat>;
};

function Cartes({ quarts, pharmacies, etats }: Omit<Proprietes, 'jour'>) {
  return (
    <div className="cartes">
      {quarts.map((q) => (
        <QuartCarte key={q.id} quart={q} pharmacie={pharmacies.get(q.pharmacie_id)} etat={etats.get(q.id) ?? 'aVenir'} />
      ))}
    </div>
  );
}

function VueJour({ jour, quarts, pharmacies, etats }: Proprietes) {
  const duJour = quartsDuJour(quarts, jour);
  if (duJour.length === 0) return <Vide texte="Aucun quart ce jour-là." />;
  return <Cartes quarts={duJour} pharmacies={pharmacies} etats={etats} />;
}

function VueSemaine({ jour, quarts, pharmacies, etats }: Proprietes) {
  const jours = joursDeLaSemaine(jour);
  const deLaSemaine = jours.flatMap((j) => quartsDuJour(quarts, j));
  const montants = deLaSemaine.map(montantsDuQuart);
  return (
    <>
      {deLaSemaine.length > 0 && (
        <p className="resume">
          {heures(montants.reduce((t, m) => t + m.heures, 0))} · {argent(sommeArgent(montants.map((m) => m.total)))}
        </p>
      )}
      <div className="semaine">
        {jours.map((j) => {
          const duJour = quartsDuJour(quarts, j);
          return (
            <div key={j} className="semaine-jour">
              <h3 className={j === aujourdhui() ? 'semaine-date forte' : 'semaine-date'}>{jourCourt(j)}</h3>
              {duJour.length > 0 && <Cartes quarts={duJour} pharmacies={pharmacies} etats={etats} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

function VueMois({ jour, quarts, pharmacies, etats, choisir }: Proprietes & { choisir: (jour: string) => void }) {
  const grille = grilleDuMois(jour);
  const duJour = quartsDuJour(quarts, jour);
  return (
    <>
      <div className="mois" role="grid" aria-label={titreDeLaVue(jour, 'mois')}>
        <div className="mois-rangee" role="row">
          {INITIALES_SEMAINE.map((initiale, i) => (
            <span key={i} className="mois-initiale" role="columnheader">
              {initiale}
            </span>
          ))}
        </div>
        {grille.map((semaine, i) => (
          <div key={i} className="mois-rangee" role="row">
            {semaine.map((j, k) =>
              j === null ? (
                <span key={k} className="mois-case vide-case" role="gridcell" />
              ) : (
                <CaseDuMois
                  key={j}
                  jour={j}
                  quarts={quartsDuJour(quarts, j)}
                  etats={etats}
                  choisi={j === jour}
                  choisir={choisir}
                />
              )
            )}
          </div>
        ))}
      </div>

      <h2 className="jour-choisi">{jourLong(jour)}</h2>
      {duJour.length === 0 ? (
        <Vide texte="Aucun quart ce jour-là." />
      ) : (
        <Cartes quarts={duJour} pharmacies={pharmacies} etats={etats} />
      )}
    </>
  );
}

/** « 9 », « 13:30 » : une heure à la taille d'une case. */
function heureCourte(heure: string): string {
  const [hh, mm] = heure.split(':').map(Number);
  return mm === 0 ? `${hh}` : `${hh}:${`${mm}`.padStart(2, '0')}`;
}

function CaseDuMois({
  jour,
  quarts,
  etats,
  choisi,
  choisir,
}: {
  jour: string;
  quarts: Quart[];
  etats: Map<number, Etat>;
  choisi: boolean;
  choisir: (jour: string) => void;
}) {
  const numero = Number(jour.slice(8));
  const resume = quarts.length === 0 ? 'aucun quart' : quarts.length === 1 ? '1 quart' : `${quarts.length} quarts`;
  return (
    <button
      type="button"
      role="gridcell"
      className={jour === aujourdhui() ? 'mois-case aujourdhui-case' : 'mois-case'}
      aria-pressed={choisi}
      aria-label={`${jourLong(jour)}, ${resume}`}
      onClick={() => choisir(jour)}>
      <span className="mois-numero">{numero}</span>
      {quarts.map((q) => {
        const marque = marqueDe(etats.get(q.id) ?? 'aVenir');
        return (
          <span key={q.id} className={`mois-bloc ton-${marque.ton}`}>
            {marque.repere !== 'aucun' && <Repere forme={marque.repere} />}
            {heureCourte(q.heure_debut)}
            <span className="mois-plage-fin">–{heureCourte(q.heure_fin)}</span>
          </span>
        );
      })}
    </button>
  );
}
