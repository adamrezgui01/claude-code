import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import {
  creerDocument,
  enregistrerRappelDocument,
  modifierDocument,
  obtenirDocument,
  supprimerDocument,
} from '../../src/db/profil';
import { ajouterJours, aujourdhui } from '../../src/lib/dates';
import { analyserNombre } from '../../src/lib/format';
import { annulerRappel, planifierRappelDocument } from '../../src/lib/notifications';
import {
  Bouton,
  Champ,
  Doux,
  Ecran,
  Fondu,
  SelecteurDate,
} from '../../src/ui/composants';
import { espace } from '../../src/ui/theme';

export default function FormulaireDocument() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const nouveau = params.id === 'nouveau';
  const documentId = nouveau ? null : Number(params.id);

  const [nom, setNom] = useState('');
  const [expiration, setExpiration] = useState(() => ajouterJours(aujourdhui(), 365));
  const [jours, setJours] = useState('30');
  const [rappelExistant, setRappelExistant] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    const d = obtenirDocument(documentId);
    if (d) {
      setNom(d.nom);
      setExpiration(d.date_expiration);
      setJours(`${d.jours_avant_rappel}`);
      setRappelExistant(d.notification_id);
    }
  }, [documentId]);

  async function enregistrer() {
    if (!nom.trim()) {
      Alert.alert('Nom manquant', 'Donnez un nom au document.');
      return;
    }
    const entree = {
      nom: nom.trim(),
      date_expiration: expiration,
      jours_avant_rappel: Math.max(0, Math.round(analyserNombre(jours))),
    };
    const id = documentId ?? creerDocument(entree);
    if (documentId) modifierDocument(documentId, entree);

    await annulerRappel(rappelExistant);
    const rappel = await planifierRappelDocument(entree);
    enregistrerRappelDocument(id, rappel);
    router.back();
  }

  function supprimer() {
    if (!documentId) return;
    Alert.alert('Supprimer ce document ?', 'Le rappel associé sera annulé.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await annulerRappel(rappelExistant);
          supprimerDocument(documentId);
          router.back();
        },
      },
    ]);
  }

  return (
    <Ecran style={styles.contenu}>
      <Stack.Screen options={{ title: nouveau ? 'Nouveau document' : 'Document' }} />

      <Fondu>
      <Champ
        label="Nom"
        valeur={nom}
        onChange={setNom}
        placeholder="Assurance responsabilité"
      />
      <SelecteurDate label="Date d’expiration" valeur={expiration} onChange={setExpiration} />
      <Champ
        label="Rappel (jours avant l’expiration)"
        valeur={jours}
        onChange={setJours}
        clavier="number-pad"
      />
      <Doux>Le rappel est programmé à 9 h, le nombre de jours indiqué avant l’expiration.</Doux>

      <Bouton titre="Enregistrer" onPress={enregistrer} />
      {!nouveau && <Bouton titre="Supprimer" variante="danger" onPress={supprimer} />}
      </Fondu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
    gap: espace.s,
  },
});
