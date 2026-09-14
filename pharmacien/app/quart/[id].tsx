import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerFrais } from '../../src/db/frais';
import {
  creerPharmacie,
  listerPharmacies,
  listerPharmaciesRecentes,
  obtenirPharmacie,
  pharmacieVide,
} from '../../src/db/pharmacies';
import { delaisSecondaires, obtenirReglages } from '../../src/db/profil';
import {
  creerQuart,
  enregistrerRappels,
  modifierQuart,
  obtenirQuart,
  quartsDuJour,
  rappelsDuQuart,
  statutQuart,
  supprimerQuart,
} from '../../src/db/quarts';
import type { FraisExtra, ModeDeplacement, Pharmacie } from '../../src/db/types';
import { aujourdhui, dureeHeures } from '../../src/lib/dates';
import { dureePrevue } from '../../src/lib/facture';
import { analyserNombre, argent, heures } from '../../src/lib/format';
import { annulerRappels, planifierRappelsQuart } from '../../src/lib/notifications';
import { verifierQuart } from '../../src/lib/stats';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Fondu,
  Interrupteur,
  Puce,
  SelecteurDate,
  SelecteurHeure,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { useCompteurs } from '../../src/ui/compteurs';
import { SelecteurPharmacie } from '../../src/ui/SelecteurPharmacie';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

const PAUSES = [0, 30, 45, 60];

export default function FormulaireQuart() {
  const router = useRouter();
  const accent = useAccent();
  const { rafraichir } = useCompteurs();
  const params = useLocalSearchParams<{ id: string; date?: string; pharmacie?: string }>();
  const nouveau = params.id === 'nouveau';
  const quartId = nouveau ? null : Number(params.id);

  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [pharmacieId, setPharmacieId] = useState<number | null>(null);
  const [modeDeplacement, setModeDeplacement] = useState<ModeDeplacement>('aucun');
  const [creationPharmacie, setCreationPharmacie] = useState(false);
  const [nouvellePharmacie, setNouvellePharmacie] = useState('');

  const [date, setDate] = useState(params.date ?? aujourdhui());
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('17:00');
  const [pause, setPause] = useState(0);
  const [pausePayee, setPausePayee] = useState(false);
  const [taux, setTaux] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  const [montantFixe, setMontantFixe] = useState('');
  const [notes, setNotes] = useState('');
  const [frais, setFrais] = useState<FraisExtra[]>([]);
  const [statut, setStatut] = useState('a_venir');

  useEffect(() => {
    setPharmacies(listerPharmacies());
    setRecentes(listerPharmaciesRecentes());

    if (quartId) {
      const q = obtenirQuart(quartId);
      if (q) {
        setPharmacieId(q.pharmacie_id);
        setModeDeplacement(q.pharmacie_mode_deplacement);
        setDate(q.date);
        setHeureDebut(q.heure_debut);
        setHeureFin(q.heure_fin);
        setPause(q.pause_minutes);
        setPausePayee(!!q.pause_payee);
        setTaux(`${q.taux_horaire}`);
        setKilometrage(q.kilometrage ? `${q.kilometrage}` : '');
        setMontantFixe(q.montant_fixe_deplacement ? `${q.montant_fixe_deplacement}` : '');
        setNotes(q.notes);
        setStatut(statutQuart(q));
      }
      return;
    }
    if (params.pharmacie) appliquerPharmacie(Number(params.pharmacie));
  }, [quartId, params.pharmacie]);

  useFocusEffect(
    useCallback(() => {
      if (quartId) setFrais(listerFrais(quartId));
    }, [quartId])
  );

  /** Reprend les conditions de la pharmacie : taux, déplacement, pause. */
  function appliquerPharmacie(id: number) {
    setPharmacieId(id);
    setCreationPharmacie(false);
    const p = obtenirPharmacie(id);
    if (!p) return;
    setModeDeplacement(p.mode_deplacement);
    if (p.taux_horaire) setTaux(`${p.taux_horaire}`);
    setPause(p.pause_minutes);
    setPausePayee(!!p.pause_payee);
    setKilometrage(p.mode_deplacement === 'km' && p.distance_km ? `${p.distance_km}` : '');
    setMontantFixe(
      p.mode_deplacement === 'fixe' && p.montant_fixe_deplacement
        ? `${p.montant_fixe_deplacement}`
        : ''
    );
  }

  const duree = dureePrevue(heureDebut, heureFin, pause, pausePayee);
  const totalFrais = frais.reduce((t, f) => t + f.montant, 0);

  async function enregistrer(idPharmacie: number) {
    const entree = {
      pharmacie_id: idPharmacie,
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      taux_horaire: analyserNombre(taux),
      kilometrage: analyserNombre(kilometrage),
      montant_fixe_deplacement: analyserNombre(montantFixe),
      pause_minutes: pause,
      pause_payee: pausePayee ? 1 : 0,
      notes: notes.trim(),
    };

    const id = quartId ?? creerQuart(entree);
    if (quartId) {
      const ancien = obtenirQuart(quartId);
      if (ancien) await annulerRappels(rappelsDuQuart(ancien));
      modifierQuart(quartId, entree);
    }

    const quart = obtenirQuart(id);
    if (quart) {
      const rappels = await planifierRappelsQuart(quart, delaisSecondaires(obtenirReglages()));
      enregistrerRappels(id, rappels.principal, rappels.secondaires, rappels.validation);
    }
    rafraichir();
    router.back();
  }

  async function valider() {
    let idPharmacie = pharmacieId;
    if (!idPharmacie && nouvellePharmacie.trim()) {
      idPharmacie = creerPharmacie(
        pharmacieVide(nouvellePharmacie.trim(), obtenirReglages().taux_par_km)
      );
    }
    if (!idPharmacie) {
      Alert.alert('Pharmacie manquante', 'Choisissez une pharmacie ou créez-en une.');
      return;
    }
    const retenue = idPharmacie;
    if (dureeHeures(heureDebut, heureFin) === 0) {
      Alert.alert('Horaire invalide', 'L’heure de fin doit être différente de l’heure de début.');
      return;
    }

    const autres = quartsDuJour(date).filter((q) => q.id !== quartId);
    const verification = verifierQuart(
      { date, heure_debut: heureDebut, heure_fin: heureFin, pharmacie_id: retenue },
      autres
    );

    if (verification.type === 'chevauchement') {
      const autre = verification.autre;
      Alert.alert(
        'Ces deux quarts se chevauchent',
        `${autre.pharmacie_nom}, ${autre.heure_debut} à ${autre.heure_fin}. Que voulez-vous faire ?`,
        [
          { text: 'Modifier ce quart-ci', style: 'cancel' },
          { text: 'Ouvrir l’autre quart', onPress: () => router.replace(`/quart/${autre.id}`) },
          { text: 'Enregistrer quand même', onPress: () => enregistrer(retenue) },
        ]
      );
      return;
    }

    if (verification.type === 'serre') {
      Alert.alert(
        'Trajet serré',
        `Il ne reste que ${verification.minutes} minutes entre ce quart et celui de ${verification.autre.pharmacie_nom}. Êtes-vous certain d’avoir le temps de vous déplacer ?`,
        [
          { text: 'Corriger', style: 'cancel' },
          { text: 'Enregistrer', onPress: () => enregistrer(retenue) },
        ]
      );
      return;
    }

    await enregistrer(retenue);
  }

  function supprimer() {
    if (!quartId) return;
    Alert.alert('Supprimer ce quart ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const quart = obtenirQuart(quartId);
          if (quart) await annulerRappels(rappelsDuQuart(quart));
          supprimerQuart(quartId);
          rafraichir();
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: nouveau ? 'Nouveau quart' : 'Modifier le quart' }} />

      {statut === 'a_valider' && (
        <Fondu>
          <Bouton
            titre="Valider ce quart"
            icone={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            onPress={() => router.replace(`/validation/${quartId}`)}
          />
          <View style={styles.espacement} />
        </Fondu>
      )}

      <SousTitre>Pharmacie</SousTitre>
      <SelecteurPharmacie
        pharmacies={pharmacies}
        recentes={recentes}
        selection={pharmacieId ? [pharmacieId] : []}
        onSelectionner={appliquerPharmacie}
        enTete={
          <Puce
            texte="+ Nouvelle pharmacie"
            actif={creationPharmacie}
            onPress={() => {
              setCreationPharmacie((c) => !c);
              setPharmacieId(null);
            }}
          />
        }
      />
      {creationPharmacie && (
        <View style={styles.espacement}>
          <Champ
            label="Nom de la nouvelle pharmacie"
            valeur={nouvellePharmacie}
            onChange={setNouvellePharmacie}
            placeholder="Nom de la pharmacie"
            aide="Son adresse et ses conditions se remplissent ensuite dans sa fiche."
          />
        </View>
      )}

      <Separateur />

      <SelecteurDate label="Date" valeur={date} onChange={setDate} />
      <View style={styles.rangee}>
        <SelecteurHeure label="Début" valeur={heureDebut} onChange={setHeureDebut} />
        <SelecteurHeure label="Fin" valeur={heureFin} onChange={setHeureFin} />
      </View>

      <Text style={styles.label}>Pause repas</Text>
      <View style={styles.puces}>
        {PAUSES.map((minutes) => (
          <Puce
            key={minutes}
            texte={minutes === 0 ? 'Aucune' : `${minutes} min`}
            actif={pause === minutes}
            onPress={() => setPause(minutes)}
          />
        ))}
      </View>
      {pause > 0 && (
        <Interrupteur
          label="Pause payée"
          detail={pausePayee ? 'Incluse dans les heures' : 'Déduite des heures facturées'}
          valeur={pausePayee}
          onChange={setPausePayee}
        />
      )}

      <Text style={styles.duree}>
        Durée facturable : {heures(duree)}
        {heureFin <= heureDebut ? ' (quart de nuit)' : ''}
      </Text>

      <Champ
        label="Taux horaire ($/h)"
        valeur={taux}
        onChange={setTaux}
        clavier="decimal-pad"
        placeholder="0,00"
      />

      {modeDeplacement === 'km' && (
        <Champ
          label="Kilométrage (km)"
          valeur={kilometrage}
          onChange={setKilometrage}
          clavier="decimal-pad"
          placeholder="0"
        />
      )}
      {modeDeplacement === 'fixe' && (
        <Champ
          label="Déplacement ($)"
          valeur={montantFixe}
          onChange={setMontantFixe}
          clavier="decimal-pad"
          placeholder="0,00"
        />
      )}

      <Champ label="Notes" valeur={notes} onChange={setNotes} multiligne />

      {!nouveau && (
        <>
          <Separateur />
          <SousTitre>Frais extra</SousTitre>
          {frais.length === 0 ? (
            <Doux>Rien de facturé en plus des heures pour ce quart.</Doux>
          ) : (
            frais.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => router.push(`/frais/${f.id}`)}
                style={({ pressed }) => [styles.frais, pressed && { opacity: 0.6 }]}>
                <View style={styles.fraisTexte}>
                  <Text style={styles.fraisDescription}>{f.description || 'Frais'}</Text>
                  {!f.photo && <Doux>Sans reçu</Doux>}
                </View>
                <Text style={styles.fraisMontant}>{argent(f.montant)}</Text>
              </Pressable>
            ))
          )}
          {totalFrais > 0 && (
            <Text style={[styles.total, { color: accent }]}>Total des frais {argent(totalFrais)}</Text>
          )}
          <Bouton
            titre="Charger quelque chose en plus"
            variante="secondaire"
            icone={<Ionicons name="add" size={18} color={couleurs.texte} />}
            onPress={() => router.push(`/frais/nouveau?quart=${quartId}`)}
          />
        </>
      )}

      <Carte style={styles.note}>
        <Doux>
          Un rappel part 48 h avant le quart, et une demande de validation 2 h après sa fin.
        </Doux>
      </Carte>

      <View style={styles.actions}>
        <Bouton titre="Enregistrer" onPress={valider} />
        {!nouveau && <Bouton titre="Supprimer le quart" variante="danger" onPress={supprimer} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  espacement: {
    marginTop: espace.m,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  duree: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginVertical: espace.m,
  },
  frais: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
    gap: espace.m,
  },
  fraisTexte: {
    flex: 1,
  },
  fraisDescription: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  fraisMontant: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  total: {
    fontSize: 14,
    fontFamily: police.demi,
    marginBottom: espace.m,
  },
  note: {
    marginTop: espace.l,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.s,
  },
});
