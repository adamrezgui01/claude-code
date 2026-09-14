import { Pressable, StyleSheet, Text, View } from 'react-native';

import { statutQuart } from '../db/quarts';
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
  onPress,
  onPressPharmacie,
}: {
  quart: QuartDetaille;
  enConflit?: boolean;
  afficherDate?: boolean;
  onPress: () => void;
  onPressPharmacie?: () => void;
}) {
  const accent = useAccent();
  const statut = statutQuart(quart);
  const duree = heuresTravaillees(quart);
  const debut = quart.heure_debut_reelle || quart.heure_debut;
  const fin = quart.heure_fin_reelle || quart.heure_fin;
  const annule = statut === 'non_effectue';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ligne,
        enConflit && styles.conflit,
        pressed && styles.presse,
      ]}>
      <View style={styles.gauche}>
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
        {statut === 'a_valider' && (
          <View style={styles.etiquette}>
            <Etiquette texte="À valider" ton="alerte" />
          </View>
        )}
        {statut === 'valide' && (
          <View style={styles.etiquette}>
            <Etiquette texte="Validé" ton="succes" />
          </View>
        )}
        {annule && (
          <View style={styles.etiquette}>
            <Etiquette texte="N’a pas eu lieu" ton="attente" />
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
