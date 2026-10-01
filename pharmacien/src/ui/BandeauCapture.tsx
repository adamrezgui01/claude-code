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

import { nomDuSujet } from '../lib/veille/sujets';
import { couleurs, dimensions, espace, graisse, icone, ombreFlottante, typo, useAccent, CIBLE_MIN } from './theme';

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
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') verifier();
    });
    return () => abonnement.remove();
  }, [verifier]);

  if (!source) return null;

  return (
    <View style={styles.bandeau}>
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
        accessibilityRole="button"
        testID="action-principale"
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
          style={styles.cible}>
          <Ionicons name="bookmark-outline" size={icone.courante} color={couleurs.textePrincipal} />
        </Pressable>
      )}

      <Pressable
        onPress={() => {
          definirReglageVeille('veille_consultation_source', 0);
          setSource(null);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('commun.fermer')}
        style={styles.cible}>
        <Ionicons name="close" size={icone.courante} color={couleurs.texteSecondaire} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    position: 'absolute',
    left: espace[3],
    right: espace[3],
    bottom: espace[8] * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    paddingVertical: espace[3],
    paddingHorizontal: dimensions.carte.remplissage,
    // Il flotte au-dessus de l'écran : c'est l'ombre qui le détache, et le
    // contour mauve qui le faisait en plus est retiré.
    ...ombreFlottante,
  },
  texte: { flex: 1 },
  question: { ...typo.subhead, fontWeight: graisse.demi, color: couleurs.textePrincipal },
  source: { ...typo.footnote, color: couleurs.texteSecondaire },
  action: {
    borderRadius: dimensions.bouton.rayon,
    paddingHorizontal: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
    justifyContent: 'center',
  },
  actionTexte: { ...typo.subhead, fontWeight: graisse.demi, color: couleurs.surAccent },
  cible: { minHeight: CIBLE_MIN, minWidth: CIBLE_MIN, alignItems: 'center', justifyContent: 'center' },
  attenue: { opacity: 0.7 },
});
