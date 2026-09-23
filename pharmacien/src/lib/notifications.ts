import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DELAI_MEMO_HEURES, finDuQuart } from '../db/quarts';
import type { DocumentProfessionnel, QuartDetaille } from '../db/types';
import { texte } from '../i18n';
import { langueCourante } from '../i18n';
import { analyserDate, combiner, formatDateCourte, formatHeure } from './dates';

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
  if (minutes < 60) return texte('notifications.minutes', { count: minutes });
  const heures = minutes / 60;
  return texte('notifications.heure', {
    count: Number.isInteger(heures) ? heures : Number(heures.toFixed(1)),
  });
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
  // Le texte est figé au moment où la notification entre en file : le système
  // garde la phrase, pas une référence vers elle. C'est pour ça que changer
  // de langue oblige à tout reprogrammer.
  const horaire = `${formatHeure(quart.heure_debut, langueCourante())} – ${formatHeure(
    quart.heure_fin,
    langueCourante()
  )}`;

  const principal = await planifierRappel(
    texte('notifications.quartDans48h'),
    texte('notifications.corpsQuart', { pharmacie: quart.pharmacie_nom, horaire }),
    new Date(debut.getTime() - RAPPEL_PRINCIPAL_HEURES * 3600000),
    { quartId: quart.id }
  );

  const secondaires: string[] = [];
  for (const minutes of delaisSecondaires) {
    const id = await planifierRappel(
      texte('notifications.quartDans', { delai: delaiEnTexte(minutes) }),
      texte('notifications.corpsQuart', { pharmacie: quart.pharmacie_nom, horaire }),
      new Date(debut.getTime() - minutes * 60000),
      { quartId: quart.id }
    );
    if (id) secondaires.push(id);
  }

  // Un mémo, pas une demande. Le quart est déjà compté selon ses heures
  // prévues ; l'ignorer ne coûte rien.
  const memo = await planifierRappel(
    texte('notifications.memoTitre'),
    texte('notifications.memoCorps', { pharmacie: quart.pharmacie_nom, horaire }),
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
    texte('notifications.documentTitre'),
    texte('notifications.documentCorps', {
      nom: doc.nom,
      date: formatDateCourte(doc.date_expiration, langueCourante()),
    }),
    rappel
  );
}
