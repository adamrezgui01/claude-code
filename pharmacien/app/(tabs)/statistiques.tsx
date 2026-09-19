import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { listerFraisPeriode } from '../../src/db/frais';
import { listerPharmacies, listerPharmaciesRecentes } from '../../src/db/pharmacies';
import { listerQuartsPeriode } from '../../src/db/quarts';
import type { Pharmacie } from '../../src/db/types';
import { aujourdhui, debutMois, formatDateCourte } from '../../src/lib/dates';
import { bornes, type Preset } from '../../src/lib/periodes';
import { argent, heures, nombre, pluriel } from '../../src/lib/format';
import { MESURES, moisEnValeur, serieMensuelle, type Mesure } from '../../src/lib/mensuel';
import { calculerStatistiques } from '../../src/lib/stats';
import { Graphique } from '../../src/ui/Graphique';
import {
  Bouton,
  Carte,
  Doux,
  Ecran,
  Fondu,
  Onglets,
  Puce,
  Rangee,
  Separateur,
  SousTitre,
  Vide,
} from '../../src/ui/composants';
import { SelecteurDate } from '../../src/ui/Selecteurs';
import { SelecteurPharmacie } from '../../src/ui/SelecteurPharmacie';
import { couleurs, espace, police } from '../../src/ui/theme';

/** Une minute : de quoi distinguer un vrai départ d'un aller-retour immédiat. */
const DELAI_REJEU = 60 * 1000;

export default function Statistiques() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [preset, setPreset] = useState<Preset>('mois');
  const [debutPerso, setDebutPerso] = useState(() => debutMois(aujourdhui()));
  const [finPerso, setFinPerso] = useState(() => aujourdhui());
  const [selection, setSelection] = useState<number[]>([]);
  const [mesure, setMesure] = useState<Mesure>('argent');
  /**
   * L'animation de montée rejoue quand on revient sur l'écran après y avoir
   * passé un vrai moment ailleurs. Un aller-retour immédiat ne la rejoue pas :
   * elle accompagne un changement, elle ne se répète pas pour rien.
   */
  const [rejouer, setRejouer] = useState(0);
  const sortieLe = useRef(0);

  useFocusEffect(
    useCallback(() => {
      setPharmacies(listerPharmacies());
      setRecentes(listerPharmaciesRecentes());
      if (sortieLe.current && Date.now() - sortieLe.current > DELAI_REJEU) {
        setRejouer((n) => n + 1);
      }
      return () => {
        sortieLe.current = Date.now();
      };
    }, [])
  );

  const [debut, fin] = bornes(preset, debutPerso, finPerso);
  const filtre = selection.length ? selection : undefined;

  const stats = useMemo(
    () =>
      calculerStatistiques(
        listerQuartsPeriode(debut, fin, filtre),
        listerFraisPeriode(debut, fin, filtre)
      ),
    [debut, fin, filtre]
  );

  /**
   * Le graphique montre toujours les douze derniers mois, quel que soit le
   * sélecteur de période : « Ce mois-ci » donnerait une barre unique, ce qui
   * n'apprend rien. Le sélecteur gouverne les totaux chiffrés, pas la série.
   */
  const serie = useMemo(
    () =>
      serieMensuelle(([d, f]) => ({
        quarts: listerQuartsPeriode(d, f, filtre),
        frais: listerFraisPeriode(d, f, filtre),
      })),
    [filtre]
  );

  function basculerPharmacie(id: number) {
    setSelection((actuelle) =>
      actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]
    );
  }

  return (
    <Ecran>
      {/* Libellés courts : un trait qui glisse ne peut pas suivre sur deux
          rangées, donc la rangée doit tenir sur une seule ligne. */}
      <Onglets
        libelle="Période"
        options={[
          { valeur: 'mois' as const, texte: 'Ce mois' },
          { valeur: 'moisDernier' as const, texte: 'Mois dernier' },
          { valeur: 'trimestre' as const, texte: '3 mois' },
          { valeur: 'personnalisee' as const, texte: 'Autre' },
        ]}
        valeur={preset}
        onChange={setPreset}
      />
      {preset === 'personnalisee' ? (
        <>
          <SelecteurDate label="Du" valeur={debutPerso} onChange={setDebutPerso} />
          <SelecteurDate label="Au" valeur={finPerso} onChange={setFinPerso} />
        </>
      ) : (
        <Doux>
          Du {formatDateCourte(debut)} au {formatDateCourte(fin)}
        </Doux>
      )}

      <Separateur />

      {/* Indépendant du sélecteur de période : une série mensuelle a besoin de
          plusieurs mois. */}
      <SousTitre>12 derniers mois</SousTitre>
      <Onglets
        options={[
          { valeur: 'argent' as const, texte: 'Argent' },
          { valeur: 'heures' as const, texte: 'Heures' },
          { valeur: 'kilometres' as const, texte: 'Kilomètres' },
        ]}
        valeur={mesure}
        onChange={setMesure}
      />
      <Graphique
        serie={serie}
        mesure={mesure}
        mesures={MESURES}
        onMesure={setMesure}
        enValeur={moisEnValeur(serie, debut, fin)}
        rejouer={rejouer}
      />

      <Separateur />

      <View style={styles.section}>
        <SousTitre>Pharmacies</SousTitre>
        <SelecteurPharmacie
          pharmacies={pharmacies}
          recentes={recentes}
          selection={selection}
          onSelectionner={basculerPharmacie}
          enTete={
            <Puce texte="Toutes" actif={selection.length === 0} onPress={() => setSelection([])} />
          }
        />
      </View>

      {stats.nombreQuarts === 0 ? (
        <Vide texte="Aucun quart dans cette période." />
      ) : (
        <Fondu>
          <Carte>
            <Text style={styles.revenu}>{argent(stats.revenuEstime)}</Text>
            <Doux>Revenu estimé</Doux>
            <Separateur />
            <Rangee label="Quarts" valeur={`${stats.nombreQuarts}`} />
            <Rangee label="Heures travaillées" valeur={heures(stats.totalHeures)} />
            <Rangee label="Honoraires" valeur={argent(stats.montantHoraire)} />
            <Rangee
              label={stats.totalKm > 0 ? `Déplacement (${nombre(stats.totalKm)} km)` : 'Déplacement'}
              valeur={argent(stats.montantDeplacement)}
            />
            <Rangee
              label={`Per diem (${pluriel(stats.joursTravailles, 'jour travaillé', 'jours travaillés')})`}
              valeur={argent(stats.montantPerDiem)}
            />
            <Rangee label="Frais extra" valeur={argent(stats.montantFraisExtra)} />
          </Carte>

          <SousTitre>Par pharmacie</SousTitre>
          <Carte>
            {stats.parPharmacie.map((p, i) => (
              <View key={p.pharmacie_id}>
                {i > 0 && <Separateur />}
                <Rangee label={p.nom} valeur={argent(p.revenu)} accent />
                <Doux>
                  {p.quarts} quart{p.quarts > 1 ? 's' : ''} · {heures(p.heures)}
                  {p.fraisExtra > 0 ? ` · frais ${argent(p.fraisExtra)}` : ''}
                </Doux>
              </View>
            ))}
          </Carte>
        </Fondu>
      )}

      <View style={styles.actions}>
        <Bouton
          titre="Générer une facture"
          onPress={() =>
            router.push(
              `/facture?debut=${debut}&fin=${fin}${
                selection.length ? `&pharmacies=${selection.join(',')}` : ''
              }`
            )
          }
        />
        <Bouton
          titre="Factures"
          variante="secondaire"
          onPress={() => router.push('/factures')}
        />
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  section: {
    marginTop: espace.l,
    marginBottom: espace.m,
  },
  revenu: {
    fontSize: 32,
    fontFamily: police.gras,
    color: couleurs.texte,
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
