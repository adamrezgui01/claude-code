import { useRef, useState, type KeyboardEvent } from 'react';

import { lireNombre, nombre, nombreFixe } from '../lib/format';
import {
  arrondirAffichage,
  calculerDose,
  enKilogrammes,
  enLivres,
  etapesDeLaDose,
  prochainChamp,
  valeurExacte,
  type ChampDose,
  type UniteDose,
} from '../lib/dose';
import { Champ, Choix, Replie, Retour } from '../ui/composants';
import { Ecran } from '../ui/Ecran';

const FREQUENCES = [
  { valeur: '1', texte: 'DIE' },
  { valeur: '2', texte: 'BID' },
  { valeur: '3', texte: 'TID' },
  { valeur: '4', texte: 'QID' },
] as const;

const UNITES: { valeur: UniteDose; texte: string }[] = [
  { valeur: 'parJour', texte: 'mg/kg/jour' },
  { valeur: 'parPrise', texte: 'mg/kg/dose' },
];

/** Un nombre tel qu'on l'écrit ici : jamais plus de décimales qu'il n'en faut. */
const n = (valeur: number, decimales = 1) => nombre(arrondirAffichage(valeur, decimales), decimales);

/**
 * Le calculateur de dose. L'outil fait l'arithmétique, pas le jugement
 * clinique : aucune posologie n'est proposée, et toute la chaîne s'affiche,
 * étape par étape, pour que le pharmacien la vérifie en deux secondes.
 */
export default function Dose() {
  const [poids, setPoids] = useState('');
  const [unitePoids, setUnitePoids] = useState<'kg' | 'lb'>('kg');
  const [dose, setDose] = useState('');
  const [unite, setUnite] = useState<UniteDose>('parJour');
  const [prises, setPrises] = useState<'1' | '2' | '3' | '4'>('3');
  const [concentrationMg, setConcentrationMg] = useState('');
  const [concentrationMl, setConcentrationMl] = useState('');
  const [jours, setJours] = useState('');
  const [formatMl, setFormatMl] = useState('');
  const [maxParJour, setMaxParJour] = useState('');

  const champs = {
    poids: useRef<HTMLInputElement>(null),
    dose: useRef<HTMLInputElement>(null),
    concentrationMg: useRef<HTMLInputElement>(null),
    concentrationMl: useRef<HTMLInputElement>(null),
  };

  /** Entrée ouvre le prochain champ obligatoire encore vide. */
  const enchainer = (courant: ChampDose) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const suivant = prochainChamp(courant, { poids, dose, concentrationMg, concentrationMl });
    if (suivant) champs[suivant].current?.focus();
    else e.currentTarget.blur();
  };

  const poidsSaisi = lireNombre(poids) ?? 0;
  const poidsKg = enKilogrammes(poidsSaisi, unitePoids);
  const nPrises = Number(prises);
  const resultat = calculerDose({
    poidsKg,
    dose: lireNombre(dose) ?? 0,
    unite,
    prises: nPrises,
    concentrationMg: lireNombre(concentrationMg) ?? 0,
    concentrationMl: lireNombre(concentrationMl) ?? 0,
    jours: lireNombre(jours),
    formatMl: lireNombre(formatMl),
    maxParJour: lireNombre(maxParJour),
  });
  const depasse = resultat?.depassement != null;
  const exact = resultat ? valeurExacte(resultat.volumeParPrise) : null;

  const saisie = (
    cle: ChampDose,
    valeur: string,
    changer: (v: string) => void,
    options: { invite?: string; suffixe?: string; etiquette?: string } = {}
  ) => (
    <span className={options.suffixe ? 'saisie-unite' : undefined}>
      <input
        ref={champs[cle]}
        className="saisie"
        inputMode="decimal"
        value={valeur}
        placeholder={options.invite}
        aria-label={options.etiquette}
        onChange={(e) => changer(e.target.value)}
        onKeyDown={enchainer(cle)}
      />
      {options.suffixe && <span className="suffixe">{options.suffixe}</span>}
    </span>
  );

  return (
    <>
      <Retour vers="/clinique" />
      <Ecran titre="Calculateur de dose">
        <p className="aide avis">L’outil fait l’arithmétique, pas le jugement clinique.</p>

        <div className="groupe-dose">
          <Champ etiquette="Poids">{saisie('poids', poids, setPoids, { invite: '18' })}</Champ>
          <Choix etiquette="Unité de poids" options={[{ valeur: 'kg' as const, texte: 'kg' }, { valeur: 'lb' as const, texte: 'lb' }]} valeur={unitePoids} onChange={setUnitePoids} />
          {/* La conversion s'affiche en permanence : la bascule ne remplace
              jamais la valeur en silence. */}
          {poidsSaisi > 0 && (
            <p className="aide conversion" aria-live="polite">
              {unitePoids === 'kg' ? `soit ${n(enLivres(poidsSaisi), 1)} lb` : `soit ${n(poidsKg, 2)} kg`}
            </p>
          )}
        </div>

        <div className="groupe-dose">
          <Champ etiquette="Dose" aide="Celle que vous avez vérifiée. L’outil n’en propose aucune.">
            {saisie('dose', dose, setDose)}
          </Champ>
          <Choix etiquette="Unité de dose" options={UNITES} valeur={unite} onChange={setUnite} />
          <span className="etiquette">Fréquence</span>
          <Choix etiquette="Fréquence" options={[...FREQUENCES]} valeur={prises} onChange={setPrises} />
        </div>

        {/* Une étiquette, pas un en-tête : ce qu'elle nomme est un seul champ
            en deux moitiés. */}
        <div className="groupe-dose">
          <span className="etiquette">Concentration</span>
          <div className="concentration">
            {saisie('concentrationMg', concentrationMg, setConcentrationMg, { suffixe: 'mg', etiquette: 'Concentration, mg' })}
            <span className="barre-oblique" aria-hidden="true">/</span>
            {saisie('concentrationMl', concentrationMl, setConcentrationMl, { suffixe: 'mL', etiquette: 'Concentration, mL' })}
          </div>
        </div>

        <Replie titre="Options">
          <Champ etiquette="Durée du traitement (jours)">
            <input className="saisie" inputMode="numeric" value={jours} onChange={(e) => setJours(e.target.value)} />
          </Champ>
          <Champ etiquette="Format de la bouteille (mL)">
            <input className="saisie" inputMode="decimal" value={formatMl} onChange={(e) => setFormatMl(e.target.value)} />
          </Champ>
          <Champ etiquette="Dose maximale quotidienne (mg)">
            <input className="saisie" inputMode="decimal" value={maxParJour} onChange={(e) => setMaxParJour(e.target.value)} />
          </Champ>
        </Replie>

        {resultat === null ? (
          <p className="aide incomplet">Poids, dose et concentration : les trois sont nécessaires.</p>
        ) : (
          <div className="resultat" aria-live="polite">
            <div className="section-corps">
              {etapesDeLaDose(resultat, unite, nPrises).map((etape, i) => (
                <Etape
                  key={i}
                  gauche={
                    i === 0
                      ? `${n(poidsKg, 2)} kg × ${n(lireNombre(dose) ?? 0, 2)} ${unite === 'parJour' ? 'mg/kg/jour' : 'mg/kg/dose'}`
                      : etape.operation
                  }
                  droite={`${n(etape.resultat, 2)} ${etape.unite === 'mg/jour' ? 'mg par jour' : 'mg par prise'}`}
                  alerte={depasse && etape.unite === 'mg/jour'}
                />
              ))}
              <Etape
                gauche={`${n(lireNombre(concentrationMg) ?? 0, 2)} mg / ${n(lireNombre(concentrationMl) ?? 0, 2)} mL`}
                droite={`${n(resultat.concentration, 2)} mg/mL`}
              />
              <Etape
                gauche={`${n(resultat.doseParPrise, 2)} mg ÷ ${n(resultat.concentration, 2)} mg/mL`}
                droite={`${n(resultat.volumeParPrise)} mL par prise`}
                sous={exact === null ? null : `exact : ${nombre(exact, 3)} mL`}
                alerte={depasse}
              />
              {/* La ligne la plus lue : elle décide de ce qu'on prépare. Elle
                  se distingue par sa taille. */}
              {resultat.quantiteTotale !== null && (
                <div className="section-ligne servir">
                  <span className="servir-titre">
                    À servir
                    <span className="footnote secondaire">
                      {n(resultat.volumeParPrise)} mL × {nPrises} prise{nPrises > 1 ? 's' : ''} × {lireNombre(jours)} jours
                    </span>
                  </span>
                  <span className="servir-valeur">{n(resultat.quantiteTotale)} mL</span>
                </div>
              )}
              {resultat.bouteilles !== null && (
                <Etape
                  gauche={`÷ ${n(lireNombre(formatMl) ?? 0)} mL`}
                  droite={resultat.bouteilles === 1 ? '1 bouteille' : `${resultat.bouteilles} bouteilles`}
                />
              )}
            </div>

            {/* Le dépassement ne bloque rien : le résultat reste affiché en
                entier. « Votre maximum », jamais « Donnez » : l'outil rapporte
                l'arithmétique d'une valeur que le pharmacien a saisie. */}
            {resultat.depassement && (
              <div className="depassement" role="alert">
                <p className="alerte">Dépasse la dose maximale de {n(resultat.depassement.ecart, 2)} mg par jour.</p>
                <p className="maximum">
                  <span className="forte">Votre maximum</span> {n(lireNombre(maxParJour) ?? 0, 2)} mg/jour ·{' '}
                  {n(resultat.depassement.doseParPrise, 2)} mg/prise ·{' '}
                  {/* Décimale fixe : « 10,0 » en face de « 10,8 ». */}
                  {nombreFixe(resultat.depassement.volumeParPrise)} mL/prise
                </p>
              </div>
            )}
            {resultat.alertes
              .filter((a) => a.genre !== 'maximum')
              .map((a, i) => (
                <p key={i} className="alerte">
                  {a.genre === 'poids'
                    ? 'Vérifiez le poids.'
                    : a.genre === 'volume'
                      ? `Volume élevé pour une prise (${n(a.volume)} mL). Vérifiez la concentration.`
                      : null}
                </p>
              ))}
          </div>
        )}
      </Ecran>
    </>
  );
}

/** Une ligne de la chaîne : l'opération à gauche, son résultat à droite. */
function Etape({ gauche, droite, sous, alerte }: { gauche: string; droite: string; sous?: string | null; alerte?: boolean }) {
  return (
    <div className="section-ligne etape">
      <div className="etape-ligne">
        <span className="secondaire">{gauche}</span>
        <span className={alerte ? 'etape-resultat alerte' : 'etape-resultat'}>{droite}</span>
      </div>
      {sous && <span className="footnote secondaire etape-exact">{sous}</span>}
    </div>
  );
}
