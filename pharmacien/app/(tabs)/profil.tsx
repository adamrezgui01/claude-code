import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  enregistrerFormation,
  enregistrerReglages,
  listerDocuments,
  obtenirFormation,
  obtenirReglages,
} from '../../src/db/profil';
import type { DocumentProfessionnel } from '../../src/db/types';
import { aujourdhui, formatDateCourte, joursEntre } from '../../src/lib/dates';
import { analyserNombre, argent, nombre } from '../../src/lib/format';
import {
  Bouton,
  Champ,
  Doux,
  SelecteurDate,
  Separateur,
  SousTitre,
  Vide,
} from '../../src/ui/composants';
import { couleurs, espace } from '../../src/ui/theme';

export default function Profil() {
  const router = useRouter();

  const [heuresCompletees, setHeuresCompletees] = useState('0');
  const [heuresRequises, setHeuresRequises] = useState('40');
  const [finPeriode, setFinPeriode] = useState('');
  const [ajusteFormation, setAjusteFormation] = useState(false);

  const [documents, setDocuments] = useState<DocumentProfessionnel[]>([]);

  const [nom, setNom] = useState('');
  const [permis, setPermis] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [courriel, setCourriel] = useState('');
  const [tauxKm, setTauxKm] = useState('');
  const [cleItineraire, setCleItineraire] = useState('');
  const [reglagesEnregistres, setReglagesEnregistres] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const f = obtenirFormation();
      setHeuresCompletees(`${f.heures_completees}`);
      setHeuresRequises(`${f.heures_requises}`);
      setFinPeriode(f.date_fin_periode);

      setDocuments(listerDocuments());

      const r = obtenirReglages();
      setNom(r.nom);
      setPermis(r.permis_opq);
      setAdresse(r.adresse);
      setTelephone(r.telephone);
      setCourriel(r.courriel);
      setTauxKm(`${r.taux_par_km}`);
      setCleItineraire(r.cle_itineraire);
    }, [])
  );

  function modifie<T>(setter: (v: T) => void) {
    return (valeur: T) => {
      setter(valeur);
      setReglagesEnregistres(false);
    };
  }

  function sauvegarderFormation() {
    enregistrerFormation({
      heures_completees: analyserNombre(heuresCompletees),
      heures_requises: analyserNombre(heuresRequises),
      date_fin_periode: finPeriode,
    });
    setAjusteFormation(false);
  }

  function sauvegarderReglages() {
    enregistrerReglages({
      nom: nom.trim(),
      permis_opq: permis.trim(),
      adresse: adresse.trim(),
      telephone: telephone.trim(),
      courriel: courriel.trim(),
      taux_par_km: analyserNombre(tauxKm),
      cle_itineraire: cleItineraire.trim(),
    });
    setReglagesEnregistres(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <SousTitre>Formation continue</SousTitre>
      <Text style={styles.compteur}>
        {nombre(analyserNombre(heuresCompletees))} h / {nombre(analyserNombre(heuresRequises))} h
        {finPeriode ? ` — échéance le ${formatDateCourte(finPeriode)}` : ''}
      </Text>
      {!ajusteFormation ? (
        <Pressable onPress={() => setAjusteFormation(true)} hitSlop={8}>
          <Text style={styles.lien}>Ajuster</Text>
        </Pressable>
      ) : (
        <View style={styles.bloc}>
          <Champ
            label="Heures complétées"
            valeur={heuresCompletees}
            onChange={setHeuresCompletees}
            clavier="decimal-pad"
          />
          <Champ
            label="Heures requises"
            valeur={heuresRequises}
            onChange={setHeuresRequises}
            clavier="decimal-pad"
          />
          <SelecteurDate
            label="Fin de la période de référence"
            valeur={finPeriode || aujourdhui()}
            onChange={setFinPeriode}
          />
          <Bouton titre="Enregistrer" onPress={sauvegarderFormation} />
        </View>
      )}

      <Separateur />

      <SousTitre>Documents professionnels</SousTitre>
      {documents.length === 0 ? (
        <Vide texte="Aucun document suivi." />
      ) : (
        documents.map((d) => {
          const restants = joursEntre(aujourdhui(), d.date_expiration);
          return (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/document/${d.id}`)}
              style={({ pressed }) => [styles.document, pressed && { opacity: 0.6 }]}>
              <View style={styles.documentTexte}>
                <Text style={styles.documentNom}>{d.nom}</Text>
                <Doux>
                  Expire le {formatDateCourte(d.date_expiration)} · rappel {d.jours_avant_rappel} j
                  avant
                </Doux>
              </View>
              <Text style={[styles.restants, restants <= 0 && styles.expire]}>
                {restants <= 0 ? 'Expiré' : `${restants} j`}
              </Text>
            </Pressable>
          );
        })
      )}
      <Pressable onPress={() => router.push('/document/nouveau')} hitSlop={8}>
        <Text style={styles.lien}>Ajouter un document</Text>
      </Pressable>

      <Separateur />

      <SousTitre>Vos coordonnées</SousTitre>
      <Doux>Elles apparaissent en en-tête de chaque facture.</Doux>
      <View style={styles.bloc}>
        <Champ
          label="Votre nom (pharmacien remplaçant)"
          valeur={nom}
          onChange={modifie(setNom)}
        />
        <Champ label="Numéro de permis OPQ" valeur={permis} onChange={modifie(setPermis)} />
        <Champ label="Adresse" valeur={adresse} onChange={modifie(setAdresse)} multiligne />
        <Champ
          label="Téléphone"
          valeur={telephone}
          onChange={modifie(setTelephone)}
          clavier="phone-pad"
        />
        <Champ
          label="Courriel"
          valeur={courriel}
          onChange={modifie(setCourriel)}
          clavier="email-address"
        />
      </View>

      <Separateur />

      <SousTitre>Réglages</SousTitre>
      <Champ
        label="Taux par kilomètre par défaut ($/km)"
        valeur={tauxKm}
        onChange={modifie(setTauxKm)}
        clavier="decimal-pad"
      />
      <Doux>
        Sert à préremplir une nouvelle fiche de pharmacie. Le taux réellement facturé est celui de
        chaque pharmacie, tout comme son per diem.
      </Doux>

      <View style={styles.bloc}>
        <Champ
          label="Clé OpenRouteService (facultative)"
          valeur={cleItineraire}
          onChange={modifie(setCleItineraire)}
          masque
        />
        <Doux>
          Permet de calculer la distance jusqu’à une pharmacie à partir de son adresse. Sans clé,
          l’application ouvre plutôt l’itinéraire dans Plans. C’est la seule fonction qui envoie
          des données à l’extérieur de l’appareil.
        </Doux>
        <Bouton
          titre={reglagesEnregistres ? 'Enregistré' : 'Enregistrer'}
          variante={reglagesEnregistres ? 'secondaire' : 'principal'}
          onPress={sauvegarderReglages}
        />
        <Doux>Kilométrage facturé par défaut à {argent(analyserNombre(tauxKm))} le kilomètre.</Doux>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: {
    padding: espace.l,
    paddingBottom: espace.xxl,
  },
  compteur: {
    fontSize: 16,
    color: couleurs.texte,
  },
  lien: {
    color: couleurs.accent,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: espace.s,
  },
  bloc: {
    marginTop: espace.m,
    gap: espace.s,
  },
  document: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    paddingVertical: espace.s,
  },
  documentTexte: {
    flex: 1,
  },
  documentNom: {
    fontSize: 15,
    color: couleurs.texte,
    fontWeight: '600',
  },
  restants: {
    fontSize: 13,
    color: couleurs.doux,
  },
  expire: {
    color: couleurs.alerte,
    fontWeight: '600',
  },
});
