import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  marquerNonEffectue,
  obtenirQuart,
  rappelsDuQuart,
  validerQuart,
} from '../../src/db/quarts';
import type { QuartDetaille } from '../../src/db/types';
import { formatDateLongue } from '../../src/lib/dates';
import { dureePrevue } from '../../src/lib/facture';
import { heures } from '../../src/lib/format';
import { annulerRappel } from '../../src/lib/notifications';
import { Bouton, Carte, Doux, Fondu, SelecteurHeure, Vide } from '../../src/ui/composants';
import { useCompteurs } from '../../src/ui/compteurs';
import { Recompense } from '../../src/ui/Recompense';
import { couleurs, espace, police } from '../../src/ui/theme';

export default function ValiderQuart() {
  const router = useRouter();
  const { rafraichir } = useCompteurs();
  const params = useLocalSearchParams<{ id: string }>();
  const quartId = Number(params.id);

  const [quart, setQuart] = useState<QuartDetaille | null>(null);
  const [ajuste, setAjuste] = useState(false);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [recompense, setRecompense] = useState(false);

  useEffect(() => {
    const q = obtenirQuart(quartId);
    if (!q) return;
    setQuart(q);
    setDebut(q.heure_debut_reelle || q.heure_debut);
    setFin(q.heure_fin_reelle || q.heure_fin);
  }, [quartId]);

  function fermer() {
    rafraichir();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function confirmer(heureDebut: string, heureFin: string) {
    if (!quart) return;
    validerQuart(quartId, heureDebut, heureFin);
    await annulerRappel(quart.notification_validation);
    setRecompense(true);
  }

  async function nEuLieu() {
    if (!quart) return;
    marquerNonEffectue(quartId);
    for (const id of rappelsDuQuart(quart)) await annulerRappel(id);
    fermer();
  }

  if (!quart) {
    return (
      <View style={styles.contenu}>
        <Vide texte="Ce quart n’existe plus." />
      </View>
    );
  }

  const duree = dureePrevue(debut, fin, quart.pause_minutes, !!quart.pause_payee);

  return (
    <View style={styles.cadre}>
      <Stack.Screen options={{ title: 'Valider le quart' }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Fondu>
          <Text style={styles.question}>Votre quart est terminé.</Text>
          <Text style={styles.pharmacie}>{quart.pharmacie_nom}</Text>
          <Doux>{formatDateLongue(quart.date)}</Doux>

          <Carte style={styles.heures}>
            <View style={styles.rangeeHeures}>
              <Ionicons name="time-outline" size={20} color={couleurs.doux} />
              <Text style={styles.horaire}>
                {quart.heure_debut} à {quart.heure_fin}
              </Text>
            </View>
            <Doux>
              {quart.pause_minutes > 0
                ? `Pause de ${quart.pause_minutes} min ${quart.pause_payee ? 'payée' : 'non payée'} · ${heures(duree)} facturables`
                : `${heures(duree)} facturables`}
            </Doux>
          </Carte>

          {ajuste ? (
            <Fondu>
              <View style={styles.rangee}>
                <SelecteurHeure label="Début réel" valeur={debut} onChange={setDebut} />
                <SelecteurHeure label="Fin réelle" valeur={fin} onChange={setFin} />
              </View>
              <Bouton
                titre="Confirmer ces heures"
                variante="succes"
                icone={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                onPress={() => confirmer(debut, fin)}
              />
            </Fondu>
          ) : (
            <View style={styles.actions}>
              <Bouton
                titre="Valider"
                variante="succes"
                icone={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                onPress={() => confirmer(quart.heure_debut, quart.heure_fin)}
              />
              <Bouton
                titre="Modifier les heures"
                variante="secondaire"
                onPress={() => setAjuste(true)}
              />
              <Bouton
                titre="Le quart n’a pas eu lieu"
                variante="danger"
                onPress={nEuLieu}
              />
            </View>
          )}

          <Pressable onPress={fermer} hitSlop={8}>
            <Text style={styles.plusTard}>Revenir à ça plus tard</Text>
          </Pressable>
        </Fondu>
      </ScrollView>

      <Recompense visible={recompense} texte="Quart validé" onFini={fermer} />
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    padding: espace.xl,
    paddingTop: espace.xxl,
  },
  question: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  pharmacie: {
    fontSize: 26,
    fontFamily: police.gras,
    color: couleurs.texte,
    marginTop: espace.xs,
  },
  heures: {
    marginTop: espace.xl,
  },
  rangeeHeures: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    marginBottom: espace.xs,
  },
  horaire: {
    fontSize: 20,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.m,
  },
  plusTard: {
    textAlign: 'center',
    marginTop: espace.xl,
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
