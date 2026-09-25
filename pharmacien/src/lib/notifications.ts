import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { QuartDetaille } from '../db/types';
import { texte } from '../i18n';
import { langueCourante } from '../i18n';
import { combiner, formatHeure } from './dates';

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
 * Programme les rappels d'un quart : **seulement** ceux que l'usager a réglés
 * lui-même, à l'avance qu'il a choisie.
 *
 * C'est la seule notification automatique qui reste hors du rendez-vous du
 * soir, et c'est voulu : celle-là, l'usager l'a demandée, parce qu'il lui faut
 * deux heures de route ou une heure pour déposer un enfant. La noyer dans le
 * rendez-vous la rendrait inutile.
 *
 * Le rappel de 48 h et le mémo de fin de quart, eux, sont partis là-bas : ils
 * n'ont jamais été demandés par personne, et c'est exactement ce qui faisait
 * quatre vibrations dans une soirée de novembre.
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

  // Les colonnes `notification_id` et `notification_memo` restent en base et
  // reçoivent `null` : la base d'un usager ne se réécrit pas pour si peu.
  return { principal: null, secondaires, memo: null };
}
