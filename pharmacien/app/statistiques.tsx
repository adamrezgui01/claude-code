import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerPharmacies, listerPharmaciesRecentes } from '../src/db/pharmacies';
import { listerQuartsPeriode } from '../src/db/quarts';
import type { Pharmacie } from '../src/db/types';
import { ajouterMois, aujourdhui, debutMois, finMois, formatDateCourte } from '../src/lib/dates';
import { argent, heures, nombre } from '../src/lib/format';
import { calculerStatistiques } from '../src/lib/stats';
import {
  Bouton,
  Carte,
  Doux,
  Puce,
  Rangee,
  SelecteurDate,
  Separateur,
  SousTitre,
  Vide,
} from '../src/ui/composants';
import { SelecteurPharmacie } from '../src/ui/SelecteurPharmacie';
import { couleurs, espace } from '../src/ui/theme';

type Preset = 'mois' | 'moisDernier' | 'trimestre' | 'personnalisee';

function bornes(preset: Preset, debut: string, fin: string): [string, string] {
  const ceJour = aujourdhui();
  switch (preset) {
    case 'mois':
      return [debutMois(ceJour), finMois(ceJour)];
    case 'moisDernier': {
      const mois = ajouterMois(ceJour, -1);
      return [debutMois(mois), finMois(mois)];
    }
    case 'trimestre':
      return [debutMois(ajouterMois(ceJour, -2)), finMois(ceJour)];
    default:
      return [debut, fin];
  }
}

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
  const quarts = useMemo(
    () => listerQuartsPeriode(debut, fin, selection.length ? selection : undefined),
    [debut, fin, selection]
  );

  const stats = useMemo(() => calculerStatistiques(quarts), [quarts]);

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
        <>
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
          </Carte>

          <SousTitre>Par pharmacie</SousTitre>
          <Carte>
            {stats.parPharmacie.map((p, i) => (
              <View key={p.pharmacie_id}>
                {i > 0 && <Separateur />}
                <Rangee label={p.nom} valeur={argent(p.revenu)} />
                <Doux>
                  {p.quarts} quart{p.quarts > 1 ? 's' : ''} · {heures(p.heures)}
                </Doux>
              </View>
            ))}
          </Carte>
        </>
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
          titre="Factures générées"
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
    fontSize: 30,
    fontWeight: '700',
    color: couleurs.texte,
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
