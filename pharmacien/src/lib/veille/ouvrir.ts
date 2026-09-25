import { Linking, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { adresseDouverture } from '../liens';
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
export async function ouvrirSource(
  source: { id: number; url_document: string; url_reference: string },
  navigateurIntegre: boolean
) {
  const adresse = adresseDouverture(source);
  if (!adresse) return;
  noterConsultation(source.id);
  if (navigateurIntegre) {
    try {
      await WebBrowser.openBrowserAsync(adresse);
      return;
    } catch {
      // Un PDF que le navigateur intégré refuse ne doit pas rester fermé.
    }
  }
  await Linking.openURL(adresse);
}

/**
 * Partager un feuillet à remettre au patient.
 *
 * On l'envoie par texto, par courriel, ou on l'imprime — la feuille du système
 * sait faire les trois. L'application n'envoie rien elle-même et ne garde aucune
 * trace de ce qui a été envoyé : elle passe l'adresse au système, et c'est tout.
 */
export async function partagerSource(source: {
  url_document: string;
  url_reference: string;
  titre: string;
}) {
  const adresse = adresseDouverture(source);
  if (!adresse) return;
  try {
    await Share.share({ message: `${source.titre} — ${adresse}`, url: adresse });
  } catch {
    // Feuille de partage refermée, ou refusée par le système : rien à dire.
  }
}

/**
 * La page officielle de la source.
 *
 * C'est elle qu'on rouvre quand on doute qu'un PDF soit encore la bonne
 * version : elle pointe toujours vers la version courante, alors que le
 * fichier, lui, reste en ligne indéfiniment sous son ancien nom.
 */
export async function ouvrirPageOfficielle(source: { url_reference: string }) {
  if (!source.url_reference) return;
  await Linking.openURL(source.url_reference);
}
