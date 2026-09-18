import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Déverrouillage des identifiants de connexion au logiciel officinal. Ils
 * ouvrent le dossier des patients : ils sont donc masqués tant que l'usager ne
 * s'est pas authentifié.
 *
 * Le repli sur le code de l'appareil quand le visage échoue est géré par le
 * système : il suffit de ne pas le désactiver.
 */
export async function deverrouiller(): Promise<boolean> {
  try {
    const materiel = await LocalAuthentication.hasHardwareAsync();
    const inscrit = await LocalAuthentication.isEnrolledAsync();

    // Sans Face ID ni code configuré, on révèle quand même : enfermer l'usager
    // dehors de ses propres identifiants serait pire que de les montrer.
    if (!materiel || !inscrit) return true;

    const resultat = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Afficher vos identifiants',
      cancelLabel: 'Annuler',
    });
    return resultat.success;
  } catch {
    // Module indisponible — dans Expo Go, par exemple. On ne bloque pas.
    return true;
  }
}
