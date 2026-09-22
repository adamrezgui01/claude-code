import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { noterConsultation } from '../../db/veille';

/**
 * Ouvrir une source, et se souvenir qu'on l'a fait.
 *
 * La consultation est notée avant l'ouverture, quel que soit le navigateur.
 * C'est ce qui permet au bandeau de se déclencher au retour de l'application
 * au premier plan plutôt qu'à la fermeture d'un navigateur intégré : la
 * capture marche donc aussi quand le lien part dans Safari, et le navigateur
 * reste un réglage.
 *
 * Par défaut, les liens s'ouvrent comme avant. Les sources principales sont
 * des PDF — l'INESSS, le PIQ — et dans un navigateur intégré un PDF perd le
 * mode lecture, l'enregistrement dans Fichiers et les identifiants déjà gardés
 * pour une revue payante. Au comptoir, chercher une dose est un geste pressé.
 */
export async function ouvrirSource(source: { id: number; url: string }, navigateurIntegre: boolean) {
  noterConsultation(source.id);
  if (navigateurIntegre) {
    try {
      await WebBrowser.openBrowserAsync(source.url);
      return;
    } catch {
      // Un PDF que le navigateur intégré refuse ne doit pas rester fermé.
    }
  }
  await Linking.openURL(source.url);
}
