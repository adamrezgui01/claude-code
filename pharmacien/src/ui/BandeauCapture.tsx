import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  definirReglageVeille,
  listerSuivis,
  marquerBandeauVu,
  obtenirSource,
  reglagesVeille,
  suivreSujet,
  sujetsDeLaSource,
} from '../db/veille';
import { useTextes } from '../i18n';
import { doitProposerBandeau, offresBandeau } from '../lib/veille/capture';
import { replanifierVeille } from '../lib/veille/planifier';
import { nomDuSujet } from '../lib/veille/sujets';
import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * Le bandeau de capture.
 *
 * Posé en bas de l'écran au retour d'une consultation, jamais une fenêtre qui
 * bloque. Il porte l'offre principale — écrire ce qu'on retient — et, s'il y a
 * lieu, un sujet à suivre.
 *
 * Il ne se propose qu'une fois par consultation, utilisé ou ignoré. Insister
 * est le plus sûr moyen de le faire couper dans les réglages, et un bandeau
 * coupé ne capture plus rien du tout.
 */
export function BandeauCapture() {
  const { t } = useTextes();
  const router = useRouter();
  const accent = useAccent();
  const [source, setSource] = useState<{ id: number; titre: string } | null>(null);
  const [aSuivre, setASuivre] = useState<{ id: number; nom: string } | null>(null);

  const traduire = useCallback((cle: string) => t(cle), [t]);

  const verifier = useCallback(() => {
    const reglages = reglagesVeille();
    const sourceId = reglages.veille_consultation_source;
    const lien = sourceId ? obtenirSource(sourceId) : null;
    const consultation = lien
      ? {
          sourceId,
          le: Number(reglages.veille_consultation_le || 0),
          vue: !!reglages.veille_consultation_vue,
          captureDesactivee: !!lien.capture_desactivee,
        }
      : null;

    if (!doitProposerBandeau(consultation, Date.now(), !!reglages.veille_bandeau) || !lien) {
      setSource(null);
      return;
    }

    const suivis = new Set(listerSuivis().filter((s) => s.statut === 'actif').map((s) => s.sujet_id));
    const sujets = sujetsDeLaSource(lien.id);
    const offres = offresBandeau(sujets.map((s) => s.id), suivis);
    const premier = sujets.find((s) => s.id === offres.suivre[0]);
    setSource({ id: lien.id, titre: lien.titre });
    setASuivre(premier ? { id: premier.id, nom: nomDuSujet(premier, traduire) } : null);
    marquerBandeauVu();
  }, [traduire]);

  useEffect(() => {
    verifier();
    // Le retour au premier plan sert deux fois : le bandeau, et le recalcul
    // de la notification du soir, qui a pu se périmer pendant l'absence.
    void replanifierVeille();
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') {
        verifier();
        void replanifierVeille();
      }
    });
    return () => abonnement.remove();
  }, [verifier]);

  if (!source) return null;

  return (
    <View style={[styles.bandeau, { borderColor: accent }]}>
      <View style={styles.texte}>
        <Text style={styles.question}>{t('veille.bandeauQuestion')}</Text>
        <Text style={styles.source} numberOfLines={1}>
          {source.titre}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          setSource(null);
          router.push(`/veille/note/nouvelle?source=${source.id}`);
        }}
        style={({ pressed }) => [styles.action, { backgroundColor: accent }, pressed && styles.attenue]}>
        <Text style={styles.actionTexte}>{t('veille.bandeauNote')}</Text>
      </Pressable>

      {!!aSuivre && (
        <Pressable
          onPress={() => {
            suivreSujet(aSuivre.id, 'consultation');
            setASuivre(null);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('veille.bandeauSuivre')}
          hitSlop={8}
          style={styles.secondaire}>
          <Ionicons name="bookmark-outline" size={18} color={accent} />
        </Pressable>
      )}

      <Pressable
        onPress={() => {
          definirReglageVeille('veille_consultation_source', 0);
          setSource(null);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('commun.fermer')}
        hitSlop={10}>
        <Ionicons name="close" size={18} color={couleurs.doux} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    position: 'absolute',
    left: espace.m,
    right: espace.m,
    bottom: espace.xxl * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1.5,
    borderRadius: rayon,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
  },
  texte: { flex: 1 },
  question: { fontSize: 14, fontFamily: police.demi, color: couleurs.texte },
  source: { fontSize: 12, fontFamily: police.normal, color: couleurs.doux },
  action: { borderRadius: rayon, paddingVertical: espace.s, paddingHorizontal: espace.m },
  actionTexte: { fontSize: 13, fontFamily: police.demi, color: '#FFFFFF' },
  secondaire: { padding: espace.xs },
  attenue: { opacity: 0.7 },
});
