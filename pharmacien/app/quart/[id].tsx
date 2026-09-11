import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { creerPharmacie, listerPharmacies } from '../../src/db/pharmacies';
import {
  creerQuart,
  enregistrerRappelQuart,
  listerQuarts,
  modifierQuart,
  obtenirQuart,
  supprimerQuart,
} from '../../src/db/quarts';
import type { Pharmacie, QuartDetaille } from '../../src/db/types';
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
import { couleurs, espace } from '../../src/ui/theme';

export default function FormulaireQuart() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; date?: string; pharmacie?: string }>();
  const nouveau = params.id === 'nouveau';
  const quartId = nouveau ? null : Number(params.id);

  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [pharmacieId, setPharmacieId] = useState<number | null>(
    params.pharmacie ? Number(params.pharmacie) : null
  );
  const [nouvellePharmacie, setNouvellePharmacie] = useState('');
  const [date, setDate] = useState(params.date ?? aujourdhui());
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('17:00');
  const [taux, setTaux] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  const [notes, setNotes] = useState('');
  const [rappelExistant, setRappelExistant] = useState<string | null>(null);

  useEffect(() => {
    const liste = listerPharmacies();
    setPharmacies(liste);

    if (quartId) {
      const q = obtenirQuart(quartId);
      if (q) {
        setPharmacieId(q.pharmacie_id);
        setDate(q.date);
        setHeureDebut(q.heure_debut);
        setHeureFin(q.heure_fin);
        setTaux(`${q.taux_horaire}`);
        setKilometrage(q.kilometrage ? `${q.kilometrage}` : '');
        setNotes(q.notes);
        setRappelExistant(q.notification_id);
      }
    } else {
      // Reprend le taux du dernier quart saisi : il change rarement d'une fois à l'autre.
      const precedents = listerQuarts();
      const dernier = precedents[precedents.length - 1];
      if (dernier) setTaux(`${dernier.taux_horaire}`);
      if (!params.pharmacie && liste.length === 1) setPharmacieId(liste[0].id);
    }
  }, [quartId, params.pharmacie]);

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
      idPharmacie = creerPharmacie({
        nom: nouvellePharmacie.trim(),
        adresse: '',
        contact_nom: '',
        contact_coordonnees: '',
        notes: '',
      });
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
      <View style={styles.puces}>
        {pharmacies.map((p) => (
          <Puce
            key={p.id}
            texte={p.nom}
            actif={p.id === pharmacieId}
            onPress={() => {
              setPharmacieId(p.id);
              setNouvellePharmacie('');
            }}
          />
        ))}
        <Puce
          texte="+ Nouvelle"
          actif={pharmacieId === null}
          onPress={() => setPharmacieId(null)}
        />
      </View>
      {pharmacieId === null && (
        <Champ
          label="Nom de la nouvelle pharmacie"
          valeur={nouvellePharmacie}
          onChange={setNouvellePharmacie}
          placeholder="Pharmacie du Centre"
        />
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
        label="Taux horaire ($)"
        valeur={taux}
        onChange={setTaux}
        clavier="decimal-pad"
        placeholder="0,00"
      />
      <Champ
        label="Kilométrage (km)"
        valeur={kilometrage}
        onChange={setKilometrage}
        clavier="decimal-pad"
        placeholder="0"
      />
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
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
