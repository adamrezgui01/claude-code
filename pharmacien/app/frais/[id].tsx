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
import { useTextes } from '../../src/i18n';

export default function FormulaireFrais() {
  const { t } = useTextes();
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
      Alert.alert(t('frais.descriptionManquante'), t('frais.decrivez'));
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
        t('frais.aucunRecu'),
        t('frais.aucunRecuDetail'),
        [
          { text: t('frais.ajouterRecu'), style: 'cancel' },
          { text: t('frais.enregistrerSansRecu'), onPress: sauver },
        ]
      );
      return;
    }
    sauver();
  }

  function retirer() {
    if (!fraisId) return;
    Alert.alert(t('frais.supprimerConfirme'), t('frais.supprimerDefinitif'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
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
      <Stack.Screen options={{ title: t(nouveau ? 'frais.titreExtra' : 'frais.titreModifier') }} />

      <Fondu>
        {!!pharmacie && <Doux>{t('frais.quartChez', { pharmacie })}</Doux>}

        <View style={styles.espacement}>
          <Champ
            label={t('frais.ceQueVousFacturez')}
            valeur={description}
            onChange={setDescription}
            placeholder={t('frais.ecrivezLibrement')}
            multiligne
          />
          <Champ
            label={t('frais.montant')}
            valeur={montant}
            onChange={setMontant}
            clavier="decimal-pad"
            placeholder={t('commun.montantZero')}
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
                <Text style={styles.retirer}>{t('commun.retirer')}</Text>
              </Pressable>
            </View>
          </Carte>
        ) : (
          <Carte>
            <Doux>{t('frais.recuIncontestable')}</Doux>
            <View style={styles.boutonsPhoto}>
              <Bouton
                titre={t('frais.prendrePhoto')}
                icone={<Ionicons name="camera-outline" size={18} color="#FFFFFF" />}
                onPress={() => ajouterPhoto(true)}
              />
              <Bouton
                titre={t('frais.choisirPellicule')}
                variante="secondaire"
                onPress={() => ajouterPhoto(false)}
              />
            </View>
          </Carte>
        )}

        <View style={styles.actions}>
          <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} />
          {!nouveau && <Bouton titre={t('commun.supprimer')} variante="danger" onPress={retirer} />}
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
