import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  compterQuartsPharmacie,
  creerPharmacie,
  modifierPharmacie,
  obtenirPharmacie,
  supprimerPharmacie,
  type EntreePharmacie,
} from '../../src/db/pharmacies';
import { obtenirReglages } from '../../src/db/profil';
import { LOGICIELS, type CodeAcces, type ModeDeplacement } from '../../src/db/types';
import { ecrireCodes, ecrireIdentifiants, lireCodes, lireIdentifiants, supprimerSecrets } from '../../src/lib/codes';
import { calculerDistanceAllerRetour, ouvrirItineraire } from '../../src/lib/distance';
import { analyserNombre } from '../../src/lib/format';
import { annulerRappels } from '../../src/lib/notifications';
import {
  Bouton,
  Champ,
  Doux,
  Puce,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { couleurs, espace } from '../../src/ui/theme';

const MODES: { valeur: ModeDeplacement; texte: string }[] = [
  { valeur: 'aucun', texte: 'Aucun' },
  { valeur: 'km', texte: 'Au kilomètre' },
  { valeur: 'fixe', texte: 'Montant fixe' },
];

export default function FichePharmacie() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const nouvelle = params.id === 'nouvelle';
  const pharmacieId = nouvelle ? null : Number(params.id);

  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [contactCourriel, setContactCourriel] = useState('');
  const [notes, setNotes] = useState('');

  const [tauxHoraire, setTauxHoraire] = useState('');
  const [perDiem, setPerDiem] = useState('');
  const [mode, setMode] = useState<ModeDeplacement>('aucun');
  const [distance, setDistance] = useState('');
  const [tauxParKm, setTauxParKm] = useState('');
  const [montantFixe, setMontantFixe] = useState('');
  const [calculEnCours, setCalculEnCours] = useState(false);

  const [logicielChoisi, setLogicielChoisi] = useState('');
  const [logicielAutre, setLogicielAutre] = useState('');
  const [utilisateur, setUtilisateur] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [codes, setCodes] = useState<CodeAcces[]>([]);
  const [secretsVisibles, setSecretsVisibles] = useState(false);
  const [nombreQuarts, setNombreQuarts] = useState(0);

  const [reglages] = useState(obtenirReglages);

  useEffect(() => {
    if (!pharmacieId) {
      setTauxParKm(`${reglages.taux_par_km}`);
      return;
    }
    const p = obtenirPharmacie(pharmacieId);
    if (p) {
      setNom(p.nom);
      setAdresse(p.adresse);
      setContactNom(p.contact_nom);
      setContactTelephone(p.contact_telephone);
      setContactCourriel(p.contact_courriel);
      setNotes(p.notes);
      setTauxHoraire(p.taux_horaire ? `${p.taux_horaire}` : '');
      setPerDiem(p.per_diem ? `${p.per_diem}` : '');
      setMode(p.mode_deplacement);
      setDistance(p.distance_km ? `${p.distance_km}` : '');
      setTauxParKm(`${p.taux_par_km || reglages.taux_par_km}`);
      setMontantFixe(p.montant_fixe_deplacement ? `${p.montant_fixe_deplacement}` : '');
      if (LOGICIELS.includes(p.logiciel as (typeof LOGICIELS)[number])) {
        setLogicielChoisi(p.logiciel);
      } else if (p.logiciel) {
        setLogicielChoisi('Autre');
        setLogicielAutre(p.logiciel);
      }
    }
    setNombreQuarts(compterQuartsPharmacie(pharmacieId));
    lireCodes(pharmacieId).then(setCodes);
    lireIdentifiants(pharmacieId).then((i) => {
      setUtilisateur(i.utilisateur);
      setMotDePasse(i.motDePasse);
    });
  }, [pharmacieId, reglages.taux_par_km]);

  const logiciel = logicielChoisi === 'Autre' ? logicielAutre.trim() : logicielChoisi;

  function modifierCode(index: number, champ: keyof CodeAcces, valeur: string) {
    setCodes((actuels) => actuels.map((c, i) => (i === index ? { ...c, [champ]: valeur } : c)));
  }

  async function calculer() {
    setCalculEnCours(true);
    const resultat = await calculerDistanceAllerRetour(
      reglages.adresse,
      adresse,
      reglages.cle_itineraire
    );
    setCalculEnCours(false);

    if (resultat.ok) {
      setDistance(`${resultat.km}`);
      return;
    }
    Alert.alert('Distance non calculée', resultat.raison, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Ouvrir dans Plans',
        onPress: () => ouvrirItineraire(reglages.adresse, adresse),
      },
    ]);
  }

  async function enregistrer() {
    if (!nom.trim()) {
      Alert.alert('Nom manquant', 'Donnez un nom à la pharmacie.');
      return;
    }
    const entree: EntreePharmacie = {
      nom: nom.trim(),
      adresse: adresse.trim(),
      contact_nom: contactNom.trim(),
      contact_telephone: contactTelephone.trim(),
      contact_courriel: contactCourriel.trim(),
      notes: notes.trim(),
      logiciel,
      taux_horaire: analyserNombre(tauxHoraire),
      per_diem: analyserNombre(perDiem),
      mode_deplacement: mode,
      distance_km: mode === 'km' ? analyserNombre(distance) : 0,
      taux_par_km: mode === 'km' ? analyserNombre(tauxParKm) : 0,
      montant_fixe_deplacement: mode === 'fixe' ? analyserNombre(montantFixe) : 0,
    };
    const id = pharmacieId ?? creerPharmacie(entree);
    if (pharmacieId) modifierPharmacie(pharmacieId, entree);
    await ecrireCodes(id, codes);
    await ecrireIdentifiants(id, { utilisateur: utilisateur.trim(), motDePasse });
    router.back();
  }

  function supprimer() {
    if (!pharmacieId) return;
    Alert.alert(
      'Supprimer cette pharmacie ?',
      nombreQuarts > 0
        ? `Ses ${nombreQuarts} quarts, ses codes et ses identifiants seront supprimés aussi.`
        : 'Ses codes et ses identifiants seront supprimés aussi.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const rappels = supprimerPharmacie(pharmacieId);
            await annulerRappels(rappels);
            await supprimerSecrets(pharmacieId);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: nouvelle ? 'Nouvelle pharmacie' : nom || 'Pharmacie' }} />

      <Champ label="Nom" valeur={nom} onChange={setNom} placeholder="Nom de la pharmacie" />
      <Champ
        label="Adresse"
        valeur={adresse}
        onChange={setAdresse}
        placeholder="123 rue Principale, Montréal"
        multiligne
      />

      <Separateur />
      <SousTitre>Contact principal</SousTitre>
      <Champ label="Nom de la personne contact" valeur={contactNom} onChange={setContactNom} />
      <Champ
        label="Téléphone"
        valeur={contactTelephone}
        onChange={setContactTelephone}
        clavier="phone-pad"
      />
      {!!contactTelephone.trim() && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${contactTelephone.replace(/[^\d+]/g, '')}`)}
          hitSlop={8}>
          <Text style={styles.lien}>Appeler</Text>
        </Pressable>
      )}
      <Champ
        label="Courriel"
        valeur={contactCourriel}
        onChange={setContactCourriel}
        clavier="email-address"
      />

      <Separateur />
      <SousTitre>Conditions de facturation</SousTitre>
      <Champ
        label="Taux horaire habituel ($/h)"
        valeur={tauxHoraire}
        onChange={setTauxHoraire}
        clavier="decimal-pad"
        placeholder="0,00"
      />
      <Champ
        label="Per diem ($/jour)"
        valeur={perDiem}
        onChange={setPerDiem}
        clavier="decimal-pad"
        placeholder="0,00"
      />
      <Text style={styles.label}>Remboursement du déplacement</Text>
      <View style={styles.puces}>
        {MODES.map((m) => (
          <Puce
            key={m.valeur}
            texte={m.texte}
            actif={mode === m.valeur}
            onPress={() => setMode(m.valeur)}
          />
        ))}
      </View>

      {mode === 'km' && (
        <>
          <Champ
            label="Distance aller-retour (km)"
            valeur={distance}
            onChange={setDistance}
            clavier="decimal-pad"
            placeholder="0"
          />
          <Bouton
            titre={calculEnCours ? 'Calcul…' : 'Calculer la distance'}
            variante="secondaire"
            onPress={calculer}
            desactive={calculEnCours}
          />
          <Doux>
            Le calcul envoie votre adresse et celle de la pharmacie au service d’itinéraire. C’est
            la seule fonction de l’application qui sort de l’appareil.
          </Doux>
          <View style={styles.espacement} />
          <Champ
            label="Taux par kilomètre ($/km)"
            valeur={tauxParKm}
            onChange={setTauxParKm}
            clavier="decimal-pad"
          />
        </>
      )}

      {mode === 'fixe' && (
        <Champ
          label="Montant par quart ($)"
          valeur={montantFixe}
          onChange={setMontantFixe}
          clavier="decimal-pad"
          placeholder="0,00"
        />
      )}

      <Separateur />
      <SousTitre>Notes générales</SousTitre>
      <Champ
        label="Fonctionnement, particularités, stationnement…"
        valeur={notes}
        onChange={setNotes}
        multiligne
      />

      <Separateur />
      <View style={styles.enteteSection}>
        <SousTitre>Accès</SousTitre>
        <Pressable onPress={() => setSecretsVisibles((v) => !v)} hitSlop={8}>
          <Text style={styles.lien}>{secretsVisibles ? 'Masquer' : 'Afficher'}</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Logiciel</Text>
      <View style={styles.puces}>
        {[...LOGICIELS, 'Autre'].map((l) => (
          <Puce
            key={l}
            texte={l}
            actif={logicielChoisi === l}
            onPress={() => setLogicielChoisi(logicielChoisi === l ? '' : l)}
          />
        ))}
      </View>
      {logicielChoisi === 'Autre' && (
        <Champ label="Nom du logiciel" valeur={logicielAutre} onChange={setLogicielAutre} />
      )}

      <Champ label="Utilisateur" valeur={utilisateur} onChange={setUtilisateur} masque={!secretsVisibles} />
      <Champ label="Mot de passe" valeur={motDePasse} onChange={setMotDePasse} masque={!secretsVisibles} />
      <Doux>
        {logiciel
          ? `Identifiants ${logiciel}. Conservés dans le trousseau sécurisé de l’appareil (Keychain), jamais dans la base de l’application.`
          : 'Choisissez le logiciel utilisé dans cette pharmacie.'}
      </Doux>

      <View style={styles.espacement} />
      <Text style={styles.label}>Codes d’accès (porte, alarme…)</Text>
      {codes.map((code, i) => (
        <View key={i}>
          <Champ
            label="Libellé"
            valeur={code.libelle}
            onChange={(v) => modifierCode(i, 'libelle', v)}
            placeholder="Code de porte"
          />
          <Champ
            label="Valeur"
            valeur={code.valeur}
            onChange={(v) => modifierCode(i, 'valeur', v)}
            masque={!secretsVisibles}
          />
          <Pressable
            onPress={() => setCodes((actuels) => actuels.filter((_, j) => j !== i))}
            hitSlop={8}>
            <Text style={styles.retirer}>Retirer</Text>
          </Pressable>
        </View>
      ))}
      <Bouton
        titre="Ajouter un code"
        variante="secondaire"
        onPress={() => setCodes((actuels) => [...actuels, { libelle: '', valeur: '' }])}
      />

      <View style={styles.actions}>
        <Bouton titre="Enregistrer" onPress={enregistrer} />
        {!nouvelle && (
          <>
            <Bouton
              titre="Ajouter un quart ici"
              variante="secondaire"
              onPress={() => router.push(`/quart/nouveau?pharmacie=${pharmacieId}`)}
            />
            <Bouton titre="Supprimer la pharmacie" variante="danger" onPress={supprimer} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  enteteSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: espace.m,
  },
  lien: {
    color: couleurs.accent,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: espace.s,
  },
  retirer: {
    color: couleurs.alerte,
    fontSize: 13,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: espace.m,
  },
  espacement: {
    height: espace.m,
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
