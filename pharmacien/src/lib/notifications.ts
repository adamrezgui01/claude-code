import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DELAI_MEMO_HEURES, finDuQuart } from '../db/quarts';
import type { DocumentProfessionnel, QuartDetaille } from '../db/types';
import { analyserDate, combiner, formatDateCourte } from './dates';

const CANAL = 'rappels';

/** Heures avant le début d'un quart pour le rappel principal. */
export const RAPPEL_PRINCIPAL_HEURES = 48;

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

export async function planifierRappel(
  titre: string,
  corps: string,
  date: Date,
  donnees: Record<string, unknown> = {}
): Promise<string | null> {
  if (date.getTime() <= Date.now()) return null;
  if (!(await demanderPermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: titre, body: corps, data: donnees },
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

export type RappelsQuart = {
  principal: string | null;
  secondaires: string[];
  memo: string | null;
};

function delaiEnTexte(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const heures = minutes / 60;
  return heures === 1 ? '1 heure' : `${Number.isInteger(heures) ? heures : heures.toFixed(1)} heures`;
}

/**
 * Programme les rappels d'un quart : le principal 48 h avant, les secondaires
 * choisis par l'usager, et le mémo deux heures après la fin.
 */
export async function planifierRappelsQuart(
  quart: QuartDetaille,
  delaisSecondaires: number[]
): Promise<RappelsQuart> {
  const debut = combiner(quart.date, quart.heure_debut);
  const horaire = `${quart.heure_debut} à ${quart.heure_fin}`;

  const principal = await planifierRappel(
    'Quart dans 48 h',
    `${quart.pharmacie_nom} — ${horaire}`,
    new Date(debut.getTime() - RAPPEL_PRINCIPAL_HEURES * 3600000),
    { quartId: quart.id }
  );

  const secondaires: string[] = [];
  for (const minutes of delaisSecondaires) {
    const id = await planifierRappel(
      `Quart dans ${delaiEnTexte(minutes)}`,
      `${quart.pharmacie_nom} — ${horaire}`,
      new Date(debut.getTime() - minutes * 60000),
      { quartId: quart.id }
    );
    if (id) secondaires.push(id);
  }

  // Un mémo, pas une demande. Le quart est déjà compté selon ses heures
  // prévues ; l'ignorer ne coûte rien.
  const memo = await planifierRappel(
    'Vos heures ont-elles changé ?',
    `${quart.pharmacie_nom} — ${horaire}. Corrigez-les seulement si elles étaient différentes.`,
    new Date(finDuQuart(quart).getTime() + DELAI_MEMO_HEURES * 3600000),
    { quartId: quart.id, memo: true }
  );

  return { principal, secondaires, memo };
}

/** Rappel à 9 h, le nombre de jours convenu avant l'expiration. */
export async function planifierRappelDocument(
  doc: Omit<DocumentProfessionnel, 'id' | 'notification_id'>
): Promise<string | null> {
  const expiration = analyserDate(doc.date_expiration);
  const rappel = new Date(expiration.getTime() - doc.jours_avant_rappel * 86400000);
  rappel.setHours(9, 0, 0, 0);
  return planifierRappel(
    'Document à renouveler',
    `${doc.nom} expire le ${formatDateCourte(doc.date_expiration)}.`,
    rappel
  );
}
