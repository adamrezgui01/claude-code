import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { enregistrerFacture, prochainNumeroFacture } from '../src/db/factures';
import { listerFraisPeriode } from '../src/db/frais';
import { listerPharmacies, listerPharmaciesRecentes } from '../src/db/pharmacies';
import { obtenirReglages } from '../src/db/profil';
import { listerQuartsPeriode } from '../src/db/quarts';
import type { FraisExtra, Pharmacie, QuartDetaille } from '../src/db/types';
import { adresseComplete } from '../src/lib/adresses';
import { aujourdhui, debutMois, formatDateCourte } from '../src/lib/dates';
import { calculerTotaux, quartsFacturables, type OptionsFacture } from '../src/lib/facture';
import { bornes, type Preset } from '../src/lib/periodes';
import { genererPdf } from '../src/lib/facturePdf';
import { analyserNombre, argent, heures, pluriel } from '../src/lib/format';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Puce,
  Rangee,
  Separateur,
  SousTitre,
  Vide,
} from '../src/ui/composants';
import { SelecteurDate } from '../src/ui/Selecteurs';
import { SelecteurPharmacie } from '../src/ui/SelecteurPharmacie';
import { couleurs, espace, police } from '../src/ui/theme';

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
  const [inclureFrais, setInclureFrais] = useState(true);
  const [inclureHebergement, setInclureHebergement] = useState(false);
  const [hebergements, setHebergements] = useState<Record<number, string>>({});
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    setPharmacies(listerPharmacies());
    setRecentes(listerPharmaciesRecentes());
  }, []);

  const [debut, fin] = bornes(preset, debutPerso, finPerso);
  const filtre = selection.length ? selection : undefined;

  const quarts = useMemo(() => listerQuartsPeriode(debut, fin, filtre), [debut, fin, filtre]);
  const frais = useMemo(() => listerFraisPeriode(debut, fin, filtre), [debut, fin, filtre]);

  /** Une facture par pharmacie : quarts et frais sont regroupés par pharmacie. */
  const groupes = useMemo(() => {
    const carte = new Map<number, { quarts: QuartDetaille[]; frais: FraisExtra[] }>();
    for (const q of quartsFacturables(quarts)) {
      const entree = carte.get(q.pharmacie_id) ?? { quarts: [], frais: [] };
      entree.quarts.push(q);
      carte.set(q.pharmacie_id, entree);
    }
    for (const f of frais) {
      const entree = carte.get(f.pharmacie_id);
      if (entree) entree.frais.push(f);
    }
    return [...carte.entries()]
      .map(([id, entree]) => ({ pharmacie: pharmacies.find((p) => p.id === id), ...entree }))
      .filter(
        (g): g is { pharmacie: Pharmacie; quarts: QuartDetaille[]; frais: FraisExtra[] } =>
          !!g.pharmacie
      );
  }, [quarts, frais, pharmacies]);

  function options(groupe: {
    pharmacie: Pharmacie;
    quarts: QuartDetaille[];
    frais: FraisExtra[];
  }): OptionsFacture {
    return {
      numero: '—',
      reglages,
      pharmacie: groupe.pharmacie,
      periodeDebut: debut,
      periodeFin: fin,
      quarts: groupe.quarts,
      frais: groupe.frais,
      inclureDeplacement,
      inclurePerDiem,
      inclureFrais,
      hebergement: inclureHebergement
        ? analyserNombre(hebergements[groupe.pharmacie.id] ?? '')
        : 0,
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
        const o = { ...options(groupe), numero: prochainNumeroFacture() };
        const totaux = calculerTotaux(o);
        const { html } = await genererPdf(o);
        ids.push(
          enregistrerFacture({
            numero: o.numero,
            pharmacie_id: groupe.pharmacie.id,
            pharmacie_nom: groupe.pharmacie.nom,
            pharmacie_adresse: adresseComplete(groupe.pharmacie).replace('\n', ', '),
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
            frais_extra_montant: totaux.fraisExtra,
            total: totaux.total,
            statut_paiement: 'en_attente',
            html,
            date_generation: aujourdhui(),
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
  const totalFrais = groupes.reduce(
    (t, g) => t + g.frais.reduce((s, f) => s + f.montant, 0),
    0
  );

  return (
    <Ecran>
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
        <Fondu>
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
              label="Frais extra"
              detail={
                totalFrais > 0 ? `${argent(totalFrais)} sur la période` : 'Aucun frais sur la période'
              }
              valeur={inclureFrais}
              onChange={setInclureFrais}
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
            {groupes.length > 1 ? `${pluriel(groupes.length, 'facture')} à générer` : 'Facture à générer'}
          </SousTitre>
          {groupes.map((g) => {
            const t = calculerTotaux(options(g));
            return (
              <Carte key={g.pharmacie.id}>
                <Rangee label={g.pharmacie.nom} valeur={argent(t.total)} accent />
                <Doux>
                  {pluriel(g.quarts.length, 'quart')} · {heures(t.totalHeures)} ·
                  honoraires {argent(t.honoraires)}
                  {t.deplacementMontant > 0 ? ` · déplacement ${argent(t.deplacementMontant)}` : ''}
                  {t.perDiemMontant > 0 ? ` · per diem ${argent(t.perDiemMontant)}` : ''}
                  {t.fraisExtra > 0 ? ` · frais ${argent(t.fraisExtra)}` : ''}
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
                  ? `Générer les ${pluriel(groupes.length, 'facture')}`
                  : 'Générer la facture'
            }
            onPress={generer}
            desactive={enCours}
          />
        </Fondu>
      )}
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
  avertissement: {
    color: couleurs.alerte,
    fontSize: 13,
    fontFamily: police.normal,
    marginBottom: espace.m,
  },
});
