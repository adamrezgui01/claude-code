import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTextes } from '../i18n';
import { suiteDeLaLecture } from '../lib/dictee';
import { lire, type ContexteLecteur, type Fiche, type Question } from '../lib/lecteur';
import { Bouton } from './composants';
import { couleurs, espace, police, rayon, useAccent } from './theme';

/**
 * La dictée.
 *
 * Il n'y a pas de reconnaissance vocale ici : c'est le micro du clavier qui
 * écrit, comme dans n'importe quel champ de texte. Rien ne part sur un
 * serveur, rien ne coûte rien, et la phrase reste lisible et corrigeable avant
 * d'être lue — ce qu'aucune commande vocale ne permet.
 *
 * Ce que le lecteur en tire n'est jamais créé directement. La fiche de quart
 * s'ouvre pré-remplie, et c'est l'usager qui confirme.
 */

export function Dictee({
  ouvert,
  contexte,
  onFermer,
  onQuart,
  onPharmacie,
  onIncomprise,
}: {
  ouvert: boolean;
  contexte: ContexteLecteur;
  onFermer: () => void;
  onQuart: (fiche: Extract<Fiche, { action: 'quart' }>) => void;
  onPharmacie: (recherche: string) => void;
  onIncomprise: (phrase: string, raison: string) => void;
}) {
  const accent = useAccent();
  const { t } = useTextes();
  const [phrase, setPhrase] = useState('');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [reponses, setReponses] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!ouvert) {
      setPhrase('');
      setFiche(null);
      setReponses({});
    }
  }, [ouvert]);

  /**
   * Un seul bouton, « Terminé ». Le premier appui lit la phrase ; si le
   * lecteur a tout compris, la fiche s'ouvre dans la foulée, sans demander un
   * second geste pour confirmer ce que l'usager vient d'écrire lui-même.
   *
   * L'écran ne retient que ce qui a besoin de lui : une question à trancher,
   * ou un message à lire. Le même bouton referme ensuite.
   */
  const terminer = () => {
    if (fiche && fiche.action === 'quart') {
      continuer();
      return;
    }
    const resultat = lire(phrase, contexte);
    if (resultat.action === 'incompris' || resultat.action === 'nonPrisEnCharge') {
      onIncomprise(phrase, resultat.action === 'incompris' ? 'incompris' : resultat.raison);
    }
    if (resultat.action === 'pharmacie') {
      onPharmacie(resultat.recherche);
      onFermer();
      return;
    }
    if (suiteDeLaLecture(resultat) === 'fermer' && resultat.action === 'quart') {
      onQuart(resultat);
      onFermer();
      return;
    }
    setFiche(resultat);
  };

  // Une question posée ne bloque rien : la fiche porte déjà une réponse par
  // défaut, et toucher un autre choix ne fait que la remplacer.
  const repondre = (rang: number, question: Question, choix: number) => {
    setReponses((etat) => ({ ...etat, [rang]: choix }));
    if (!fiche || fiche.action !== 'quart') return;
    if (question.type === 'heures') {
      const horaire = question.choix[choix];
      setFiche({ ...fiche, heureDebut: horaire.debut, heureFin: horaire.fin });
    } else {
      setFiche({ ...fiche, pharmacieId: question.choix[choix].id });
    }
  };

  const continuer = () => {
    if (fiche && fiche.action === 'quart') onQuart(fiche);
    onFermer();
  };

  return (
    <Modal visible={ouvert} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.voile} onPress={onFermer}>
        <Pressable style={styles.feuille} onPress={() => {}}>
          <Text style={styles.titre}>{t('dictee.titre')}</Text>

          <TextInput
            style={[styles.champ, { borderColor: accent }]}
            value={phrase}
            onChangeText={(texte) => {
              setPhrase(texte);
              setFiche(null);
            }}
            placeholder={t('dictee.exemple')}
            placeholderTextColor={couleurs.doux}
            multiline
            autoFocus
            returnKeyType="done"
            onSubmitEditing={terminer}
          />
          <View style={styles.indice}>
            <Ionicons name="mic-outline" size={16} color={couleurs.doux} />
            <Text style={styles.indiceTexte}>{t('dictee.micro')}</Text>
          </View>

          {fiche?.action === 'quart' && (
            <View style={styles.resultat}>
              <Text style={styles.resume}>{resumer(fiche, t)}</Text>
              {fiche.questions.map((question, rang) => (
                <View key={`${question.type}-${rang}`} style={styles.question}>
                  <Text style={styles.questionTexte}>{question.texte}</Text>
                  <View style={styles.choix}>
                    {etiquettes(question).map((etiquette, n) => {
                      const retenu = (reponses[rang] ?? 0) === n;
                      return (
                        <Pressable
                          key={etiquette}
                          onPress={() => repondre(rang, question, n)}
                          style={[
                            styles.puce,
                            retenu && { borderColor: accent, backgroundColor: accent },
                          ]}>
                          <Text style={[styles.puceTexte, retenu && styles.puceTexteRetenu]}>
                            {etiquette}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {fiche?.action === 'incompris' && <Text style={styles.echec}>{t('dictee.incompris')}</Text>}
          {fiche?.action === 'nonPrisEnCharge' && (
            <Text style={styles.echec}>
              {t(`dictee.raison${fiche.raison[0].toUpperCase()}${fiche.raison.slice(1)}`)}
            </Text>
          )}

          <Bouton
            titre={t('dictee.termine')}
            onPress={terminer}
            desactive={phrase.trim().length === 0}
          />
          <Pressable onPress={onFermer} hitSlop={8}>
            <Text style={styles.annuler}>{t('commun.annuler')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Les réponses à toucher, telles qu'elles se lisent. */
function etiquettes(question: Question): string[] {
  if (question.type === 'heures') {
    return question.choix.map((choix) => `${choix.debut} – ${choix.fin}`);
  }
  return question.choix.map((choix) => (choix.ville ? `${choix.nom} (${choix.ville})` : choix.nom));
}

/** Ce que le lecteur a compris, en une ligne, avant d'ouvrir la fiche. */
function resumer(
  fiche: Extract<Fiche, { action: 'quart' }>,
  traduire: (cle: string, valeurs?: Record<string, unknown>) => string
): string {
  const morceaux: string[] = [];
  if (fiche.dates.length === 1) morceaux.push(fiche.dates[0]);
  else if (fiche.dates.length > 1) morceaux.push(traduire('dictee.jours', { count: fiche.dates.length }));
  if (fiche.heureDebut && fiche.heureFin) morceaux.push(`${fiche.heureDebut} – ${fiche.heureFin}`);
  if (fiche.pharmacieInconnue) morceaux.push(fiche.pharmacieInconnue);
  if (morceaux.length === 0) return traduire('dictee.ficheVide');
  return morceaux.join(' · ');
}

const styles = StyleSheet.create({
  voile: {
    flex: 1,
    backgroundColor: '#1E1B2299',
    justifyContent: 'center',
    padding: espace.l,
  },
  feuille: {
    backgroundColor: couleurs.carte,
    borderRadius: rayon * 1.5,
    padding: espace.xl,
    gap: espace.m,
  },
  titre: { fontSize: 18, fontFamily: police.gras, color: couleurs.texte },
  champ: {
    borderWidth: 1.5,
    borderRadius: rayon,
    padding: espace.m,
    minHeight: 92,
    fontSize: 16,
    fontFamily: police.normal,
    color: couleurs.texte,
    textAlignVertical: 'top',
  },
  indice: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  indiceTexte: { fontSize: 13, fontFamily: police.normal, color: couleurs.doux, flex: 1 },
  resultat: { gap: espace.m },
  resume: { fontSize: 15, fontFamily: police.demi, color: couleurs.texte },
  question: { gap: espace.s },
  questionTexte: { fontSize: 14, fontFamily: police.normal, color: couleurs.doux },
  choix: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  puce: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingVertical: espace.s,
    paddingHorizontal: espace.m,
  },
  puceTexte: { fontSize: 14, fontFamily: police.demi, color: couleurs.texte },
  puceTexteRetenu: { color: '#FFFFFF' },
  echec: { fontSize: 14, fontFamily: police.normal, color: couleurs.doux, lineHeight: 20 },
  annuler: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: police.demi,
    color: couleurs.doux,
    paddingVertical: espace.s,
  },
});
