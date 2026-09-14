import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * Photos de reçus. Le fichier choisi est recopié dans le dossier de
 * l'application : la pellicule peut être vidée sans emporter la preuve d'un
 * frais déjà facturé.
 */
const DOSSIER = 'recus';

function dossier(): Directory {
  const d = new Directory(Paths.document, DOSSIER);
  if (!d.exists) d.create({ idempotent: true });
  return d;
}

async function conserver(uri: string): Promise<string> {
  const source = new File(uri);
  const extension = source.extension || '.jpg';
  const destination = new File(dossier(), `recu-${Date.now()}${extension}`);
  await source.copy(destination);
  return destination.uri;
}

/** Prend une photo. Retourne son chemin local, ou `null` si l'usager renonce. */
export async function photographierRecu(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const resultat = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (resultat.canceled || !resultat.assets[0]) return null;
  return conserver(resultat.assets[0].uri);
}

/** Choisit une photo déjà prise. */
export async function choisirRecu(): Promise<string | null> {
  const resultat = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (resultat.canceled || !resultat.assets[0]) return null;
  return conserver(resultat.assets[0].uri);
}

export function supprimerRecu(chemin: string) {
  if (!chemin) return;
  try {
    const fichier = new File(chemin);
    if (fichier.exists) fichier.delete();
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}
