import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  creerPharmacie,
  listerPharmacies,
  listerPharmaciesRecentes,
  obtenirPharmacie,
  pharmacieVide,
} from '../../src/db/pharmacies';
import { obtenirReglages } from '../../src/db/profil';
import {
  creerQuart,
  enregistrerRappelQuart,
  listerQuarts,
  modifierQuart,
  obtenirQuart,
  supprimerQuart,
} from '../../src/db/quarts';
import type { ModeDeplacement, Pharmacie, QuartDetaille } from '../../src/db/types';
import { aujourdhui, combiner, dureeHeures } from '../../src/lib/dates';
import { analyserNombre, heures } from '../../src/lib/format';
import { annulerRappel, planifierRappelQuart } from '../../src/lib/notifications';
import {
  Bouton,
  Champ,
  Doux,
  Puce,
  SelecteurDate,
  SelecteurHeure,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { SelecteurPharmacie } from '../../src/ui/SelecteurPharmacie';
import { couleurs, espace } from '../../src/ui/theme';

export default function FormulaireQuart() {
  const router = useRouter();
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
  const [taux, setTaux] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  const [montantFixe, setMontantFixe] = useState('');
  const [notes, setNotes] = useState('');
  const [rappelExistant, setRappelExistant] = useState<string | null>(null);

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
        setTaux(`${q.taux_horaire}`);
        setKilometrage(q.kilometrage ? `${q.kilometrage}` : '');
        setMontantFixe(q.montant_fixe_deplacement ? `${q.montant_fixe_deplacement}` : '');
        setNotes(q.notes);
        setRappelExistant(q.notification_id);
      }
      return;
    }

    if (params.pharmacie) appliquerPharmacie(Number(params.pharmacie));
  }, [quartId, params.pharmacie]);

  /** Reprend les conditions de la pharmacie : taux, distance ou forfait. */
  function appliquerPharmacie(id: number) {
    setPharmacieId(id);
    setCreationPharmacie(false);
    const p = obtenirPharmacie(id);
    if (!p) return;
    setModeDeplacement(p.mode_deplacement);
    if (p.taux_horaire) setTaux(`${p.taux_horaire}`);
    setKilometrage(p.mode_deplacement === 'km' && p.distance_km ? `${p.distance_km}` : '');
    setMontantFixe(
      p.mode_deplacement === 'fixe' && p.montant_fixe_deplacement
        ? `${p.montant_fixe_deplacement}`
        : ''
    );
  }

  const duree = dureeHeures(heureDebut, heureFin);

  function chevauche(): QuartDetaille | null {
    const debut = combiner(date, heureDebut).getTime();
    const fin = debut + duree * 3600000;
    for (const autre of listerQuarts()) {
      if (autre.id === quartId) continue;
      const autreDebut = combiner(autre.date, autre.heure_debut).getTime();
      const autreFin = autreDebut + dureeHeures(autre.heure_debut, autre.heure_fin) * 3600000;
      if (debut < autreFin && autreDebut < fin) return autre;
    }
    return null;
  }

  async function enregistrer(idPharmacie: number) {
    const entree = {
      pharmacie_id: idPharmacie,
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      taux_horaire: analyserNombre(taux),
      kilometrage: analyserNombre(kilometrage),
      montant_fixe_deplacement: analyserNombre(montantFixe),
      notes: notes.trim(),
    };

    const id = quartId ?? creerQuart(entree);
    if (quartId) modifierQuart(quartId, entree);

    await annulerRappel(rappelExistant);
    const quart = obtenirQuart(id);
    if (quart) {
      const rappel = await planifierRappelQuart(quart);
      enregistrerRappelQuart(id, rappel);
    }
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
    if (duree === 0) {
      Alert.alert('Horaire invalide', 'L’heure de fin doit être différente de l’heure de début.');
      return;
    }

    const conflit = chevauche();
    if (conflit) {
      Alert.alert(
        'Chevauchement',
        `Ce quart en chevauche un autre : ${conflit.pharmacie_nom}, ${conflit.heure_debut} – ${conflit.heure_fin}.`,
        [
          { text: 'Corriger', style: 'cancel' },
          { text: 'Enregistrer quand même', onPress: () => enregistrer(retenue) },
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
          await annulerRappel(rappelExistant);
          supprimerQuart(quartId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: nouveau ? 'Nouveau quart' : 'Modifier le quart' }} />

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
          />
          <Doux>
            Elle sera créée avec ce nom. Ses conditions de facturation se remplissent depuis sa
            fiche.
          </Doux>
        </View>
      )}

      <Separateur />

      <SelecteurDate label="Date" valeur={date} onChange={setDate} />
      <View style={styles.rangee}>
        <SelecteurHeure label="Début" valeur={heureDebut} onChange={setHeureDebut} />
        <SelecteurHeure label="Fin" valeur={heureFin} onChange={setHeureFin} />
      </View>
      <Text style={styles.duree}>
        Durée : {heures(duree)}
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
      {modeDeplacement === 'aucun' && !!pharmacieId && (
        <Doux>Cette pharmacie ne rembourse pas le déplacement.</Doux>
      )}

      <Champ label="Notes" valeur={notes} onChange={setNotes} multiligne />

      <Doux>Un rappel est programmé 24 h avant le début du quart.</Doux>

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
  duree: {
    fontSize: 14,
    color: couleurs.doux,
    marginBottom: espace.m,
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
