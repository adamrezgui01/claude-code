import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerFraisPeriode } from '../../src/db/frais';
import { listerPharmacies, listerPharmaciesRecentes } from '../../src/db/pharmacies';
import { listerQuartsPeriode } from '../../src/db/quarts';
import type { Pharmacie } from '../../src/db/types';
import { aujourdhui, debutMois, formatDateCourte } from '../../src/lib/dates';
import { bornes, type Preset } from '../../src/lib/periodes';
import { argent, heures, nombre } from '../../src/lib/format';
import { calculerStatistiques } from '../../src/lib/stats';
import {
  Bouton,
  Carte,
  Doux,
  Fondu,
  Puce,
  Rangee,
  SelecteurDate,
  Separateur,
  SousTitre,
  Vide,
} from '../../src/ui/composants';
import { SelecteurPharmacie } from '../../src/ui/SelecteurPharmacie';
import { couleurs, espace, police } from '../../src/ui/theme';

export default function Statistiques() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [preset, setPreset] = useState<Preset>('mois');
  const [debutPerso, setDebutPerso] = useState(() => debutMois(aujourdhui()));
  const [finPerso, setFinPerso] = useState(() => aujourdhui());
  const [selection, setSelection] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      setPharmacies(listerPharmacies());
      setRecentes(listerPharmaciesRecentes());
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

  function basculerPharmacie(id: number) {
    setSelection((actuelle) =>
      actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <SousTitre>Période</SousTitre>
      <View style={styles.puces}>
        <Puce texte="Ce mois-ci" actif={preset === 'mois'} onPress={() => setPreset('mois')} />
        <Puce
          texte="Mois dernier"
          actif={preset === 'moisDernier'}
          onPress={() => setPreset('moisDernier')}
        />
        <Puce
          texte="3 derniers mois"
          actif={preset === 'trimestre'}
          onPress={() => setPreset('trimestre')}
        />
        <Puce
          texte="Personnalisée"
          actif={preset === 'personnalisee'}
          onPress={() => setPreset('personnalisee')}
        />
      </View>
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
              label={`Per diem (${stats.joursTravailles} jours travaillés)`}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
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
