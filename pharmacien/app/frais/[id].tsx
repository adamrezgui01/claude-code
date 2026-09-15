import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { creerFrais, modifierFrais, obtenirFrais, supprimerFrais } from '../../src/db/frais';
import { obtenirQuart } from '../../src/db/quarts';
import { analyserNombre } from '../../src/lib/format';
import { choisirRecu, photographierRecu, supprimerRecu } from '../../src/lib/recus';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Ecran,
  Fondu,
  SousTitre,
} from '../../src/ui/composants';
import { couleurs, espace, police, rayon } from '../../src/ui/theme';

export default function FormulaireFrais() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; quart?: string }>();
  const nouveau = params.id === 'nouveau';
  const fraisId = nouveau ? null : Number(params.id);

  const [quartId, setQuartId] = useState<number | null>(
    params.quart ? Number(params.quart) : null
  );
  const [pharmacie, setPharmacie] = useState('');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    if (fraisId) {
      const f = obtenirFrais(fraisId);
      if (f) {
        setQuartId(f.quart_id);
        setDescription(f.description);
        setMontant(`${f.montant}`);
        setPhoto(f.photo);
      }
    }
  }, [fraisId]);

  useEffect(() => {
    if (!quartId) return;
    const q = obtenirQuart(quartId);
    if (q) setPharmacie(q.pharmacie_nom);
  }, [quartId]);

  async function ajouterPhoto(prendre: boolean) {
    const chemin = prendre ? await photographierRecu() : await choisirRecu();
    if (!chemin) return;
    if (photo) supprimerRecu(photo);
    setPhoto(chemin);
  }

  function enregistrer() {
    if (!quartId) return;
    if (!description.trim()) {
      Alert.alert('Description manquante', 'Décrivez ce que vous facturez.');
      return;
    }
    const entree = {
      quart_id: quartId,
      description: description.trim(),
      montant: analyserNombre(montant),
      photo,
    };

    const sauver = () => {
      if (fraisId) modifierFrais(fraisId, entree);
      else creerFrais(entree);
      router.back();
    };

    if (!photo) {
      Alert.alert(
        'Aucun reçu',
        'Sans reçu, ce frais pourrait être contesté par la pharmacie. Vous pouvez l’enregistrer quand même.',
        [
          { text: 'Ajouter un reçu', style: 'cancel' },
          { text: 'Enregistrer sans reçu', onPress: sauver },
        ]
      );
      return;
    }
    sauver();
  }

  function retirer() {
    if (!fraisId) return;
    Alert.alert('Supprimer ce frais ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          if (photo) supprimerRecu(photo);
          supprimerFrais(fraisId);
          router.back();
        },
      },
    ]);
  }

  return (
    <Ecran>
      <Stack.Screen options={{ title: nouveau ? 'Frais extra' : 'Modifier le frais' }} />

      <Fondu>
        {!!pharmacie && <Doux>Quart chez {pharmacie}</Doux>}

        <View style={styles.espacement}>
          <Champ
            label="Ce que vous facturez"
            valeur={description}
            onChange={setDescription}
            placeholder="Écrivez ce que vous voulez"
            multiligne
          />
          <Champ
            label="Montant ($)"
            valeur={montant}
            onChange={setMontant}
            clavier="decimal-pad"
            placeholder="0,00"
          />
        </View>

        <SousTitre>Reçu</SousTitre>
        {photo ? (
          <Carte>
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
            <View style={styles.actionsPhoto}>
              <Pressable onPress={() => ajouterPhoto(true)} hitSlop={8}>
                <Text style={styles.lien}>Reprendre</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  supprimerRecu(photo);
                  setPhoto('');
                }}
                hitSlop={8}>
                <Text style={styles.retirer}>Retirer</Text>
              </Pressable>
            </View>
          </Carte>
        ) : (
          <Carte>
            <Doux>
              Une photo du reçu rend le frais incontestable. Sans elle, la pharmacie peut le
              refuser.
            </Doux>
            <View style={styles.boutonsPhoto}>
              <Bouton
                titre="Prendre une photo"
                icone={<Ionicons name="camera-outline" size={18} color="#FFFFFF" />}
                onPress={() => ajouterPhoto(true)}
              />
              <Bouton
                titre="Choisir dans la pellicule"
                variante="secondaire"
                onPress={() => ajouterPhoto(false)}
              />
            </View>
          </Carte>
        )}

        <View style={styles.actions}>
          <Bouton titre="Enregistrer" onPress={enregistrer} />
          {!nouveau && <Bouton titre="Supprimer" variante="danger" onPress={retirer} />}
        </View>
      </Fondu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  espacement: {
    marginTop: espace.m,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: rayon,
    backgroundColor: couleurs.fond,
  },
  actionsPhoto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espace.m,
  },
  boutonsPhoto: {
    marginTop: espace.m,
    gap: espace.s,
  },
  lien: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  retirer: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.alerte,
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
