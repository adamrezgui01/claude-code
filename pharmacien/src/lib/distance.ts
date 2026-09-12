import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

/**
 * Calcul de la distance routière entre le domicile et une pharmacie.
 *
 * Deux étapes : les adresses sont converties en coordonnées par le géocodeur du
 * système, sur l'appareil et sans clé ; le trajet lui-même est demandé à
 * OpenRouteService, avec la clé saisie dans les réglages.
 *
 * C'est la seule fonction de l'application qui envoie des données à
 * l'extérieur de l'appareil. Tout le fournisseur d'itinéraire est contenu dans
 * ce fichier : en changer n'affecte rien d'autre.
 */

export type ResultatDistance =
  | { ok: true; km: number }
  | { ok: false; raison: string };

const SERVICE = 'https://api.openrouteservice.org/v2/directions/driving-car';

async function coordonnees(adresse: string): Promise<Location.LocationGeocodedLocation | null> {
  const resultats = await Location.geocodeAsync(adresse);
  return resultats[0] ?? null;
}

export async function calculerDistanceAllerRetour(
  adresseDomicile: string,
  adressePharmacie: string,
  cle: string
): Promise<ResultatDistance> {
  if (!adresseDomicile.trim()) {
    return { ok: false, raison: 'Votre adresse est absente des réglages.' };
  }
  if (!adressePharmacie.trim()) {
    return { ok: false, raison: 'L’adresse de la pharmacie est vide.' };
  }
  if (!cle.trim()) {
    return { ok: false, raison: 'Aucune clé OpenRouteService dans les réglages.' };
  }

  try {
    if (Platform.OS === 'android') {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        return { ok: false, raison: 'Android exige l’accès à la localisation pour lire une adresse.' };
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

/** Ouvre l'itinéraire dans l'application de cartes du téléphone. */
export function ouvrirItineraire(adresseDomicile: string, adressePharmacie: string) {
  const depart = encodeURIComponent(adresseDomicile);
  const arrivee = encodeURIComponent(adressePharmacie);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?saddr=${depart}&daddr=${arrivee}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&origin=${depart}&destination=${arrivee}&travelmode=driving`;
  Linking.openURL(url);
}
