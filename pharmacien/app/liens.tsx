import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  filtrerLiens,
  listerLiens,
  parCategorie,
  type Lien as LienSignet,
} from '../src/db/liens';
import { SECTIONS, type Lien } from '../src/content/liens';
import { Bouton, Doux, Ecran, Fondu, SousTitre, Vide } from '../src/ui/composants';
import { couleurs, espace, police, rayon, useAccent } from '../src/ui/theme';
import { useTextes } from '../src/i18n';

function ouvrir(lien: Lien) {
  const url = lien.type === 'tel' ? `tel:${lien.valeur.replace(/[^\d+]/g, '')}` : lien.valeur;
  Linking.openURL(url);
}

function LigneLien({ lien }: { lien: Lien }) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() => ouvrir(lien)}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons
        name={lien.type === 'tel' ? 'call' : 'open-outline'}
        size={18}
        color={accent}
      />
      <View style={styles.texte}>
        <Text style={styles.libelle}>{lien.libelle}</Text>
        {!!lien.detail && <Text style={styles.detail}>{lien.detail}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={couleurs.doux} />
    </Pressable>
  );
}

function LigneSignet({ signet, onModifier }: { signet: LienSignet; onModifier: () => void }) {
  const accent = useAccent();
  return (
    <Pressable
      onPress={() => Linking.openURL(signet.url)}
      onLongPress={onModifier}
      delayLongPress={400}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.6 }]}>
      <Ionicons name="open-outline" size={18} color={accent} />
      <View style={styles.texte}>
        <Text style={styles.libelle}>{signet.titre}</Text>
      </View>
      <Pressable onPress={onModifier} hitSlop={12}>
        <Ionicons name="ellipsis-horizontal" size={18} color={couleurs.doux} />
      </Pressable>
    </Pressable>
  );
}

export default function Liens() {
  const { t } = useTextes();
  const router = useRouter();
  const [signets, setSignets] = useState<LienSignet[]>([]);
  const [recherche, setRecherche] = useState('');

  useFocusEffect(
    useCallback(() => {
      setSignets(listerLiens());
    }, [])
  );

  const cherche = recherche.trim().length > 0;
  // La recherche porte aussi sur les mots-clés cachés : l'usager pense à la
  // maladie, pas au titre officiel du document.
  const groupes = useMemo(
    () => parCategorie(filtrerLiens(signets, recherche)),
    [signets, recherche]
  );

  return (
    <Ecran>
      <View style={styles.recherche}>
        <Ionicons name="search" size={16} color={couleurs.doux} />
        <TextInput
          style={styles.saisie}
          value={recherche}
          onChangeText={setRecherche}
          placeholder={t('liens.chercher')}
          placeholderTextColor={couleurs.doux}
          autoCorrect={false}
          returnKeyType="search"
        />
        {cherche && (
          <Pressable onPress={() => setRecherche('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={couleurs.doux} />
          </Pressable>
        )}
      </View>

      {groupes.length === 0 ? (
        <Vide texte={t('liens.aucunSignet')} />
      ) : (
        groupes.map((groupe) => (
          <Fondu key={groupe.categorie}>
            <SousTitre>{groupe.categorie}</SousTitre>
            {groupe.liens.map((signet) => (
              <LigneSignet
                key={signet.id}
                signet={signet}
                onModifier={() => router.push(`/lien/${signet.id}`)}
              />
            ))}
            <View style={styles.espace} />
          </Fondu>
        ))
      )}

      <Bouton
        titre={t('liens.ajouterLien')}
        variante="secondaire"
        icone={<Ionicons name="add" size={18} color={couleurs.texte} />}
        onPress={() => router.push('/lien/nouveau')}
      />
      <Doux>{t('liens.appuiLong')}</Doux>

      {!cherche &&
        SECTIONS.map((section) => (
          <View key={section.titre} style={styles.section}>
            <SousTitre>{section.titre}</SousTitre>
            {section.liens.map((lien) => (
              <LigneLien key={lien.libelle} lien={lien} />
            ))}
          </View>
        ))}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingHorizontal: espace.m,
    minHeight: 44,
    marginBottom: espace.l,
  },
  saisie: {
    flex: 1,
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
    paddingVertical: espace.s,
  },
  section: {
    marginTop: espace.xl,
  },
  espace: {
    height: espace.m,
  },
  ligne: {
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
  texte: {
    flex: 1,
  },
  libelle: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  detail: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
});
