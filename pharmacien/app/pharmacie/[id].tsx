import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  compterQuartsPharmacie,
  creerPharmacie,
  modifierPharmacie,
  obtenirPharmacie,
  supprimerPharmacie,
} from '../../src/db/pharmacies';
import type { CodeAcces } from '../../src/db/types';
import { ecrireCodes, lireCodes, supprimerCodes } from '../../src/lib/codes';
import { annulerRappels } from '../../src/lib/notifications';
import { Bouton, Champ, Doux, Separateur, SousTitre } from '../../src/ui/composants';
import { couleurs, espace } from '../../src/ui/theme';

export default function FichePharmacie() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const nouvelle = params.id === 'nouvelle';
  const pharmacieId = nouvelle ? null : Number(params.id);

  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactCoordonnees, setContactCoordonnees] = useState('');
  const [notes, setNotes] = useState('');
  const [codes, setCodes] = useState<CodeAcces[]>([]);
  const [codesVisibles, setCodesVisibles] = useState(false);
  const [nombreQuarts, setNombreQuarts] = useState(0);

  useEffect(() => {
    if (!pharmacieId) return;
    const p = obtenirPharmacie(pharmacieId);
    if (p) {
      setNom(p.nom);
      setAdresse(p.adresse);
      setContactNom(p.contact_nom);
      setContactCoordonnees(p.contact_coordonnees);
      setNotes(p.notes);
    }
    setNombreQuarts(compterQuartsPharmacie(pharmacieId));
    lireCodes(pharmacieId).then(setCodes);
  }, [pharmacieId]);

  function modifierCode(index: number, champ: keyof CodeAcces, valeur: string) {
    setCodes((actuels) =>
      actuels.map((c, i) => (i === index ? { ...c, [champ]: valeur } : c))
    );
  }

  async function enregistrer() {
    if (!nom.trim()) {
      Alert.alert('Nom manquant', 'Donnez un nom à la pharmacie.');
      return;
    }
    const entree = {
      nom: nom.trim(),
      adresse: adresse.trim(),
      contact_nom: contactNom.trim(),
      contact_coordonnees: contactCoordonnees.trim(),
      notes: notes.trim(),
    };
    const id = pharmacieId ?? creerPharmacie(entree);
    if (pharmacieId) modifierPharmacie(pharmacieId, entree);
    await ecrireCodes(id, codes);
    router.back();
  }

  function supprimer() {
    if (!pharmacieId) return;
    Alert.alert(
      'Supprimer cette pharmacie ?',
      nombreQuarts > 0
        ? `Ses ${nombreQuarts} quarts et ses codes d'accès seront supprimés aussi.`
        : "Ses codes d'accès seront supprimés aussi.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const rappels = supprimerPharmacie(pharmacieId);
            await annulerRappels(rappels);
            await supprimerCodes(pharmacieId);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: nouvelle ? 'Nouvelle pharmacie' : nom || 'Pharmacie' }} />

      <Champ label="Nom" valeur={nom} onChange={setNom} placeholder="Pharmacie du Centre" />
      <Champ label="Adresse" valeur={adresse} onChange={setAdresse} multiligne />

      <Separateur />
      <SousTitre>Contact principal</SousTitre>
      <Champ label="Nom" valeur={contactNom} onChange={setContactNom} />
      <Champ
        label="Téléphone ou courriel"
        valeur={contactCoordonnees}
        onChange={setContactCoordonnees}
      />

      <Separateur />
      <SousTitre>Notes générales</SousTitre>
      <Champ
        label="Fonctionnement, particularités, stationnement…"
        valeur={notes}
        onChange={setNotes}
        multiligne
      />

      <Separateur />
      <View style={styles.enteteCodes}>
        <SousTitre>Codes d’accès</SousTitre>
        <Pressable onPress={() => setCodesVisibles((v) => !v)} hitSlop={8}>
          <Text style={styles.lien}>{codesVisibles ? 'Masquer' : 'Afficher'}</Text>
        </Pressable>
      </View>
      <Doux>
        Conservés dans le trousseau sécurisé de l’appareil (Keychain ou Keystore), jamais dans la
        base de l’application.
      </Doux>

      <View style={styles.codes}>
        {codes.map((code, i) => (
          <View key={i} style={styles.code}>
            <View style={styles.codeChamps}>
              <Champ
                label="Libellé"
                valeur={code.libelle}
                onChange={(v) => modifierCode(i, 'libelle', v)}
                placeholder="Code de porte"
              />
              <Champ
                label="Valeur"
                valeur={code.valeur}
                onChange={(v) => modifierCode(i, 'valeur', v)}
                masque={!codesVisibles}
              />
            </View>
            <Pressable
              onPress={() => setCodes((actuels) => actuels.filter((_, j) => j !== i))}
              hitSlop={8}>
              <Text style={styles.retirer}>Retirer</Text>
            </Pressable>
          </View>
        ))}
        <Bouton
          titre="Ajouter un code"
          variante="secondaire"
          onPress={() => setCodes((actuels) => [...actuels, { libelle: '', valeur: '' }])}
        />
      </View>

      <View style={styles.actions}>
        <Bouton titre="Enregistrer" onPress={enregistrer} />
        {!nouvelle && (
          <>
            <Bouton
              titre="Ajouter un quart ici"
              variante="secondaire"
              onPress={() => router.push(`/quart/nouveau?pharmacie=${pharmacieId}`)}
            />
            <Bouton titre="Supprimer la pharmacie" variante="danger" onPress={supprimer} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  enteteCodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lien: {
    color: couleurs.accent,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: espace.s,
  },
  codes: {
    marginTop: espace.m,
  },
  code: {
    marginBottom: espace.s,
  },
  codeChamps: {
    gap: 0,
  },
  retirer: {
    color: couleurs.alerte,
    fontSize: 13,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
