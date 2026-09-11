import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { enregistrerFacture, prochainNumeroFacture } from '../src/db/factures';
import { listerPharmacies } from '../src/db/pharmacies';
import { obtenirReglages } from '../src/db/profil';
import { listerQuartsPeriode } from '../src/db/quarts';
import type { Pharmacie, Reglages } from '../src/db/types';
import { aujourdhui, debutMois, formatDateCourte } from '../src/lib/dates';
import { calculerTotaux, genererPdf, partagerPdf, type OptionsFacture } from '../src/lib/facturePdf';
import { analyserNombre, argent, heures, nombre } from '../src/lib/format';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Puce,
  Rangee,
  SelecteurDate,
  Separateur,
  SousTitre,
  Vide,
} from '../src/ui/composants';
import { couleurs, espace } from '../src/ui/theme';

export default function GenererFacture() {
  const router = useRouter();
  const params = useLocalSearchParams<{ debut?: string; fin?: string; pharmacies?: string }>();

  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [debut, setDebut] = useState(params.debut ?? debutMois(aujourdhui()));
  const [fin, setFin] = useState(params.fin ?? aujourdhui());
  const [selection, setSelection] = useState<number[]>(
    params.pharmacies ? params.pharmacies.split(',').map(Number) : []
  );

  const [kmInclus, setKmInclus] = useState(false);
  const [km, setKm] = useState('');
  const [perDiemInclus, setPerDiemInclus] = useState(false);
  const [perDiemJours, setPerDiemJours] = useState('');
  const [hebergementInclus, setHebergementInclus] = useState(false);
  const [hebergement, setHebergement] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    setReglages(obtenirReglages());
    setPharmacies(listerPharmacies());
  }, []);

  const quarts = useMemo(
    () => listerQuartsPeriode(debut, fin, selection.length ? selection : undefined),
    [debut, fin, selection]
  );

  const kmSaisi = useMemo(() => quarts.reduce((t, q) => t + q.kilometrage, 0), [quarts]);
  const joursTravailles = useMemo(() => new Set(quarts.map((q) => q.date)).size, [quarts]);

  useEffect(() => {
    setKm(kmSaisi ? `${kmSaisi}` : '');
  }, [kmSaisi]);

  useEffect(() => {
    setPerDiemJours(`${joursTravailles}`);
  }, [joursTravailles]);

  const options: OptionsFacture | null = reglages && {
    numero: '—',
    reglages,
    periodeDebut: debut,
    periodeFin: fin,
    quarts,
    pharmaciesNoms: [...new Set(quarts.map((q) => q.pharmacie_nom))],
    kilometrage: { inclus: kmInclus, km: analyserNombre(km), taux: reglages.taux_par_km },
    perDiem: {
      inclus: perDiemInclus,
      jours: Math.round(analyserNombre(perDiemJours)),
      montant: reglages.per_diem_defaut,
    },
    hebergement: { inclus: hebergementInclus, montant: analyserNombre(hebergement) },
  };

  const totaux = options ? calculerTotaux(options) : null;

  function basculerPharmacie(id: number) {
    setSelection((actuelle) =>
      actuelle.includes(id) ? actuelle.filter((x) => x !== id) : [...actuelle, id]
    );
  }

  async function generer() {
    if (!options || !totaux || quarts.length === 0) return;
    setEnCours(true);
    try {
      const numero = prochainNumeroFacture();
      const uri = await genererPdf({ ...options, numero });
      enregistrerFacture({
        numero,
        periode_debut: debut,
        periode_fin: fin,
        pharmacie_ids: JSON.stringify([...new Set(quarts.map((q) => q.pharmacie_id))]),
        pharmacies_noms: options.pharmaciesNoms.join(', '),
        total_heures: totaux.totalHeures,
        kilometrage_inclus: kmInclus ? 1 : 0,
        kilometrage_valeur: options.kilometrage.km,
        kilometrage_taux: options.kilometrage.taux,
        per_diem_inclus: perDiemInclus ? 1 : 0,
        per_diem_jours: options.perDiem.jours,
        per_diem_montant: options.perDiem.montant,
        hebergement_inclus: hebergementInclus ? 1 : 0,
        hebergement_montant: options.hebergement.montant,
        total: totaux.total,
      });
      await partagerPdf(uri);
      router.back();
    } catch (erreur) {
      Alert.alert('Facture non générée', `${erreur}`);
    } finally {
      setEnCours(false);
    }
  }

  if (!reglages || !options || !totaux) return null;

  const enteteIncomplete = !reglages.nom.trim() || !reglages.permis_opq.trim();

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <SousTitre>Période</SousTitre>
      <SelecteurDate label="Du" valeur={debut} onChange={setDebut} />
      <SelecteurDate label="Au" valeur={fin} onChange={setFin} />

      <SousTitre>Pharmacies</SousTitre>
      <View style={styles.puces}>
        <Puce texte="Toutes" actif={selection.length === 0} onPress={() => setSelection([])} />
        {pharmacies.map((p) => (
          <Puce
            key={p.id}
            texte={p.nom}
            actif={selection.includes(p.id)}
            onPress={() => basculerPharmacie(p.id)}
          />
        ))}
      </View>

      <Separateur />

      {quarts.length === 0 ? (
        <Vide texte="Aucun quart dans cette période : rien à facturer." />
      ) : (
        <>
          <SousTitre>À inclure</SousTitre>
          <Carte>
            <Interrupteur
              label="Kilométrage"
              detail={`${nombre(analyserNombre(km))} km × ${argent(reglages.taux_par_km)}`}
              valeur={kmInclus}
              onChange={setKmInclus}
            />
            {kmInclus && (
              <Champ
                label="Kilomètres"
                valeur={km}
                onChange={setKm}
                clavier="decimal-pad"
                placeholder="0"
              />
            )}
            <Separateur />
            <Interrupteur
              label="Per diem"
              detail={`${options.perDiem.jours} j × ${argent(reglages.per_diem_defaut)}`}
              valeur={perDiemInclus}
              onChange={setPerDiemInclus}
            />
            {perDiemInclus && (
              <Champ
                label="Nombre de jours"
                valeur={perDiemJours}
                onChange={setPerDiemJours}
                clavier="number-pad"
              />
            )}
            <Separateur />
            <Interrupteur
              label="Hébergement"
              detail="Montant saisi pour l’occasion"
              valeur={hebergementInclus}
              onChange={setHebergementInclus}
            />
            {hebergementInclus && (
              <Champ
                label="Montant ($)"
                valeur={hebergement}
                onChange={setHebergement}
                clavier="decimal-pad"
                placeholder="0,00"
              />
            )}
          </Carte>

          <SousTitre>Aperçu</SousTitre>
          <Carte>
            <Rangee
              label={`Honoraires (${heures(totaux.totalHeures)})`}
              valeur={argent(totaux.honoraires)}
            />
            {kmInclus && <Rangee label="Kilométrage" valeur={argent(totaux.montantKilometrage)} />}
            {perDiemInclus && <Rangee label="Per diem" valeur={argent(totaux.montantPerDiem)} />}
            {hebergementInclus && (
              <Rangee label="Hébergement" valeur={argent(totaux.montantHebergement)} />
            )}
            <Separateur />
            <Rangee label="Total" valeur={argent(totaux.total)} accent />
            <Doux>
              {quarts.length} quart{quarts.length > 1 ? 's' : ''} · du {formatDateCourte(debut)} au{' '}
              {formatDateCourte(fin)}
            </Doux>
          </Carte>

          {enteteIncomplete && (
            <Text style={styles.avertissement}>
              L’en-tête de facture est incomplète : ajoutez votre nom et votre numéro de permis OPQ
              dans Profil › Réglages.
            </Text>
          )}

          <Bouton
            titre={enCours ? 'Génération…' : 'Générer le PDF et partager'}
            onPress={generer}
            desactive={enCours}
          />
        </>
      )}
    </ScrollView>
  );
}

function Interrupteur({
  label,
  detail,
  valeur,
  onChange,
}: {
  label: string;
  detail: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.interrupteur}>
      <View style={styles.interrupteurTexte}>
        <Text style={styles.interrupteurLabel}>{label}</Text>
        <Doux>{detail}</Doux>
      </View>
      <Switch
        value={valeur}
        onValueChange={onChange}
        trackColor={{ true: couleurs.accent, false: couleurs.bordure }}
      />
    </View>
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
    marginBottom: espace.m,
  },
  interrupteur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    paddingVertical: espace.xs,
  },
  interrupteurTexte: {
    flex: 1,
  },
  interrupteurLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  avertissement: {
    color: couleurs.alerte,
    fontSize: 13,
    marginBottom: espace.m,
  },
});
