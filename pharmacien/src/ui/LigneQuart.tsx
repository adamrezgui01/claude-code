import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { dureeHeures, formatJourCourt } from '../lib/dates';
import { argent, heures } from '../lib/format';
import { couleurs, espace, rayon } from './theme';

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
  const duree = dureeHeures(quart.heure_debut, quart.heure_fin);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ligne, enConflit && styles.conflit, pressed && styles.presse]}>
      <View style={styles.gauche}>
        {afficherDate && <Text style={styles.date}>{formatJourCourt(quart.date)}</Text>}
        <Pressable onPress={onPressPharmacie} disabled={!onPressPharmacie} hitSlop={6}>
          <Text style={[styles.pharmacie, onPressPharmacie && styles.lien]} numberOfLines={1}>
            {quart.pharmacie_nom}
          </Text>
        </Pressable>
        <Text style={styles.horaire}>
          {quart.heure_debut} – {quart.heure_fin} · {heures(duree)}
          {quart.kilometrage > 0 ? ` · ${quart.kilometrage} km` : ''}
        </Text>
        {!!quart.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            {quart.notes}
          </Text>
        )}
      </View>
      <View style={styles.droite}>
        <Text style={styles.montant}>{argent(duree * quart.taux_horaire)}</Text>
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
    padding: espace.m,
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
    color: couleurs.doux,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  pharmacie: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  lien: {
    color: couleurs.accent,
  },
  horaire: {
    fontSize: 13,
    color: couleurs.doux,
    marginTop: 2,
  },
  notes: {
    fontSize: 13,
    color: couleurs.doux,
    marginTop: 2,
    fontStyle: 'italic',
  },
  montant: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  taux: {
    fontSize: 12,
    color: couleurs.doux,
  },
  alerte: {
    fontSize: 11,
    color: couleurs.alerte,
    marginTop: espace.xs,
    fontWeight: '600',
  },
});
