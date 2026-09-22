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
} from '../../src/ui/composants';
import { SelecteurDate } from '../../src/ui/Selecteurs';
import { espace } from '../../src/ui/theme';
import { useTextes } from '../../src/i18n';

export default function FormulaireDocument() {
  const { t } = useTextes();
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
      Alert.alert(t('document.nomManquant'), t('document.nomManquantDetail'));
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
    Alert.alert(t('document.supprimerConfirme'), t('document.supprimerRappel'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
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
        label={t('document.nom')}
        valeur={nom}
        onChange={setNom}
        placeholder={t('document.exempleNom')}
      />
      <SelecteurDate label={t('document.expiration')} valeur={expiration} onChange={setExpiration} />
      <Champ
        label={t('document.rappelJours')}
        valeur={jours}
        onChange={setJours}
        clavier="number-pad"
      />
      <Doux>{t('document.rappelAide')}</Doux>

      <Bouton titre={t('commun.enregistrer')} onPress={enregistrer} />
      {!nouveau && <Bouton titre={t('commun.supprimer')} variante="danger" onPress={supprimer} />}
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
