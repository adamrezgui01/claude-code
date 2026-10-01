import { format, parseISO } from 'date-fns';
import { frCA } from 'date-fns/locale';
import { useState } from 'react';
import { Link } from 'wouter';

import { useDonnees } from '../donnees';
import { argent, heures, nombre } from '../lib/format';
import { MESURES, moisEnValeur, serieMensuelle, type Mesure } from '../lib/mensuel';
import { PERIODE_DEFAUT, PERIODES, bornes, quartsDeLaPeriode, type Periode } from '../lib/periodes';
import { calculerStatistiques } from '../lib/stats';
import { aujourdhui } from '../lib/temps';
import { Champ, Choix, Rangee, Section } from '../ui/composants';
import { Ecran, Vide } from '../ui/Ecran';
import { Graphique } from '../ui/Graphique';
import { Icone } from '../ui/Icone';
import { ListeRepliable } from '../ui/ListeRepliable';

const dateCourte = (jour: string) => format(parseISO(jour), 'd MMM yyyy', { locale: frCA });

/**
 * Les statistiques. La période gouverne les totaux ; le graphique garde ses
 * douze mois — « Ce mois » donnerait une barre unique, qui ne montre rien — et
 * met en valeur ceux que la période couvre.
 */
export default function Statistiques() {
  const donnees = useDonnees();
  const jour = aujourdhui();
  const [periode, setPeriode] = useState<Periode>(PERIODE_DEFAUT);
  const [autre, setAutre] = useState<[string, string]>([`${jour.slice(0, 7)}-01`, jour]);
  const [mesure, setMesure] = useState<Mesure>('argent');

  const plage = bornes(periode, jour, autre);
  const stats = calculerStatistiques(quartsDeLaPeriode(donnees.quarts, plage), donnees.pharmacies);
  const serie = serieMensuelle(donnees.quarts, donnees.pharmacies, jour);

  return (
    <Ecran titre="Statistiques">
      <Choix etiquette="Période" options={PERIODES} valeur={periode} onChange={setPeriode} />
      {periode === 'autre' ? (
        <div className="deux-colonnes periode-autre">
          <Champ etiquette="Du">
            <input
              className="saisie"
              type="date"
              value={autre[0]}
              onChange={(e) => setAutre([e.target.value, autre[1]])}
            />
          </Champ>
          <Champ etiquette="Au">
            <input
              className="saisie"
              type="date"
              value={autre[1]}
              onChange={(e) => setAutre([autre[0], e.target.value])}
            />
          </Champ>
        </div>
      ) : (
        <p className="aide plage">
          Du {dateCourte(plage[0])} au {dateCourte(plage[1])}
        </p>
      )}

      {stats.nombreQuarts === 0 ? (
        <Vide texte="Aucun quart sur la période." />
      ) : (
        <>
          <div className="revenu">
            <span className="revenu-montant">{argent(stats.revenu)}</span>
            <span className="aide">Revenu de la période</span>
          </div>
          <Section>
            <Rangee etiquette="Quarts" valeur={`${stats.nombreQuarts}`} />
            <Rangee etiquette="Heures" valeur={heures(stats.heures)} />
            <Rangee etiquette="Honoraires" valeur={argent(stats.honoraires)} />
            <Rangee etiquette={`Déplacement · ${nombre(stats.km, 0)} km`} valeur={argent(stats.deplacement)} />
            <Rangee etiquette="Per diem" valeur={argent(stats.perDiem)} />
          </Section>
        </>
      )}

      <section className="section">
        <h2 className="en-tete">Douze derniers mois</h2>
        <Choix etiquette="Mesure" options={MESURES} valeur={mesure} onChange={setMesure} />
        <Graphique serie={serie} mesure={mesure} enValeur={moisEnValeur(serie, plage)} />
      </section>

      {stats.parPharmacie.length > 0 && (
        <div className="section">
          <ListeRepliable
            elements={stats.parPharmacie}
            cle={(p) => p.pharmacie_id}
            enTete={<h2 className="en-tete">Par pharmacie</h2>}
            rendre={(p) => (
              <Link href={`/repertoire/${p.pharmacie_id}`} className="ligne-historique">
                <span className="ligne-historique-texte">
                  <span className="forte">{p.nom}</span>
                  <span className="footnote secondaire">
                    {p.quarts === 1 ? '1 quart' : `${p.quarts} quarts`} · {heures(p.heures)}
                  </span>
                </span>
                <span className="ligne-historique-montant">{argent(p.revenu)}</span>
                <Icone nom="suivant" />
              </Link>
            )}
          />
        </div>
      )}
    </Ecran>
  );
}
