import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listerQuarts } from '../../src/db/quarts';
import type { QuartDetaille } from '../../src/db/types';
import { ajouterMois, aujourdhui, debutMois, formatDateLongue } from '../../src/lib/dates';
import { detecterChevauchements } from '../../src/lib/stats';
import { Calendrier } from '../../src/ui/Calendrier';
import { Bouton, Puce, Vide } from '../../src/ui/composants';
import { LigneQuart } from '../../src/ui/LigneQuart';
import { couleurs, espace, rayon } from '../../src/ui/theme';

export default function Horaire() {
  const router = useRouter();
  const [quarts, setQuarts] = useState<QuartDetaille[]>([]);
  const [vue, setVue] = useState<'calendrier' | 'liste'>('calendrier');
  const [mois, setMois] = useState(() => debutMois(aujourdhui()));
  const [jour, setJour] = useState(() => aujourdhui());

  useFocusEffect(
    useCallback(() => {
      setQuarts(listerQuarts());
    }, [])
  );

  const chevauchements = useMemo(() => detecterChevauchements(quarts), [quarts]);

  const parJour = useMemo(() => {
    const carte = new Map<string, QuartDetaille[]>();
    for (const q of quarts) {
      const liste = carte.get(q.date) ?? [];
      liste.push(q);
      carte.set(q.date, liste);
    }
    return carte;
  }, [quarts]);

  const quartsDuJour = parJour.get(jour) ?? [];
  const aVenir = useMemo(
    () => quarts.filter((q) => q.date >= aujourdhui()),
    [quarts]
  );

  const ouvrirQuart = (id: number) => router.push(`/quart/${id}`);
  const ouvrirPharmacie = (id: number) => router.push(`/pharmacie/${id}`);

  return (
    <ScrollView contentContainerStyle={styles.contenu}>
      <View style={styles.bascule}>
        <Puce texte="Calendrier" actif={vue === 'calendrier'} onPress={() => setVue('calendrier')} />
        <Puce texte="Liste" actif={vue === 'liste'} onPress={() => setVue('liste')} />
      </View>

      {vue === 'calendrier' ? (
        <>
          <Calendrier
            mois={mois}
            quartsParJour={parJour}
            chevauchements={chevauchements}
            jourSelectionne={jour}
            onSelectionner={(iso) => setJour(iso)}
            onChangerMois={(delta) => setMois(ajouterMois(mois, delta))}
          />

          <Text style={styles.jour}>{formatDateLongue(jour)}</Text>
          {quartsDuJour.length === 0 ? (
            <Vide texte="Aucun quart ce jour-là." />
          ) : (
            quartsDuJour.map((q) => (
              <LigneQuart
                key={q.id}
                quart={q}
                enConflit={chevauchements.has(q.id)}
                onPress={() => ouvrirQuart(q.id)}
                onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
              />
            ))
          )}
          <Bouton titre="Ajouter un quart" onPress={() => router.push(`/quart/nouveau?date=${jour}`)} />
        </>
      ) : (
        <>
          <Text style={styles.jour}>À venir</Text>
          {aVenir.length === 0 ? (
            <Vide texte="Aucun quart à venir." />
          ) : (
            aVenir.map((q) => (
              <LigneQuart
                key={q.id}
                quart={q}
                afficherDate
                enConflit={chevauchements.has(q.id)}
                onPress={() => ouvrirQuart(q.id)}
                onPressPharmacie={() => ouvrirPharmacie(q.pharmacie_id)}
              />
            ))
          )}
          <Bouton titre="Ajouter un quart" onPress={() => router.push('/quart/nouveau')} />
        </>
      )}

      <View style={styles.acces}>
        <LienAcces
          icone="stats-chart"
          titre="Statistiques"
          sousTitre="Heures, kilométrage, revenu"
          onPress={() => router.push('/statistiques')}
        />
        <LienAcces
          icone="business"
          titre="Pharmacies"
          sousTitre="Coordonnées et codes d'accès"
          onPress={() => router.push('/pharmacies')}
        />
      </View>
    </ScrollView>
  );
}

function LienAcces({
  icone,
  titre,
  sousTitre,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  sousTitre: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.lien, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icone} size={20} color={couleurs.accent} />
      <View style={styles.lienTexte}>
        <Text style={styles.lienTitre}>{titre}</Text>
        <Text style={styles.lienSousTitre}>{sousTitre}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.doux} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  bascule: {
    flexDirection: 'row',
    marginBottom: espace.m,
  },
  jour: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espace.s,
    marginTop: espace.s,
    textTransform: 'capitalize',
  },
  acces: {
    marginTop: espace.xl,
  },
  lien: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
  },
  lienTexte: {
    flex: 1,
  },
  lienTitre: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  lienSousTitre: {
    fontSize: 13,
    color: couleurs.doux,
  },
});
