import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { formatJourCourt } from '../lib/dates';
import type { EtatFacturation } from '../lib/facturation';
import { argent, heures } from '../lib/format';
import { heuresTravaillees } from '../lib/stats';
import { Etiquette } from './composants';
import { couleurs, dimensions, espace, graisse, typo, CIBLE_MIN } from './theme';
import { useTextes } from '../i18n';

export function LigneQuart({
  quart,
  enConflit,
  afficherDate,
  etat,
  enCours,
  onPress,
  onPressPharmacie,
}: {
  quart: QuartDetaille;
  enConflit?: boolean;
  afficherDate?: boolean;
  /**
   * Où en est ce quart. Une seule valeur plutôt que deux drapeaux : deux
   * drapeaux se contredisent, et l'un des deux finit par être oublié à un
   * appel sur quatre.
   */
  etat?: EtatFacturation;
  /**
   * Le quart de maintenant. Il n'a pas d'onglet à lui — il serait vide la
   * quasi-totalité du temps — alors il s'épingle en haut, en rouge.
   */
  enCours?: boolean;
  onPress: () => void;
  onPressPharmacie?: () => void;
}) {
  const { t } = useTextes();
  const duree = heuresTravaillees(quart);
  const debut = quart.heure_debut_reelle || quart.heure_debut;
  const fin = quart.heure_fin_reelle || quart.heure_fin;
  const annule = !!quart.annule;
  const corrige = !!quart.heure_debut_reelle || !!quart.heure_fin_reelle;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.ligne,
        enConflit && styles.conflit,
        pressed && styles.presse,
      ]}>
      <View style={styles.gauche}>
        {enCours && <Text style={styles.maintenant}>{t('horaire.enCours')}</Text>}
        {afficherDate && <Text style={styles.date}>{formatJourCourt(quart.date)}</Text>}
        {/* Le nom ouvre la fiche de la pharmacie. En gras, pas en mauve : ce
            n'est ni l'élément actif ni l'action principale de l'écran. La
            marge de toucher monte sa ligne de texte à 44 points. */}
        <Pressable
          onPress={onPressPharmacie}
          disabled={!onPressPharmacie}
          accessibilityRole={onPressPharmacie ? 'link' : undefined}
          hitSlop={{ top: MARGE_NOM, bottom: MARGE_NOM }}
          style={styles.cibleNom}>
          <Text style={[styles.pharmacie, annule && styles.barre]} numberOfLines={1}>
            {quart.pharmacie_nom}
          </Text>
        </Pressable>
        <Text style={styles.horaire}>
          {debut} – {fin} · {heures(duree)}
          {quart.pause_minutes > 0 && !quart.pause_payee
            ? t('quart.pauseCourte', { minutes: quart.pause_minutes })
            : ''}
        </Text>
        {!!quart.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            {quart.notes}
          </Text>
        )}
        {corrige && !annule && (
          <View style={styles.etiquette}>
            <Etiquette texte={t('quart.heuresCorrigees')} ton="succes" />
          </View>
        )}
        {annule && (
          <View style={styles.etiquette}>
            <Etiquette texte={t('quart.nAPasEuLieu')} ton="attente" />
          </View>
        )}
        {/* Facturé et payé portent la même teinte grise : deux nuances de gris
            ne se comparent pas d'un écran à l'autre. C'est le crochet qui dit
            que l'argent est entré. */}
        {etat === 'facture' && !annule && (
          <View style={styles.etiquette}>
            <Etiquette texte={t('quart.facturePar', { numero: quart.numero_facture })} ton="attente" />
          </View>
        )}
        {etat === 'paye' && !annule && (
          <View style={styles.etiquette}>
            <Etiquette
              texte={t('quart.payePar', { numero: quart.numero_facture })}
              ton="attente"
              icone="checkmark-circle"
            />
          </View>
        )}
        {/* Fait, et pas encore facturé : c'est la seule ligne de la liste sur
            laquelle il reste quelque chose à faire. */}
        {etat === 'aFacturer' && !annule && (
          <View style={styles.etiquette}>
            <Etiquette texte={t('quart.aFacturer')} ton="succes" />
          </View>
        )}
      </View>
      <View style={styles.droite}>
        <Text style={[styles.montant, annule && styles.barre]}>
          {argent(duree * quart.taux_horaire)}
        </Text>
        <Text style={styles.taux}>{argent(quart.taux_horaire)}/h</Text>
        {enConflit && <Text style={styles.alerte}>Chevauchement</Text>}
      </View>
    </Pressable>
  );
}

/** Ce qu'il faut ajouter au-dessus et au-dessous du nom pour faire 44 points. */
const MARGE_NOM = (CIBLE_MIN - typo.headline.lineHeight) / 2;

const styles = StyleSheet.create({
  /*
   * Blanc sur le gris de l'écran, sans contour. Le chevauchement garde son fond
   * rouge pâle ; le quart en cours dit « En cours » en rouge au-dessus du nom,
   * et le cadre rouge qui le répétait est retiré.
   */
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: couleurs.fondEleve,
    borderRadius: dimensions.carte.rayon,
    padding: dimensions.carte.remplissage,
    marginBottom: espace[2],
    gap: espace[3],
    minHeight: CIBLE_MIN,
    minWidth: CIBLE_MIN,
  },
  conflit: {
    backgroundColor: couleurs.alertePale,
  },
  cibleNom: {
    alignSelf: 'flex-start',
    minHeight: typo.headline.lineHeight,
    minWidth: CIBLE_MIN,
  },
  maintenant: {
    ...typo.caption2,
    fontWeight: graisse.grasse,
    color: couleurs.urgent,
    textTransform: 'uppercase',
    marginBottom: espace[1],
  },
  presse: {
    opacity: 0.6,
  },
  gauche: {
    flex: 1,
  },
  droite: {
    alignItems: 'flex-end',
  },
  date: {
    ...typo.caption1,
    color: couleurs.texteSecondaire,
    marginBottom: espace[1],
    textTransform: 'capitalize',
  },
  pharmacie: {
    ...typo.headline,
    color: couleurs.textePrincipal,
  },
  barre: {
    textDecorationLine: 'line-through',
    color: couleurs.texteSecondaire,
  },
  horaire: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
    marginTop: espace[1],
  },
  notes: {
    ...typo.footnote,
    color: couleurs.texteSecondaire,
    marginTop: espace[1],
    fontStyle: 'italic',
  },
  etiquette: {
    marginTop: espace[2],
  },
  montant: {
    ...typo.body,
    fontWeight: graisse.demi,
    color: couleurs.textePrincipal,
  },
  taux: {
    ...typo.caption1,
    color: couleurs.texteSecondaire,
  },
  alerte: {
    ...typo.caption2,
    fontWeight: graisse.demi,
    color: couleurs.alerte,
    marginTop: espace[1],
  },
});
