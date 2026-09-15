import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { listerFrais } from '../../src/db/frais';
import {
  creerPharmacie,
  listerPharmacies,
  listerPharmaciesRecentes,
  obtenirPharmacie,
  pharmacieVide,
} from '../../src/db/pharmacies';
import { delaisSecondaires, obtenirReglages } from '../../src/db/profil';
import {
  corrigerHeures,
  creerQuart,
  definirAnnule,
  enregistrerRappels,
  finDuQuart,
  modifierQuart,
  obtenirQuart,
  quartsDuJour,
  rappelsDuQuart,
  supprimerQuart,
  type EntreeQuart,
} from '../../src/db/quarts';
import type { FraisExtra, ModeDeplacement, Pharmacie } from '../../src/db/types';
import { aujourdhui, dureeHeures } from '../../src/lib/dates';
import { dureePrevue } from '../../src/lib/facture';
import { analyserNombre, argent, heures } from '../../src/lib/format';
import { annulerRappels, planifierRappelsQuart } from '../../src/lib/notifications';
import {
  datesRecurrentes,
  indiceJour,
  JOURS_SEMAINE,
  nouvelleSerie,
  resumeSerie,
} from '../../src/lib/recurrence';
import { verifierQuart } from '../../src/lib/stats';
import {
  Bouton,
  Carte,
  Champ,
  Doux,
  Ecran,
  Fondu,
  Interrupteur,
  Puce,
  SelecteurDate,
  SelecteurHeure,
  Separateur,
  SousTitre,
} from '../../src/ui/composants';
import { Recompense } from '../../src/ui/Recompense';
import { SelecteurPharmacie } from '../../src/ui/SelecteurPharmacie';
import { couleurs, espace, police, rayon, useAccent } from '../../src/ui/theme';

const PAUSES = [0, 30, 45, 60];

export default function FormulaireQuart() {
  const router = useRouter();
  const accent = useAccent();
  const params = useLocalSearchParams<{
    id: string;
    date?: string;
    heure?: string;
    pharmacie?: string;
    duplique?: string;
  }>();
  const nouveau = params.id === 'nouveau';
  const quartId = nouveau ? null : Number(params.id);

  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [recentes, setRecentes] = useState<Pharmacie[]>([]);
  const [pharmacieId, setPharmacieId] = useState<number | null>(null);
  const [modeDeplacement, setModeDeplacement] = useState<ModeDeplacement>('aucun');
  const [creationPharmacie, setCreationPharmacie] = useState(false);
  const [nouvellePharmacie, setNouvellePharmacie] = useState('');

  const [date, setDate] = useState(params.date ?? aujourdhui());
  const [heureDebut, setHeureDebut] = useState(params.heure ?? '09:00');
  const [heureFin, setHeureFin] = useState('17:00');
  const [pause, setPause] = useState(0);
  const [pausePayee, setPausePayee] = useState(false);
  const [taux, setTaux] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  const [montantFixe, setMontantFixe] = useState('');
  const [perDiem, setPerDiem] = useState('');
  const [notes, setNotes] = useState('');
  const [frais, setFrais] = useState<FraisExtra[]>([]);

  /** Les frais restent repliés : le cas normal ne demande aucun geste. */
  const [fraisDeplies, setFraisDeplies] = useState(false);
  const [annule, setAnnule] = useState(false);
  const [passe, setPasse] = useState(false);
  const [heuresPrevues, setHeuresPrevues] = useState<{ debut: string; fin: string } | null>(null);

  const [repeter, setRepeter] = useState(false);
  const [joursRepetes, setJoursRepetes] = useState<number[]>([]);
  const [semaines, setSemaines] = useState('2');
  const [recompense, setRecompense] = useState('');

  useEffect(() => {
    setPharmacies(listerPharmacies());
    setRecentes(listerPharmaciesRecentes());

    const source = quartId ?? (params.duplique ? Number(params.duplique) : null);
    if (source) {
      const q = obtenirQuart(source);
      if (q) {
        setPharmacieId(q.pharmacie_id);
        setModeDeplacement(q.pharmacie_mode_deplacement);
        setPause(q.pause_minutes);
        setPausePayee(!!q.pause_payee);
        setTaux(`${q.taux_horaire}`);
        setKilometrage(q.kilometrage ? `${q.kilometrage}` : '');
        setMontantFixe(q.montant_fixe_deplacement ? `${q.montant_fixe_deplacement}` : '');
        setPerDiem(q.per_diem_reclame ? `${q.per_diem_reclame}` : '');
        setNotes(q.notes);

        if (quartId) {
          setDate(q.date);
          // Les heures réelles priment quand elles existent ; sinon les prévues
          // servent de point de départ, exactement comme le mémo l'annonce.
          setHeureDebut(q.heure_debut_reelle || q.heure_debut);
          setHeureFin(q.heure_fin_reelle || q.heure_fin);
          setAnnule(!!q.annule);
          setPasse(finDuQuart(q).getTime() < Date.now());
          setHeuresPrevues({ debut: q.heure_debut, fin: q.heure_fin });
        } else {
          setHeureDebut(q.heure_debut);
          setHeureFin(q.heure_fin);
        }
      }
      return;
    }
    if (params.pharmacie) appliquerPharmacie(Number(params.pharmacie));
  }, [quartId, params.pharmacie, params.duplique]);

  useFocusEffect(
    useCallback(() => {
      if (quartId) setFrais(listerFrais(quartId));
    }, [quartId])
  );

  /** Reprend les conditions de la pharmacie : taux, déplacement, repas, pause. */
  function appliquerPharmacie(id: number) {
    setPharmacieId(id);
    setCreationPharmacie(false);
    const p = obtenirPharmacie(id);
    if (!p) return;
    setModeDeplacement(p.mode_deplacement);
    if (p.taux_horaire) setTaux(`${p.taux_horaire}`);
    setPause(p.pause_minutes);
    setPausePayee(!!p.pause_payee);
    setKilometrage(p.mode_deplacement === 'km' && p.distance_km ? `${p.distance_km}` : '');
    setMontantFixe(
      p.mode_deplacement === 'fixe' && p.montant_fixe_deplacement
        ? `${p.montant_fixe_deplacement}`
        : ''
    );
    setPerDiem(p.per_diem ? `${p.per_diem}` : '');
  }

  const duree = dureePrevue(heureDebut, heureFin, pause, pausePayee);
  const totalFrais = frais.reduce((t, f) => t + f.montant, 0);
  const nbSemaines = Math.max(1, Math.round(analyserNombre(semaines) || 1));
  const datesSerie = repeter ? datesRecurrentes(date, joursRepetes, nbSemaines) : [date];

  /** Ce que la ligne repliée annonce, sans avoir à la déplier. */
  function resumeFrais(): string {
    const morceaux: string[] = [];
    const km = analyserNombre(kilometrage);
    const fixe = analyserNombre(montantFixe);
    const repas = analyserNombre(perDiem);
    if (modeDeplacement === 'km' && km > 0) morceaux.push(`${km} km`);
    if (modeDeplacement === 'fixe' && fixe > 0) morceaux.push(argent(fixe));
    if (repas > 0) morceaux.push(`repas ${argent(repas)}`);
    return morceaux.length > 0 ? morceaux.join(' · ') : 'Rien de réclamé';
  }

  function entreeDepuisFormulaire(idPharmacie: number, pourLaDate: string): EntreeQuart {
    // Sur un quart déjà passé, les sélecteurs portent les heures réelles : les
    // heures prévues sont un fait comptable et ne bougent pas.
    const corrige = passe && heuresPrevues;
    return {
      pharmacie_id: idPharmacie,
      date: pourLaDate,
      heure_debut: corrige ? heuresPrevues.debut : heureDebut,
      heure_fin: corrige ? heuresPrevues.fin : heureFin,
      taux_horaire: analyserNombre(taux),
      kilometrage: analyserNombre(kilometrage),
      montant_fixe_deplacement: analyserNombre(montantFixe),
      per_diem_reclame: analyserNombre(perDiem),
      pause_minutes: pause,
      pause_payee: pausePayee ? 1 : 0,
      notes: notes.trim(),
    };
  }

  async function programmerRappels(id: number) {
    const quart = obtenirQuart(id);
    if (!quart) return;
    const rappels = await planifierRappelsQuart(quart, delaisSecondaires(obtenirReglages()));
    enregistrerRappels(id, rappels.principal, rappels.secondaires, rappels.memo);
  }

  async function enregistrer(idPharmacie: number) {
    if (quartId) {
      const ancien = obtenirQuart(quartId);
      if (ancien) await annulerRappels(rappelsDuQuart(ancien));
      modifierQuart(quartId, entreeDepuisFormulaire(idPharmacie, date));
      // Une correction n'écrase les heures réelles que si elle change quelque
      // chose : sinon le quart reste un quart ordinaire, sans étiquette.
      if (passe && heuresPrevues) {
        const different =
          heureDebut !== heuresPrevues.debut || heureFin !== heuresPrevues.fin;
        corrigerHeures(quartId, different ? heureDebut : '', different ? heureFin : '');
      }
      await programmerRappels(quartId);
      router.back();
      return;
    }

    const serie = datesSerie.length > 1 ? nouvelleSerie() : '';
    const identifiants = datesSerie.map((jour) =>
      creerQuart(entreeDepuisFormulaire(idPharmacie, jour), serie)
    );
    for (const id of identifiants) await programmerRappels(id);

    setRecompense(
      identifiants.length > 1 ? `${identifiants.length} quarts ajoutés` : 'Quart ajouté'
    );
  }

  async function valider() {
    let idPharmacie = pharmacieId;
    if (!idPharmacie && nouvellePharmacie.trim()) {
      idPharmacie = creerPharmacie(
        pharmacieVide(nouvellePharmacie.trim(), obtenirReglages().taux_par_km)
      );
    }
    if (!idPharmacie) {
      Alert.alert('Pharmacie manquante', 'Choisissez une pharmacie ou créez-en une.');
      return;
    }
    const retenue = idPharmacie;
    if (dureeHeures(heureDebut, heureFin) === 0) {
      Alert.alert('Horaire invalide', 'L’heure de fin doit être différente de l’heure de début.');
      return;
    }

    // Une série se vérifie sur chacune de ses dates : deux semaines de contrat
    // peuvent tomber sur un quart déjà pris un seul de ces jours-là.
    for (const jour of datesSerie) {
      const autres = quartsDuJour(jour).filter((q) => q.id !== quartId);
      const verification = verifierQuart(
        { date: jour, heure_debut: heureDebut, heure_fin: heureFin, pharmacie_id: retenue },
        autres
      );

      if (verification.type === 'chevauchement') {
        const autre = verification.autre;
        Alert.alert(
          'Ces deux quarts se chevauchent',
          `${autre.pharmacie_nom}, le ${autre.date}, de ${autre.heure_debut} à ${autre.heure_fin}.`,
          [
            { text: 'Modifier ce quart-ci', style: 'cancel' },
            { text: 'Ouvrir l’autre quart', onPress: () => router.replace(`/quart/${autre.id}`) },
            {
              text: 'Supprimer l’autre quart',
              style: 'destructive',
              onPress: async () => {
                await annulerRappels(rappelsDuQuart(autre));
                supprimerQuart(autre.id);
                await valider();
              },
            },
            { text: 'Enregistrer quand même', onPress: () => enregistrer(retenue) },
          ]
        );
        return;
      }

      if (verification.type === 'serre') {
        Alert.alert(
          'Trajet serré',
          `Il ne reste que ${verification.minutes} minutes entre ce quart et celui de ${verification.autre.pharmacie_nom}. Êtes-vous certain d’avoir le temps de vous déplacer ?`,
          [
            { text: 'Corriger', style: 'cancel' },
            { text: 'Enregistrer', onPress: () => enregistrer(retenue) },
          ]
        );
        return;
      }
    }

    await enregistrer(retenue);
  }

  function basculerAnnule() {
    if (!quartId) return;
    const prochain = !annule;
    definirAnnule(quartId, prochain);
    setAnnule(prochain);
  }

  function supprimer() {
    if (!quartId) return;
    Alert.alert('Supprimer ce quart ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const quart = obtenirQuart(quartId);
          if (quart) await annulerRappels(rappelsDuQuart(quart));
          supprimerQuart(quartId);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Ecran>
        <Stack.Screen options={{ title: nouveau ? 'Nouveau quart' : 'Modifier le quart' }} />

        <SousTitre>Pharmacie</SousTitre>
        <SelecteurPharmacie
          pharmacies={pharmacies}
          recentes={recentes}
          selection={pharmacieId ? [pharmacieId] : []}
          onSelectionner={appliquerPharmacie}
          enTete={
            <Puce
              texte="+ Nouvelle pharmacie"
              actif={creationPharmacie}
              onPress={() => {
                setCreationPharmacie((c) => !c);
                setPharmacieId(null);
              }}
            />
          }
        />
        {creationPharmacie && (
          <View style={styles.espacement}>
            <Champ
              label="Nom de la nouvelle pharmacie"
              valeur={nouvellePharmacie}
              onChange={setNouvellePharmacie}
              placeholder="Nom de la pharmacie"
              aide="Son adresse et ses conditions se remplissent ensuite dans sa fiche."
            />
          </View>
        )}

        <Separateur />

        <SelecteurDate label="Date" valeur={date} onChange={setDate} />
        <View style={styles.rangee}>
          <SelecteurHeure label="Début" valeur={heureDebut} onChange={setHeureDebut} />
          <SelecteurHeure label="Fin" valeur={heureFin} onChange={setHeureFin} />
        </View>
        {passe && (
          <Doux>
            Ce quart est passé : ces heures sont celles que vous avez réellement faites.
          </Doux>
        )}

        <Text style={styles.label}>Pause repas</Text>
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

        <Text style={styles.duree}>
          Durée facturable : {heures(duree)}
          {heureFin <= heureDebut ? ' (quart de nuit)' : ''}
        </Text>

        <Champ
          label="Taux horaire ($/h)"
          valeur={taux}
          onChange={setTaux}
          clavier="decimal-pad"
          placeholder="0,00"
        />

        <Pressable
          style={styles.ligneFrais}
          onPress={() => setFraisDeplies((d) => !d)}
          hitSlop={6}>
          <View style={styles.fraisTexte}>
            <Text style={styles.fraisLabel}>Frais</Text>
            <Text style={styles.fraisResume}>{resumeFrais()}</Text>
          </View>
          <Text style={[styles.modifier, { color: accent }]}>
            {fraisDeplies ? 'Replier' : 'Modifier'}
          </Text>
        </Pressable>

        {fraisDeplies && (
          <Fondu>
            {modeDeplacement === 'km' && (
              <Champ
                label="Kilométrage (km)"
                valeur={kilometrage}
                onChange={setKilometrage}
                clavier="decimal-pad"
                placeholder="0"
                aide="Mettez zéro pour une journée où le trajet n’est pas remboursé."
              />
            )}
            {modeDeplacement === 'fixe' && (
              <Champ
                label="Déplacement ($)"
                valeur={montantFixe}
                onChange={setMontantFixe}
                clavier="decimal-pad"
                placeholder="0,00"
              />
            )}
            {modeDeplacement === 'aucun' && (
              <Doux>Cette pharmacie ne rembourse pas les déplacements.</Doux>
            )}
            <Champ
              label="Repas ($)"
              valeur={perDiem}
              onChange={setPerDiem}
              clavier="decimal-pad"
              placeholder="0,00"
            />
          </Fondu>
        )}

        <Champ label="Notes" valeur={notes} onChange={setNotes} multiligne />

        {nouveau && (
          <>
            <Separateur />
            <Interrupteur
              label="Répéter ce quart"
              detail="Un contrat de deux semaines en un seul geste"
              valeur={repeter}
              onChange={setRepeter}
            />
            {repeter && (
              <Fondu>
                <Text style={styles.label}>Jours de la semaine</Text>
                <View style={styles.puces}>
                  {JOURS_SEMAINE.map((jour) => (
                    <Puce
                      key={jour.nom}
                      texte={jour.court}
                      actif={joursRepetes.includes(jour.indice)}
                      onPress={() =>
                        setJoursRepetes((actuels) =>
                          actuels.includes(jour.indice)
                            ? actuels.filter((i) => i !== jour.indice)
                            : [...actuels, jour.indice]
                        )
                      }
                    />
                  ))}
                </View>
                <Champ
                  label="Nombre de semaines"
                  valeur={semaines}
                  onChange={setSemaines}
                  clavier="number-pad"
                />
                <Doux>{resumeSerie(datesSerie)}</Doux>
                {joursRepetes.length === 0 && (
                  <Doux>
                    Sans jour coché, seul le {JOURS_SEMAINE[indiceJour(date)].nom} de la date
                    choisie est créé.
                  </Doux>
                )}
              </Fondu>
            )}
          </>
        )}

        {!nouveau && (
          <>
            <Separateur />
            <SousTitre>Frais extra</SousTitre>
            {frais.length === 0 ? (
              <Doux>Rien de facturé en plus des heures pour ce quart.</Doux>
            ) : (
              frais.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/frais/${f.id}`)}
                  style={({ pressed }) => [styles.frais, pressed && { opacity: 0.6 }]}>
                  <View style={styles.fraisTexte}>
                    <Text style={styles.fraisDescription}>{f.description || 'Frais'}</Text>
                    {!f.photo && <Doux>Sans reçu</Doux>}
                  </View>
                  <Text style={styles.fraisMontant}>{argent(f.montant)}</Text>
                </Pressable>
              ))
            )}
            {totalFrais > 0 && (
              <Text style={[styles.total, { color: accent }]}>
                Total des frais {argent(totalFrais)}
              </Text>
            )}
            <Bouton
              titre="Charger quelque chose en plus"
              variante="secondaire"
              icone={<Ionicons name="add" size={18} color={couleurs.texte} />}
              onPress={() => router.push(`/frais/nouveau?quart=${quartId}`)}
            />
          </>
        )}

        <Carte style={styles.note}>
          <Doux>
            Un rappel part 48 h avant le quart. Deux heures après sa fin, un mémo vous propose de
            corriger vos heures si elles étaient différentes — l’ignorer ne change rien.
          </Doux>
        </Carte>

        <View style={styles.actions}>
          <Bouton titre="Enregistrer" onPress={valider} />
          {!nouveau && (
            <>
              <Bouton
                titre="Dupliquer ce quart"
                variante="secondaire"
                icone={<Ionicons name="copy-outline" size={18} color={couleurs.texte} />}
                onPress={() => router.push(`/quart/nouveau?duplique=${quartId}`)}
              />
              <Bouton
                titre={annule ? 'Finalement, le quart a eu lieu' : 'Le quart n’a pas eu lieu'}
                variante={annule ? 'secondaire' : 'danger'}
                onPress={basculerAnnule}
              />
              <Bouton titre="Supprimer le quart" variante="danger" onPress={supprimer} />
            </>
          )}
        </View>
      </Ecran>

      <Recompense
        visible={!!recompense}
        texte={recompense}
        onFini={() => {
          setRecompense('');
          router.back();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  espacement: {
    marginTop: espace.m,
  },
  rangee: {
    flexDirection: 'row',
    gap: espace.m,
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
  },
  duree: {
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.texte,
    marginVertical: espace.m,
  },
  ligneFrais: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    paddingVertical: espace.s,
    marginBottom: espace.m,
  },
  fraisLabel: {
    fontSize: 13,
    fontFamily: police.normal,
    color: couleurs.doux,
  },
  fraisResume: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  modifier: {
    fontSize: 14,
    fontFamily: police.demi,
  },
  frais: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    padding: espace.m,
    marginBottom: espace.s,
    gap: espace.m,
  },
  fraisTexte: {
    flex: 1,
  },
  fraisDescription: {
    fontSize: 15,
    fontFamily: police.normal,
    color: couleurs.texte,
  },
  fraisMontant: {
    fontSize: 15,
    fontFamily: police.demi,
    color: couleurs.texte,
  },
  total: {
    fontSize: 14,
    fontFamily: police.demi,
    marginBottom: espace.m,
  },
  note: {
    marginTop: espace.l,
  },
  actions: {
    marginTop: espace.m,
    gap: espace.s,
  },
});
