import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  delaisSecondaires,
  enregistrerFormation,
  enregistrerReglages,
  listerDocuments,
  obtenirFormation,
  obtenirReglages,
} from '../src/db/profil';
import type { DocumentProfessionnel, Reglages } from '../src/db/types';
import {
  adresseDesReglages,
  adresseRenseignee,
  champsAdresseReglages,
  estLocalisee,
} from '../src/lib/adresses';
import { localiserAdresse } from '../src/lib/adressesRecherche';
import { aujourdhui, formatDateCourte, joursEntre } from '../src/lib/dates';
import { analyserNombre, argent, nombre } from '../src/lib/format';
import {
  Bouton,
  Champ,
  ChampTelephone,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Puce,
  Section,
  Separateur,
  SousTitre,
  Vide,
} from '../src/ui/composants';
import { SelecteurDate } from '../src/ui/Selecteurs';
import { SaisieAdresse } from '../src/ui/SaisieAdresse';
import { couleurs, espace, police, rayon, useAccent } from '../src/ui/theme';

/** Délais proposés pour le rappel secondaire, en minutes. */
const DELAIS = [30, 60, 120, 180];

export default function Profil() {
  const router = useRouter();
  const accent = useAccent();

  const [heuresCompletees, setHeuresCompletees] = useState('0');
  const [heuresRequises, setHeuresRequises] = useState('40');
  const [finPeriode, setFinPeriode] = useState('');
  const [ajusteFormation, setAjusteFormation] = useState(false);

  const [documents, setDocuments] = useState<DocumentProfessionnel[]>([]);

  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const f = obtenirFormation();
      setHeuresCompletees(`${f.heures_completees}`);
      setHeuresRequises(`${f.heures_requises}`);
      setFinPeriode(f.date_fin_periode);
      setDocuments(listerDocuments());
      setReglages(obtenirReglages());
    }, [])
  );

  function modifier<C extends keyof Reglages>(champ: C, valeur: Reglages[C]) {
    setReglages((actuels) => (actuels ? { ...actuels, [champ]: valeur } : actuels));
    setEnregistre(false);
  }

  function basculerDelai(minutes: number) {
    if (!reglages) return;
    const actuels = delaisSecondaires({ ...reglages, rappel_secondaire_actif: 1 });
    const suivants = actuels.includes(minutes)
      ? actuels.filter((d) => d !== minutes)
      : [...actuels, minutes].sort((a, b) => a - b);
    modifier('rappel_delais', JSON.stringify(suivants));
  }

  function sauvegarderFormation() {
    enregistrerFormation({
      heures_completees: analyserNombre(heuresCompletees),
      heures_requises: analyserNombre(heuresRequises),
      date_fin_periode: finPeriode,
    });
    setAjusteFormation(false);
  }

  async function sauvegarderReglages() {
    if (!reglages) return;

    // Une adresse saisie à la main n'a pas de coordonnées : on tente de la
    // situer, sans jamais bloquer l'enregistrement si ça échoue. Les
    // coordonnées évitent ensuite un géocodage à chaque calcul de distance.
    let adresse = adresseDesReglages(reglages);
    if (adresseRenseignee(adresse) && !estLocalisee(adresse)) {
      const point = await localiserAdresse(adresse);
      if (point) adresse = { ...adresse, ...point };
    }

    enregistrerReglages({
      ...reglages,
      ...champsAdresseReglages(adresse),
      nom: reglages.nom.trim(),
      permis_opq: reglages.permis_opq.trim(),
      telephone: reglages.telephone.trim(),
      courriel: reglages.courriel.trim(),
      cle_itineraire: reglages.cle_itineraire.trim(),
    });
    setEnregistre(true);
  }

  if (!reglages) return null;

  const delais = delaisSecondaires({ ...reglages, rappel_secondaire_actif: 1 });

  return (
    <Ecran>
      <SousTitre>Formation continue</SousTitre>
      <Text style={styles.compteur}>
        {nombre(analyserNombre(heuresCompletees))} h / {nombre(analyserNombre(heuresRequises))} h
        {finPeriode ? ` — échéance le ${formatDateCourte(finPeriode)}` : ''}
      </Text>
      {!ajusteFormation ? (
        <Pressable onPress={() => setAjusteFormation(true)} hitSlop={8}>
          <Text style={[styles.lien, { color: accent }]}>Ajuster</Text>
        </Pressable>
      ) : (
        <Fondu style={styles.bloc}>
          <Champ
            label="Heures complétées"
            valeur={heuresCompletees}
            onChange={setHeuresCompletees}
            clavier="decimal-pad"
          />
          <Champ
            label="Heures requises"
            valeur={heuresRequises}
            onChange={setHeuresRequises}
            clavier="decimal-pad"
          />
          <SelecteurDate
            label="Fin de la période de référence"
            valeur={finPeriode || aujourdhui()}
            onChange={setFinPeriode}
          />
          <Bouton titre="Enregistrer" onPress={sauvegarderFormation} />
        </Fondu>
      )}

      <Separateur />

      <SousTitre>Documents professionnels</SousTitre>
      {documents.length === 0 ? (
        <Vide texte="Aucun document suivi." />
      ) : (
        documents.map((d) => {
          const restants = joursEntre(aujourdhui(), d.date_expiration);
          return (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/document/${d.id}`)}
              style={({ pressed }) => [styles.document, pressed && { opacity: 0.6 }]}>
              <View style={styles.documentTexte}>
                <Text style={styles.documentNom}>{d.nom}</Text>
                <Doux>
                  Expire le {formatDateCourte(d.date_expiration)} · rappel {d.jours_avant_rappel} j
                  avant
                </Doux>
              </View>
              <Text style={[styles.restants, restants <= 0 && styles.expire]}>
                {restants <= 0 ? 'Expiré' : `${restants} j`}
              </Text>
            </Pressable>
          );
        })
      )}
      <Pressable onPress={() => router.push('/document/nouveau')} hitSlop={8}>
        <Text style={[styles.lien, { color: accent }]}>Ajouter un document</Text>
      </Pressable>

      <Separateur />

      {/* Ce qui décrit l'usager et ce qui part sur ses factures. */}
      <SousTitre>Informations et facturation</SousTitre>
      <Doux>Vos coordonnées apparaissent en en-tête de chaque facture.</Doux>
      <View style={styles.bloc} />

      <Section titre="Identité">
        <Champ
          nu
          label="Votre nom (pharmacien remplaçant)"
          valeur={reglages.nom}
          onChange={(v) => modifier('nom', v)}
        />
        <Champ
          nu
          label="Numéro de permis OPQ"
          valeur={reglages.permis_opq}
          onChange={(v) => modifier('permis_opq', v)}
        />
      </Section>

      <Section titre="Adresse">
        <SaisieAdresse
          adresse={adresseDesReglages(reglages)}
          onChange={(a) => {
            setReglages((actuels) => (actuels ? { ...actuels, ...champsAdresseReglages(a) } : actuels));
            setEnregistre(false);
          }}
          cle={reglages.cle_itineraire}
        />
      </Section>

      <Section titre="Coordonnées">
        <ChampTelephone
          nu
          label="Téléphone"
          valeur={reglages.telephone}
          onChange={(v) => modifier('telephone', v)}
        />
        <Champ
          nu
          label="Courriel"
          valeur={reglages.courriel}
          onChange={(v) => modifier('courriel', v)}
          clavier="email-address"
        />
        <Champ
          nu
          label="Taux par kilomètre par défaut ($/km)"
          valeur={`${reglages.taux_par_km}`}
          onChange={(v) => modifier('taux_par_km', analyserNombre(v))}
          clavier="decimal-pad"
          aide={`Préremplit une nouvelle fiche de pharmacie, à ${argent(reglages.taux_par_km)} le kilomètre.`}
        />
      </Section>

    </Ecran>
  );
}

const styles = StyleSheet.create({
  compteur: {
    fontSize: 17,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  lien: {
    fontSize: 14,
    fontFamily: police.demi,
    paddingVertical: espace.s,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
    marginTop: espace.s,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bloc: {
    marginTop: espace.m,
    gap: espace.s,
  },
  document: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    paddingVertical: espace.s,
  },
  documentTexte: {
    flex: 1,
  },
  documentNom: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  restants: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  expire: {
    color: couleurs.alerte,
    fontFamily: police.demi,
  },
  apparence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginTop: espace.xl,
  },
  apparenceTexte: {
    flex: 1,
  },
  apparenceTitre: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
});
