import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { formatJourCourt } from '../lib/dates';
import type { EtatFacturation } from '../lib/facturation';
import { argent, heures } from '../lib/format';
import { heuresTravaillees } from '../lib/stats';
import { Etiquette } from './composants';
import { couleurs, espace, police, rayon, useAccent } from './theme';
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
  const accent = useAccent();
  const duree = heuresTravaillees(quart);
  const debut = quart.heure_debut_reelle || quart.heure_debut;
  const fin = quart.heure_fin_reelle || quart.heure_fin;
  const annule = !!quart.annule;
  const corrige = !!quart.heure_debut_reelle || !!quart.heure_fin_reelle;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ligne,
        enConflit && styles.conflit,
        enCours && styles.enCours,
        pressed && styles.presse,
      ]}>
      <View style={styles.gauche}>
        {enCours && <Text style={styles.maintenant}>{t('horaire.enCours')}</Text>}
        {afficherDate && <Text style={styles.date}>{formatJourCourt(quart.date)}</Text>}
        <Pressable onPress={onPressPharmacie} disabled={!onPressPharmacie} hitSlop={6}>
          <Text
            style={[
              styles.pharmacie,
              onPressPharmacie && { color: accent },
              annule && styles.barre,
            ]}
            numberOfLines={1}>
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

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.l,
    marginBottom: espace.s,
    gap: espace.m,
  },
  conflit: {
    borderColor: couleurs.alerte,
    backgroundColor: couleurs.alertePale,
  },
  enCours: {
    borderColor: couleurs.urgent,
    borderWidth: 2,
  },
  maintenant: {
    fontSize: 11,
    fontFamily: police.gras,
    color: couleurs.urgent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
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
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  pharmacie: {
    fontSize: 16,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  barre: {
    textDecorationLine: 'line-through',
    color: couleurs.doux,
  },
  horaire: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: 2,
  },
  notes: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginTop: 2,
    fontStyle: 'italic',
  },
  etiquette: {
    marginTop: espace.s,
  },
  montant: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  taux: {
    fontSize: 12,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  alerte: {
    fontSize: 11,
    fontFamily: police.demi,
    color: couleurs.alerte,
    marginTop: espace.xs,
  },
});
