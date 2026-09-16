import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

import type { Adresse } from '../db/types';
import { adresseRenseignee, adresseUneLigne, estLocalisee } from './adresses';

/**
 * Distance routière entre le domicile et une pharmacie, et ouverture d'un
 * itinéraire dans l'application de cartes du téléphone.
 *
 * Le calcul passe par OpenRouteService, avec la clé des réglages — la même que
 * pour l'autocomplétion d'adresses. Tout le fournisseur est contenu ici.
 */

export type ResultatDistance = { ok: true; km: number } | { ok: false; raison: string };

const SERVICE = 'https://api.openrouteservice.org/v2/directions/driving-car';

type Point = { latitude: number; longitude: number };

/**
 * Coordonnées d'une adresse. Celles retenues à l'autocomplétion suffisent :
 * on ne géocode que ce qui a été saisi à la main.
 */
async function coordonnees(adresse: Adresse): Promise<Point | null> {
  if (estLocalisee(adresse)) {
    return { latitude: adresse.latitude as number, longitude: adresse.longitude as number };
  }
  const resultats = await Location.geocodeAsync(adresseUneLigne(adresse));
  const premier = resultats[0];
  return premier ? { latitude: premier.latitude, longitude: premier.longitude } : null;
}

export async function calculerDistanceAllerRetour(
  adresseDomicile: Adresse,
  adressePharmacie: Adresse,
  cle: string
): Promise<ResultatDistance> {
  if (!adresseRenseignee(adresseDomicile)) {
    return { ok: false, raison: 'Votre adresse est absente de votre profil.' };
  }
  if (!adresseRenseignee(adressePharmacie)) {
    return { ok: false, raison: 'L’adresse de la pharmacie est vide.' };
  }
  if (!cle.trim()) {
    return { ok: false, raison: 'Aucune clé OpenRouteService dans les réglages.' };
  }

  try {
    // Le géocodeur d'Android exige la permission ; inutile quand les deux
    // adresses portent déjà leurs coordonnées.
    if (
      Platform.OS === 'android' &&
      (!estLocalisee(adresseDomicile) || !estLocalisee(adressePharmacie))
    ) {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        return {
          ok: false,
          raison: 'Android exige l’accès à la localisation pour lire une adresse.',
        };
      }
    }

    const depart = await coordonnees(adresseDomicile);
    const arrivee = await coordonnees(adressePharmacie);
    if (!depart) return { ok: false, raison: 'Votre adresse n’a pas été reconnue.' };
    if (!arrivee) return { ok: false, raison: 'L’adresse de la pharmacie n’a pas été reconnue.' };

    const url =
      `${SERVICE}?api_key=${encodeURIComponent(cle.trim())}` +
      `&start=${depart.longitude},${depart.latitude}` +
      `&end=${arrivee.longitude},${arrivee.latitude}`;

    const reponse = await fetch(url);
    if (!reponse.ok) {
      return {
        ok: false,
        raison: `Le service d’itinéraire a refusé la demande (${reponse.status}). Vérifiez la clé.`,
      };
    }

    const donnees = await reponse.json();
    const metres: unknown = donnees?.features?.[0]?.properties?.summary?.distance;
    if (typeof metres !== 'number') {
      return { ok: false, raison: 'Aucun trajet routier trouvé entre les deux adresses.' };
    }

    return { ok: true, km: Math.round((metres / 1000) * 2) };
  } catch {
    return { ok: false, raison: 'Le calcul a échoué. Vérifiez votre connexion.' };
  }
}

/**
 * Ouvre un itinéraire vers une adresse. Quand plusieurs applications de cartes
 * sont installées, l'usager choisit : on n'en impose aucune.
 */
export async function ouvrirItineraireVers(destination: string) {
  const cible = encodeURIComponent(destination);
  const candidats = [
    { nom: 'Plans', url: `http://maps.apple.com/?daddr=${cible}&dirflg=d`, iosSeulement: true },
    { nom: 'Google Maps', url: `comgooglemaps://?daddr=${cible}&directionsmode=driving` },
    { nom: 'Waze', url: `waze://?q=${cible}&navigate=yes` },
    {
      nom: 'Google Maps',
      url: `https://www.google.com/maps/dir/?api=1&destination=${cible}&travelmode=driving`,
      secours: true,
    },
  ];

  const disponibles: { nom: string; url: string }[] = [];
  for (const candidat of candidats) {
    if (candidat.iosSeulement && Platform.OS !== 'ios') continue;
    if (candidat.secours && disponibles.length > 0) continue;
    try {
      if (candidat.secours || (await Linking.canOpenURL(candidat.url))) {
        disponibles.push({ nom: candidat.nom, url: candidat.url });
      }
    } catch {
      // Schéma non reconnu : l'application n'est pas installée.
    }
  }

  if (disponibles.length === 0) return;
  if (disponibles.length === 1) {
    Linking.openURL(disponibles[0].url);
    return;
  }

  Alert.alert('Obtenir un itinéraire', destination, [
    ...disponibles.map((app) => ({ text: app.nom, onPress: () => Linking.openURL(app.url) })),
    { text: 'Annuler', style: 'cancel' as const },
  ]);
}

/** Ouvre un itinéraire d'une adresse vers une autre. */
export function ouvrirItineraire(depart: string, arrivee: string) {
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?saddr=${encodeURIComponent(depart)}&daddr=${encodeURIComponent(arrivee)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(depart)}&destination=${encodeURIComponent(arrivee)}&travelmode=driving`;
  Linking.openURL(url);
}
