import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DocumentProfessionnel, QuartDetaille } from '../db/types';
import { analyserDate, combiner, formatDateCourte } from './dates';

const CANAL = 'rappels';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function preparerNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Rappels',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // Expo Go ne prend pas toujours en charge les notifications locales.
  }
}

export async function demanderPermission(): Promise<boolean> {
  try {
    const actuel = await Notifications.getPermissionsAsync();
    if (actuel.granted) return true;
    const demande = await Notifications.requestPermissionsAsync();
    return demande.granted;
  } catch {
    return false;
  }
}

async function planifier(titre: string, corps: string, date: Date): Promise<string | null> {
  if (date.getTime() <= Date.now()) return null;
  if (!(await demanderPermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: titre, body: corps },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CANAL,
      },
    });
  } catch {
    return null;
  }
}

export async function annulerRappel(notificationId: string | null | undefined) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Le rappel a déjà été déclenché ou supprimé.
  }
}

export async function annulerRappels(ids: string[]) {
  await Promise.all(ids.map(annulerRappel));
}

/** Rappel 24 h avant le début du quart. */
export async function planifierRappelQuart(quart: QuartDetaille): Promise<string | null> {
  const debut = combiner(quart.date, quart.heure_debut);
  const rappel = new Date(debut.getTime() - 24 * 3600000);
  return planifier(
    'Quart demain',
    `${quart.pharmacie_nom} — ${quart.heure_debut} à ${quart.heure_fin}`,
    rappel
  );
}

/** Rappel à 9 h, le nombre de jours convenu avant l'expiration. */
export async function planifierRappelDocument(
  doc: Omit<DocumentProfessionnel, 'id' | 'notification_id'>
): Promise<string | null> {
  const expiration = analyserDate(doc.date_expiration);
  const rappel = new Date(expiration.getTime() - doc.jours_avant_rappel * 86400000);
  rappel.setHours(9, 0, 0, 0);
  return planifier(
    'Document à renouveler',
    `${doc.nom} expire le ${formatDateCourte(doc.date_expiration)}.`,
    rappel
  );
}
