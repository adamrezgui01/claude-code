import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  categories,
  creerLien,
  modifierLien,
  obtenirLien,
  supprimerLien,
} from '../../src/db/liens';
import { Bouton, Champ, Doux, Ecran, Puce, Section } from '../../src/ui/composants';
import { espace } from '../../src/ui/theme';

export default function FormulaireLien() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const nouveau = params.id === 'nouveau';
  const lienId = nouveau ? null : Number(params.id);

  const [titre, setTitre] = useState('');
  const [url, setUrl] = useState('');
  const [categorie, setCategorie] = useState('');
  const [motsCles, setMotsCles] = useState('');
  /** Vide pour un lien de l'usager ; conservé pour un lien fourni qu'il modifie. */
  const [cle, setCle] = useState('');
  const [existantes] = useState(categories);

  useEffect(() => {
    if (!lienId) return;
    const l = obtenirLien(lienId);
    if (!l) return;
    setTitre(l.titre);
    setUrl(l.url);
    setCategorie(l.categorie);
    setMotsCles(l.motsCles);
    setCle(l.cle);
  }, [lienId]);

  function enregistrer() {
    if (!titre.trim() || !url.trim()) {
      Alert.alert('Il manque quelque chose', 'Un titre et une adresse sont nécessaires.');
      return;
    }
    const entree = {
      // Un lien écrit par l'usager n'a pas de repère de traduction : son titre
      // est le sien, et ne se traduit pas.
      cle,
      titre: titre.trim(),
      url: url.trim(),
      categorie: categorie.trim(),
      motsCles: motsCles.trim(),
    };
    if (lienId) modifierLien(lienId, entree);
    else creerLien(entree);
    router.back();
  }

  function supprimer() {
    if (!lienId) return;
    Alert.alert('Supprimer ce lien ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          supprimerLien(lienId);
          router.back();
        },
      },
    ]);
  }

  return (
    <Ecran>
      <Stack.Screen options={{ title: nouveau ? 'Nouveau lien' : 'Modifier le lien' }} />

      <Section titre="Le signet">
        <Champ nu label="Titre" valeur={titre} onChange={setTitre} />
        <Champ
          nu
          label="Adresse"
          valeur={url}
          onChange={setUrl}
          auto="none"
          placeholder="https://"
        />
      </Section>

      <Section titre="Catégorie">
        <Champ nu label="Nom de la catégorie" valeur={categorie} onChange={setCategorie} />
      </Section>
      {existantes.length > 0 && (
        <View style={styles.puces}>
          {existantes.map((c) => (
            <Puce key={c} texte={c} actif={categorie === c} onPress={() => setCategorie(c)} />
          ))}
        </View>
      )}

      <Section titre="Mots-clés">
        <Champ
          nu
          label="Séparés par des virgules"
          valeur={motsCles}
          onChange={setMotsCles}
          multiligne
        />
      </Section>
      <Doux>
        Ils ne s’affichent jamais, ils servent à retrouver le lien. Écrivez ce à quoi vous pensez
        au comptoir — « cystite » plutôt que le titre officiel du protocole.
      </Doux>

      <View style={styles.actions}>
        <Bouton titre="Enregistrer" onPress={enregistrer} />
        {!nouveau && <Bouton titre="Supprimer" variante="danger" onPress={supprimer} />}
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: espace.xl,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.s,
  },
});
