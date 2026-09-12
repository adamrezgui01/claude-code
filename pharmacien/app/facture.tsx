import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { enregistrerFacture, prochainNumeroFacture } from '../src/db/factures';
import { listerPharmacies, listerPharmaciesRecentes } from '../src/db/pharmacies';
import { obtenirReglages } from '../src/db/profil';
import { listerQuartsPeriode } from '../src/db/quarts';
import type { Pharmacie, QuartDetaille } from '../src/db/types';
import { ajouterMois, aujourdhui, debutMois, finMois, formatDateCourte } from '../src/lib/dates';
import { calculerTotaux, type OptionsFacture } from '../src/lib/facture';
import { genererPdf } from '../src/lib/facturePdf';
import { analyserNombre, argent, heures } from '../src/lib/format';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Interrupteur,
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

export default function GenererFacture() {
  const router = useRouter();
  const params = useLocalSearchParams<{ debut?: string; fin?: string; pharmacies?: string }>();

  const [reglages] = useState(obtenirReglages);
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [preset, setPreset] = useState<Preset>(params.debut ? 'personnalisee' : 'mois');
  const [debutPerso, setDebutPerso] = useState(params.debut ?? debutMois(aujourdhui()));
  const [finPerso, setFinPerso] = useState(params.fin ?? aujourdhui());
  const [selection, setSelection] = useState<number[]>(
    params.pharmacies ? params.pharmacies.split(',').map(Number) : []
  );

  const [inclureDeplacement, setInclureDeplacement] = useState(true);
  const [inclurePerDiem, setInclurePerDiem] = useState(true);
  const [inclureHebergement, setInclureHebergement] = useState(false);
  const [hebergements, setHebergements] = useState<Record<number, string>>({});
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    setPharmacies(listerPharmacies());
    setRecentes(listerPharmaciesRecentes());
  }, []);

  const [debut, fin] = bornes(preset, debutPerso, finPerso);

  const quarts = useMemo(
    () => listerQuartsPeriode(debut, fin, selection.length ? selection : undefined),
    [debut, fin, selection]
  );

  /** Une facture par pharmacie : les quarts sont regroupés par pharmacie. */
  const groupes = useMemo(() => {
    const carte = new Map<number, QuartDetaille[]>();
    for (const q of quarts) {
      const liste = carte.get(q.pharmacie_id) ?? [];
      liste.push(q);
      carte.set(q.pharmacie_id, liste);
    }
    return [...carte.entries()]
      .map(([id, liste]) => ({ pharmacie: pharmacies.find((p) => p.id === id), quarts: liste }))
      .filter((g): g is { pharmacie: Pharmacie; quarts: QuartDetaille[] } => !!g.pharmacie);
  }, [quarts, pharmacies]);

  function options(pharmacie: Pharmacie, quartsPharmacie: QuartDetaille[]): OptionsFacture {
    return {
      numero: '—',
      reglages,
      pharmacie,
      periodeDebut: debut,
      periodeFin: fin,
      quarts: quartsPharmacie,
      inclureDeplacement,
      inclurePerDiem,
      hebergement: inclureHebergement ? analyserNombre(hebergements[pharmacie.id] ?? '') : 0,
    };
  }

  function basculerPharmacie(id: number) {
    setSelection((actuelle) =>
      actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]
    );
  }

  async function generer() {
    if (groupes.length === 0) return;
    setEnCours(true);
    try {
      const ids: number[] = [];
      for (const groupe of groupes) {
        const o = { ...options(groupe.pharmacie, groupe.quarts), numero: prochainNumeroFacture() };
        const totaux = calculerTotaux(o);
        const { html } = await genererPdf(o);
        ids.push(
          enregistrerFacture({
            numero: o.numero,
            pharmacie_id: groupe.pharmacie.id,
            pharmacie_nom: groupe.pharmacie.nom,
            pharmacie_adresse: groupe.pharmacie.adresse,
            periode_debut: debut,
            periode_fin: fin,
            total_heures: totaux.totalHeures,
            deplacement_mode: totaux.deplacementMode,
            deplacement_km: totaux.deplacementKm,
            deplacement_taux: totaux.deplacementTaux,
            deplacement_montant: totaux.deplacementMontant,
            per_diem_jours: totaux.perDiemJours,
            per_diem_montant: totaux.perDiemMontant,
            hebergement_montant: totaux.hebergement,
            total: totaux.total,
            html,
          })
        );
      }
      router.replace(`/factures?ids=${ids.join(',')}`);
    } catch (erreur) {
      Alert.alert('Factures non générées', `${erreur}`);
    } finally {
      setEnCours(false);
    }
  }

  const enteteIncomplete = !reglages.nom.trim() || !reglages.permis_opq.trim();

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

      <Separateur />

      {groupes.length === 0 ? (
        <Vide texte="Aucun quart dans cette période : rien à facturer." />
      ) : (
        <>
          <SousTitre>À inclure</SousTitre>
          <Carte>
            <Interrupteur
              label="Déplacement"
              detail="Selon les conditions de chaque pharmacie"
              valeur={inclureDeplacement}
              onChange={setInclureDeplacement}
            />
            <Separateur />
            <Interrupteur
              label="Per diem"
              detail="Jours travaillés × montant de la pharmacie"
              valeur={inclurePerDiem}
              onChange={setInclurePerDiem}
            />
            <Separateur />
            <Interrupteur
              label="Hébergement"
              detail="Montant saisi pour l’occasion"
              valeur={inclureHebergement}
              onChange={setInclureHebergement}
            />
            {inclureHebergement &&
              groupes.map((g) => (
                <Champ
                  key={g.pharmacie.id}
                  label={g.pharmacie.nom}
                  valeur={hebergements[g.pharmacie.id] ?? ''}
                  onChange={(v) =>
                    setHebergements((actuels) => ({ ...actuels, [g.pharmacie.id]: v }))
                  }
                  clavier="decimal-pad"
                  placeholder="0,00"
                />
              ))}
          </Carte>

          <SousTitre>
            {groupes.length > 1 ? `${groupes.length} factures à générer` : 'Facture à générer'}
          </SousTitre>
          {groupes.map((g) => {
            const t = calculerTotaux(options(g.pharmacie, g.quarts));
            return (
              <Carte key={g.pharmacie.id}>
                <Rangee label={g.pharmacie.nom} valeur={argent(t.total)} accent />
                <Doux>
                  {g.quarts.length} quart{g.quarts.length > 1 ? 's' : ''} ·{' '}
                  {heures(t.totalHeures)} · honoraires {argent(t.honoraires)}
                  {t.deplacementMontant > 0 ? ` · déplacement ${argent(t.deplacementMontant)}` : ''}
                  {t.perDiemMontant > 0 ? ` · per diem ${argent(t.perDiemMontant)}` : ''}
                  {t.hebergement > 0 ? ` · hébergement ${argent(t.hebergement)}` : ''}
                </Doux>
              </Carte>
            );
          })}

          {enteteIncomplete && (
            <Text style={styles.avertissement}>
              L’en-tête de facture est incomplète : ajoutez votre nom et votre numéro de permis OPQ
              dans Profil › Vos coordonnées.
            </Text>
          )}

          <Bouton
            titre={
              enCours
                ? 'Génération…'
                : groupes.length > 1
                  ? `Générer les ${groupes.length} factures`
                  : 'Générer la facture'
            }
            onPress={generer}
            desactive={enCours}
          />
        </>
      )}
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
  avertissement: {
    color: couleurs.alerte,
    fontSize: 13,
    marginBottom: espace.m,
  },
});
