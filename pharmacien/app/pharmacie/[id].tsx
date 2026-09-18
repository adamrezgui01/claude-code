import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  compterQuartsPharmacie,
  creerPharmacie,
  definirAEviter,
  definirFavori,
  modifierPharmacie,
  obtenirPharmacie,
  supprimerPharmacie,
  type EntreePharmacie,
} from '../../src/db/pharmacies';
import { obtenirReglages } from '../../src/db/profil';
import { LOGICIELS, type Adresse, type CodeAcces, type ModeDeplacement } from '../../src/db/types';
import {
  adresseDesReglages,
  adresseRenseignee,
  adresseUneLigne,
  adresseVide,
  estLocalisee,
} from '../../src/lib/adresses';
import { localiserAdresse } from '../../src/lib/adressesRecherche';
import {
  ecrireCodes,
  ecrireIdentifiants,
  lireCodes,
  lireIdentifiants,
  supprimerSecrets,
} from '../../src/lib/codes';
import {
  calculerSiPossible,
  distanceConnue,
  ouvrirItineraireVers,
} from '../../src/lib/distance';
import { analyserNombre, pluriel } from '../../src/lib/format';
import { deverrouiller } from '../../src/lib/deverrouillage';
import { annulerRappels } from '../../src/lib/notifications';
import {
  Bouton,
  Carte,
  Champ,
  ChampTelephone,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Onglets,
  Puce,
  Section,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { SaisieAdresse } from '../../src/ui/SaisieAdresse';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

const MODES: { valeur: ModeDeplacement; texte: string }[] = [
  { valeur: 'aucun', texte: 'Aucun' },
  { valeur: 'km', texte: 'Au kilomètre' },
  { valeur: 'fixe', texte: 'Montant fixe' },
];

const PAUSES = [0, 30, 45, 60];

export default function FichePharmacie() {
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{ id: string }>();
  const nouvelle = params.id === 'nouvelle';
  const pharmacieId = nouvelle ? null : Number(params.id);

  const [reglages] = useState(obtenirReglages);
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState<Adresse>(adresseVide);
  const [contactNom, setContactNom] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [contactCourriel, setContactCourriel] = useState('');
  const [notes, setNotes] = useState('');

  const [tauxHoraire, setTauxHoraire] = useState('');
  const [perDiem, setPerDiem] = useState('');
  const [pause, setPause] = useState(0);
  const [pausePayee, setPausePayee] = useState(false);
  const [mode, setMode] = useState<ModeDeplacement>('aucun');
  const [distance, setDistance] = useState('');
  const [tauxParKm, setTauxParKm] = useState('');
  const [montantFixe, setMontantFixe] = useState('');
  const [calculEnCours, setCalculEnCours] = useState(false);
  const [echecCalcul, setEchecCalcul] = useState('');
  /** L'aller-retour reste la valeur par défaut : c'est le cas courant. */
  const [allerRetour, setAllerRetour] = useState(true);

  const [logicielChoisi, setLogicielChoisi] = useState('');
  const [logicielAutre, setLogicielAutre] = useState('');
  const [utilisateur, setUtilisateur] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [nip, setNip] = useState('');
  const [codes, setCodes] = useState<CodeAcces[]>([]);
  /**
   * Les identifiants restent masqués tant que l'usager ne s'est pas
   * authentifié : ils ouvrent le dossier des patients. Le déverrouillage ne
   * dure que le temps passé sur la fiche.
   */
  const [secretsVisibles, setSecretsVisibles] = useState(false);
  const [lieuDeploye, setLieuDeploye] = useState(false);
  const [nombreQuarts, setNombreQuarts] = useState(0);
  const [favori, setFavori] = useState(false);
  const [aEviter, setAEviter] = useState(false);

  /**
   * Ajouter une pharmacie n'arrive qu'une fois par pharmacie : la saisie se
   * découpe en pages courtes plutôt qu'en un mur de champs. Consulter une fiche
   * existante arrive souvent, alors on peut y sauter d'une page à l'autre au
   * lieu de la parcourir en marche forcée.
   */
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!pharmacieId) {
      setTauxParKm(`${reglages.taux_par_km}`);
      return;
    }
    const p = obtenirPharmacie(pharmacieId);
    if (p) {
      setNom(p.nom);
      setAdresse({
        numero_civique: p.numero_civique,
        rue: p.rue,
        local: p.local,
        code_postal: p.code_postal,
        ville: p.ville,
        province: p.province,
        latitude: p.latitude,
        longitude: p.longitude,
      });
      setContactNom(p.contact_nom);
      setContactTelephone(p.contact_telephone);
      setContactCourriel(p.contact_courriel);
      setNotes(p.notes);
      setTauxHoraire(p.taux_horaire ? `${p.taux_horaire}` : '');
      setPerDiem(p.per_diem ? `${p.per_diem}` : '');
      setPause(p.pause_minutes);
      setPausePayee(!!p.pause_payee);
      setFavori(!!p.favori);
      setAEviter(!!p.a_eviter);
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
      setNip(i.nip);
    });
  }, [pharmacieId, reglages.taux_par_km]);

  const logiciel = logicielChoisi === 'Autre' ? logicielAutre.trim() : logicielChoisi;

  function modifierCode(index: number, champ: keyof CodeAcces, valeur: string) {
    setCodes((actuels) => actuels.map((c, i) => (i === index ? { ...c, [champ]: valeur } : c)));
  }

  // Mémorisé : recréé à chaque rendu, il redonnerait un `calculer` neuf à
  // chaque rendu, et l'effet plus bas tournerait sans fin.
  const domicile = useMemo(() => adresseDesReglages(reglages), [reglages]);
  const sansDomicile = !adresseRenseignee(domicile);

  const calculer = useCallback(
    async (silencieux: boolean) => {
      if (sansDomicile) return;
      setCalculEnCours(true);
      setEchecCalcul('');
      const resultat = await calculerSiPossible(
        domicile,
        adresse,
        reglages.cle_itineraire,
        allerRetour
      );
      setCalculEnCours(false);
      if (!resultat) return;
      if (resultat.ok) {
        setDistance(`${resultat.km}`);
        return;
      }
      // Un calcul lancé tout seul ne doit pas interrompre l'usager ; un calcul
      // demandé, oui.
      if (silencieux) {
        setEchecCalcul(resultat.raison);
        return;
      }
      Alert.alert('Distance non calculée', resultat.raison, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir dans Plans', onPress: () => ouvrirItineraireVers(adresseUneLigne(adresse)) },
      ]);
    },
    [adresse, allerRetour, domicile, reglages.cle_itineraire, sansDomicile]
  );

  /**
   * Dès que l'adresse suffit, la distance se calcule d'elle-même : c'est à
   * l'application de le faire, pas à l'usager d'y penser. Le calcul repart
   * quand l'adresse change, et une seule fois par adresse — c'est ce repère,
   * et non la distance obtenue, qui empêche l'effet de se rappeler lui-même.
   */
  const adresseCalculee = useRef('');
  const distanceActuelle = useRef(distance);
  distanceActuelle.current = distance;

  useEffect(() => {
    if (mode !== 'km' || sansDomicile) return;
    if (!adresseRenseignee(adresse)) return;
    const repereAdresse = adresseUneLigne(adresse);
    if (adresseCalculee.current === repereAdresse) return;
    if (distanceConnue(analyserNombre(distanceActuelle.current))) {
      // Distance déjà connue pour cette adresse : rien à refaire, mais on la
      // retient pour qu'un changement d'adresse relance le calcul.
      adresseCalculee.current = repereAdresse;
      return;
    }
    adresseCalculee.current = repereAdresse;
    void calculer(true);
  }, [mode, adresse, sansDomicile, calculer]);

  async function enregistrer() {
    if (!nom.trim()) {
      Alert.alert('Nom manquant', 'Donnez un nom à la pharmacie.');
      return;
    }

    // Une adresse saisie à la main n'a pas de coordonnées : on tente de la
    // situer, sans jamais bloquer l'enregistrement si ça échoue.
    let situee = adresse;
    if (!estLocalisee(adresse)) {
      const point = await localiserAdresse(adresse);
      if (point) situee = { ...adresse, ...point };
    }

    const entree: EntreePharmacie = {
      nom: nom.trim(),
      ...situee,
      contact_nom: contactNom.trim(),
      contact_telephone: contactTelephone.trim(),
      contact_courriel: contactCourriel.trim(),
      notes: notes.trim(),
      logiciel,
      taux_horaire: analyserNombre(tauxHoraire),
      per_diem: analyserNombre(perDiem),
      pause_minutes: pause,
      pause_payee: pausePayee ? 1 : 0,
      mode_deplacement: mode,
      distance_km: mode === 'km' ? analyserNombre(distance) : 0,
      taux_par_km: mode === 'km' ? analyserNombre(tauxParKm) : 0,
      montant_fixe_deplacement: mode === 'fixe' ? analyserNombre(montantFixe) : 0,
      favori: favori ? 1 : 0,
      a_eviter: aEviter ? 1 : 0,
    };

    const id = pharmacieId ?? creerPharmacie(entree);
    if (pharmacieId) modifierPharmacie(pharmacieId, entree);
    await ecrireCodes(id, codes);
    await ecrireIdentifiants(id, { utilisateur: utilisateur.trim(), motDePasse, nip: nip.trim() });
    router.back();
  }

  function supprimer() {
    if (!pharmacieId) return;
    Alert.alert(
      'Supprimer cette pharmacie ?',
      nombreQuarts > 0
        ? `Ses ${pluriel(nombreQuarts, 'quart')}, ses codes et ses identifiants seront supprimés aussi.`
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

  /** Bascule appliquée tout de suite : c'est un geste, pas un formulaire. */
  function basculerFavori() {
    const prochain = !favori;
    setFavori(prochain);
    if (prochain) setAEviter(false);
    if (pharmacieId) definirFavori(pharmacieId, prochain);
  }

  function basculerAEviter() {
    const prochain = !aEviter;
    setAEviter(prochain);
    if (prochain) setFavori(false);
    if (pharmacieId) definirAEviter(pharmacieId, prochain);
  }

  const PAGES = ['Identité', 'Contact', 'Conditions'];
  const derniere = page === PAGES.length - 1;

  return (
    <Ecran>
      <Stack.Screen options={{ title: nouvelle ? 'Nouvelle pharmacie' : nom || 'Pharmacie' }} />

      {/* Sur une fiche existante, on saute à la page voulue : on vient souvent
          chercher un code d'accès, pas remplir un formulaire. À la création,
          aucun repère de progression — un « étape 1 sur 3 » donne une
          impression de corvée. */}
      {!nouvelle && (
        <Onglets
          options={PAGES.map((titre, i) => ({ valeur: `${i}`, texte: titre }))}
          valeur={`${page}`}
          onChange={(v) => setPage(Number(v))}
        />
      )}

      <Fondu key={page}>
        {page === 0 && (
          <>
            {/*
              Une seule barre, en haut, pour les commerces comme pour les
              adresses. Choisir une pharmacie remplit l'adresse et propose son
              nom ; le champ du nom reste libre, parce que la bannière
              d'OpenStreetMap — « Jean Coutu » — n'est pas le nom légal, qui est
              celui du pharmacien propriétaire et qui va sur la facture.
              Les résultats proches de chez l'usager remontent en premier.
            */}
            <SaisieAdresse
              adresse={adresse}
              onChange={setAdresse}
              onNom={(trouve) => {
                if (!nom.trim()) setNom(trouve);
              }}
              libelle="Rechercher"
              invite="Nom de la pharmacie ou adresse"
              cle={reglages.cle_itineraire}
              foyer={
                reglages.adresse_latitude !== null && reglages.adresse_longitude !== null
                  ? { lat: reglages.adresse_latitude, lon: reglages.adresse_longitude }
                  : undefined
              }
              apresRecherche={
                <Champ
                  label="Nom"
                  valeur={nom}
                  onChange={setNom}
                  placeholder="Nom de la pharmacie"
                  aide="Celui qui paraîtra sur vos factures."
                />
              }
            />

            {!nouvelle && !estLocalisee(adresse) && (
              <Carte style={styles.avis}>
                <Doux>
                  Cette adresse n’a pas pu être située : la pharmacie n’apparaît pas sur la carte.
                  Corrigez-la ci-dessus et enregistrez de nouveau.
                </Doux>
              </Carte>
            )}
            {estLocalisee(adresse) && (
              <Bouton
                titre="Obtenir un itinéraire"
                variante="secondaire"
                icone={<Ionicons name="navigate-outline" size={18} color={couleurs.texte} />}
                onPress={() => ouvrirItineraireVers(adresseUneLigne(adresse))}
              />
            )}

            {!nouvelle && (
              <>
                <Separateur />
                <View style={styles.reperes}>
                  <Pressable
                    onPress={basculerFavori}
                    style={({ pressed }) => [
                      styles.repere,
                      favori && { borderColor: couleurs.favori, backgroundColor: couleurs.favoriPale },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Ionicons
                      name={favori ? 'star' : 'star-outline'}
                      size={18}
                      color={favori ? couleurs.favori : couleurs.doux}
                    />
                    <Text style={[styles.repereTexte, favori && { fontFamily: police.demi }]}>
                      Favori
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={basculerAEviter}
                    style={({ pressed }) => [
                      styles.repere,
                      aEviter && { borderColor: couleurs.attente },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Ionicons
                      name={aEviter ? 'remove-circle' : 'remove-circle-outline'}
                      size={18}
                      color={couleurs.doux}
                    />
                    <Text style={[styles.repereTexte, aEviter && { fontFamily: police.demi }]}>
                      À éviter
                    </Text>
                  </Pressable>
                </View>
                <Doux>
                  {aEviter
                    ? 'Un rappel pour vous seul : ajouter un quart ici affichera un avertissement, sans jamais bloquer.'
                    : 'Un favori remonte en haut du répertoire. Les deux repères s’excluent.'}
                </Doux>
              </>
            )}
          </>
        )}

        {page === 1 && (
          <>
            <SousTitre>Contact principal</SousTitre>
            <Champ label="Nom de la personne contact" valeur={contactNom} onChange={setContactNom} />
            <ChampTelephone
              label="Téléphone"
              valeur={contactTelephone}
              onChange={setContactTelephone}
            />
            {!!contactTelephone.trim() && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${contactTelephone.replace(/[^\d+]/g, '')}`)}
                hitSlop={8}>
                <Text style={[styles.lien, { color: accent }]}>Appeler</Text>
              </Pressable>
            )}
            <Champ
              label="Courriel"
              valeur={contactCourriel}
              onChange={setContactCourriel}
              clavier="email-address"
            />

            <Separateur />
            <SousTitre>Notes générales</SousTitre>
            <Champ
              label="Fonctionnement, particularités, stationnement…"
              valeur={notes}
              onChange={setNotes}
              multiligne
            />
          </>
        )}

        {page === 2 && (
          <>
            <SousTitre>Conditions habituelles</SousTitre>
            <Doux>
              Ces valeurs préremplissent chaque nouveau quart dans cette pharmacie. Les changer ici
              ne touche pas aux quarts déjà entrés.
            </Doux>
            <View style={styles.espacement} />
            <Champ
              label="Taux horaire habituel ($/h)"
              valeur={tauxHoraire}
              onChange={setTauxHoraire}
              clavier="decimal-pad"
              placeholder="0,00"
            />
            <Champ
              label="Repas habituel ($/jour)"
              valeur={perDiem}
              onChange={setPerDiem}
              clavier="decimal-pad"
              placeholder="0,00"
              aide="Réclamable quart par quart, et modifiable sur chacun."
            />

            <Text style={styles.label}>Pause repas habituelle</Text>
            <View style={styles.puces}>
              {PAUSES.map((minutes) => (
                <Puce
                  key={minutes}
                  texte={minutes === 0 ? 'Aucune' : `${minutes} min`}
                  actif={pause === minutes}
                  onPress={() => setPause(minutes)}
                />
              ))}
            </View>
            {pause > 0 && (
              <Interrupteur
                label="Pause payée"
                detail={pausePayee ? 'Incluse dans les heures' : 'Déduite des heures facturées'}
                valeur={pausePayee}
                onChange={setPausePayee}
              />
            )}

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
                  label={`Distance ${allerRetour ? 'aller-retour' : 'aller simple'} (km)`}
                  valeur={
                    calculEnCours
                      ? ''
                      : distanceConnue(analyserNombre(distance))
                        ? distance
                        : ''
                  }
                  onChange={setDistance}
                  clavier="decimal-pad"
                  placeholder={calculEnCours ? 'Calcul en cours…' : 'Pas encore calculée'}
                />
                <Interrupteur
                  label="Aller-retour"
                  detail={
                    allerRetour
                      ? 'Le trajet est compté dans les deux sens'
                      : 'Le trajet n’est compté qu’une fois'
                  }
                  valeur={allerRetour}
                  onChange={setAllerRetour}
                />
                {sansDomicile ? (
                  <Carte style={styles.avis}>
                    <Doux>
                      Ajoutez votre adresse dans votre profil pour calculer les distances.
                    </Doux>
                    <Pressable onPress={() => router.push('/profil')} hitSlop={8}>
                      <Text style={[styles.lien, { color: accent }]}>Ouvrir mon profil</Text>
                    </Pressable>
                  </Carte>
                ) : (
                  <>
                    {!!echecCalcul && <Doux>{echecCalcul}</Doux>}
                    <Bouton
                      titre={calculEnCours ? 'Calcul…' : 'Recalculer la distance'}
                      variante="secondaire"
                      onPress={() => void calculer(false)}
                      desactive={calculEnCours}
                    />
                    <Doux>
                      La distance se calcule d’elle-même dès que l’adresse suffit. Le calcul envoie
                      votre adresse et celle de la pharmacie au service d’itinéraire.
                    </Doux>
                  </>
                )}
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

            {/*
              Une seule chose est vitale pour un remplaçant : ses identifiants
              de connexion. C'est ce qu'il ouvre en arrivant, à chaque quart.
              Les codes du lieu sont accessoires — sur place, c'est presque
              toujours un technicien qui s'en occupe. La hiérarchie de l'écran
              dit ça.
            */}
            <View style={styles.enteteSection}>
              <SousTitre>Codes d’accès (logiciel)</SousTitre>
              {secretsVisibles && (
                <Pressable onPress={() => setSecretsVisibles(false)} hitSlop={8}>
                  <Text style={[styles.lien, { color: accent }]}>Masquer</Text>
                </Pressable>
              )}
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

            {!secretsVisibles ? (
              <Carte style={styles.verrou}>
                <Ionicons name="lock-closed-outline" size={22} color={accent} />
                <Doux>
                  Ces identifiants ouvrent le dossier des patients. Ils sont conservés dans le
                  trousseau sécurisé de l’appareil et ne s’affichent qu’après authentification.
                </Doux>
                <Bouton
                  titre="Afficher"
                  onPress={async () => {
                    if (await deverrouiller()) setSecretsVisibles(true);
                  }}
                />
              </Carte>
            ) : (
              <Fondu>
                {/* Le NIP d'abord et en gros : le mot de passe sert une fois à
                    l'ouverture, le NIP sert toute la journée. */}
                <Section titre="NIP">
                  <TextInput
                    style={[styles.nip, { color: accent }]}
                    value={nip}
                    onChangeText={setNip}
                    placeholder="—"
                    placeholderTextColor={couleurs.bordure}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Doux>Lettres et chiffres acceptés, aucune longueur imposée.</Doux>
                </Section>

                <Section titre="Connexion">
                  <Champ nu label="Utilisateur" valeur={utilisateur} onChange={setUtilisateur} />
                  <Champ nu label="Mot de passe" valeur={motDePasse} onChange={setMotDePasse} />
                </Section>

                <Doux>
                  {logiciel
                    ? `Identifiants ${logiciel}, conservés dans le trousseau sécurisé de l’appareil (Keychain), jamais dans la base de l’application.`
                    : 'Choisissez le logiciel utilisé dans cette pharmacie.'}
                </Doux>
              </Fondu>
            )}

            <Separateur />

            {/* Un code d'alarme ouvre une porte, pas un dossier de santé : il
                n'a pas à être protégé, seulement rangé. */}
            <Pressable
              style={styles.enteteSection}
              onPress={() => setLieuDeploye((d) => !d)}
              hitSlop={6}>
              <SousTitre>Accès au lieu</SousTitre>
              <Ionicons
                name={lieuDeploye ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={accent}
              />
            </Pressable>

            {lieuDeploye && (
              <Fondu>
                <Doux>Alarme, stationnement, porte — ce qu’il faut pour entrer.</Doux>
                <View style={styles.espacement} />
                {codes.map((code, i) => (
                  <Section key={i}>
                    <Champ
                      nu
                      label="Libellé"
                      valeur={code.libelle}
                      onChange={(v) => modifierCode(i, 'libelle', v)}
                      placeholder="Code de porte"
                    />
                    <Champ
                      nu
                      label="Valeur"
                      valeur={code.valeur}
                      onChange={(v) => modifierCode(i, 'valeur', v)}
                    />
                    <Pressable
                      onPress={() => setCodes((actuels) => actuels.filter((_, j) => j !== i))}
                      hitSlop={8}>
                      <Text style={styles.retirer}>Retirer</Text>
                    </Pressable>
                  </Section>
                ))}
                <Bouton
                  titre="Ajouter un code"
                  variante="secondaire"
                  onPress={() => setCodes((actuels) => [...actuels, { libelle: '', valeur: '' }])}
                />
              </Fondu>
            )}
          </>
        )}

        <View style={styles.actions}>
          {nouvelle && !derniere ? (
            <Bouton titre="Suivant" onPress={() => setPage((p) => p + 1)} />
          ) : (
            <Bouton titre="Enregistrer" onPress={enregistrer} />
          )}
          {nouvelle && page > 0 && (
            <Bouton titre="Retour" variante="secondaire" onPress={() => setPage((p) => p - 1)} />
          )}
          {!nouvelle && derniere && (
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
      </Fondu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  reperes: {
    flexDirection: 'row',
    gap: espace.s,
    marginBottom: espace.s,
  },
  repere: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.s,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.carte,
    borderRadius: rayon,
    paddingVertical: espace.m,
  },
  verrou: {
    alignItems: 'flex-start',
    gap: espace.m,
  },
  nip: {
    fontSize: 34,
    fontFamily: police.gras,
    letterSpacing: 2,
    paddingVertical: espace.s,
  },
  repereTexte: {
    fontSize: 14,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  enteteSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
    marginBottom: espace.xs,
  },
  puces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: espace.m,
  },
  lien: {
    fontSize: 14,
    fontFamily: police.demi,
    marginBottom: espace.s,
  },
  retirer: {
    fontSize: 13,
    fontFamily: police.demi,
    color: couleurs.alerte,
    alignSelf: 'flex-start',
    marginBottom: espace.m,
  },
  avis: {
    backgroundColor: couleurs.alertePale,
    borderColor: couleurs.alerte,
  },
  espacement: {
    height: espace.m,
  },
  actions: {
    marginTop: espace.l,
    gap: espace.s,
  },
});
