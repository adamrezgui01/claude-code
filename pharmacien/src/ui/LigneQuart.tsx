import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { formatJourCourt } from '../lib/dates';
import { argent, heures } from '../lib/format';
import { heuresTravaillees } from '../lib/stats';
import { Etiquette } from './composants';
import { couleurs, espace, police, rayon, useAccent } from './theme';

export function LigneQuart({
  quart,
  enConflit,
  afficherDate,
  verrouille,
  enCours,
  onPress,
  onPressPharmacie,
}: {
  quart: QuartDetaille;
  enConflit?: boolean;
  afficherDate?: boolean;
  /** Effectué et facturé : consultable, plus modifiable. */
  verrouille?: boolean;
  /**
   * Le quart de maintenant. Il n'a pas d'onglet à lui — il serait vide la
   * quasi-totalité du temps — alors il s'épingle en haut, en rouge.
   */
  enCours?: boolean;
  onPress: () => void;
  onPressPharmacie?: () => void;
}) {
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
        {enCours && <Text style={styles.maintenant}>En cours</Text>}
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
          {quart.pause_minutes > 0 && !quart.pause_payee ? ` · pause ${quart.pause_minutes} min` : ''}
        </Text>
        {!!quart.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            {quart.notes}
          </Text>
        )}
        {corrige && !annule && (
          <View style={styles.etiquette}>
            <Etiquette texte="Heures corrigées" ton="succes" />
          </View>
        )}
        {annule && (
          <View style={styles.etiquette}>
            <Etiquette texte="N’a pas eu lieu" ton="attente" />
          </View>
        )}
        {verrouille && !annule && (
          <View style={styles.etiquette}>
            <Etiquette texte={`Facturé · ${quart.numero_facture}`} ton="attente" />
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
