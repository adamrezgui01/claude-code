import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTextes } from '../i18n';
import { suiteDeLaLecture } from '../lib/dictee';
import {
  lireTout,
  type ContexteLecteur,
  type DeclarationDispo,
  type Fiche,
  type FicheAnnulation,
  type FicheDispo,
  type Question,
} from '../lib/lecteur';
import { formatDateCourte } from '../lib/dates';
import type { Langue } from '../lib/langue';
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
  onDispo,
  onAnnulation,
  onPharmacie,
  onCommandes,
  onIncomprise,
}: {
  ouvert: boolean;
  contexte: ContexteLecteur;
  onFermer: () => void;
  onQuart: (fiche: Extract<Fiche, { action: 'quart' }>) => void;
  onDispo: (fiche: FicheDispo) => void;
  onAnnulation: (fiche: FicheAnnulation) => void;
  onPharmacie: (recherche: string) => void;
  /**
   * Plusieurs commandes dans une phrase. Elles s'ouvrent une à une : la
   * création reste la création ordinaire, et l'usager voit chaque fiche.
   */
  onCommandes: (fiches: Fiche[]) => void;
  onIncomprise: (phrase: string, raison: string) => void;
}) {
  const accent = useAccent();
  const { t, langue } = useTextes();
  const [phrase, setPhrase] = useState('');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [reponses, setReponses] = useState<Record<number, number>>({});
  /** Les commandes lues dans une même phrase, avant confirmation. */
  const [commandes, setCommandes] = useState<Fiche[] | null>(null);

  useEffect(() => {
    if (!ouvert) {
      setPhrase('');
      setFiche(null);
      setReponses({});
      setCommandes(null);
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
    // Une disponibilité lue attend son « Enregistrer » : c'est le seul endroit
    // où la dictée écrit quelque chose, alors elle le demande.
    if (fiche && fiche.action === 'dispo') {
      onDispo(fiche);
      onFermer();
      return;
    }
    // Une liste de cartes attend son « Confirmer » : le second appui l'envoie.
    if (commandes && commandes.length > 0) {
      onCommandes(commandes);
      onFermer();
      return;
    }
    const resultat = lireTout(phrase, contexte);
    // Les morceaux que le lecteur n'a pas su lire partent au journal : ils ne
    // bloquent rien, et leur relecture dit dans quels mots l'application est
    // sourde.
    for (const perdu of resultat.ignores ?? []) onIncomprise(perdu, 'incompris');
    if (resultat.action === 'commandes') {
      setCommandes(resultat.fiches);
      return;
    }
    // L'annulation ouvre son écran de confirmation : rien n'est supprimé ici.
    if (resultat.action === 'annulation') {
      onAnnulation(resultat);
      onFermer();
      return;
    }
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
              setCommandes(null);
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

          {/*
            Une carte par commande. Chacune se retire seule — le lecteur a pu
            couper une phrase là où l'usager ne voulait pas — et un seul
            « Confirmer » lance le tout, une fiche après l'autre.
          */}
          {commandes !== null && (
            <View style={styles.resultat}>
              <Text style={styles.resume}>{t('dictee.plusieurs', { count: commandes.length })}</Text>
              {commandes.map((commande, rang) => (
                <View key={rang} style={styles.carte}>
                  <Ionicons name={ICONE_COMMANDE[commande.action] ?? 'ellipse-outline'} size={16} color={accent} />
                  <Text style={styles.carteTexte} numberOfLines={2}>
                    {resumerCommande(commande, langue, t)}
                  </Text>
                  <Pressable
                    onPress={() => setCommandes(commandes.filter((_, n) => n !== rang))}
                    accessibilityRole="button"
                    accessibilityLabel={t('commun.retirer')}
                    hitSlop={12}>
                    <Ionicons name="close" size={16} color={couleurs.doux} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

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

          {fiche?.action === 'dispo' && (
            <View style={styles.resultat}>
              <Text style={styles.resume}>
                {t(fiche.retirer ? 'dictee.disposRetirees' : 'dictee.disposComprises', {
                  count: fiche.declarations.reduce((n, d) => n + d.dates.length, 0),
                })}
              </Text>
              {fiche.declarations.map((d, rang) => (
                <Text key={rang} style={styles.questionTexte}>
                  {resumerDeclaration(d, langue, t)}
                </Text>
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
            titre={t(
              commandes !== null && commandes.length > 0
                ? 'commun.confirmer'
                : fiche?.action === 'dispo'
                  ? 'commun.enregistrer'
                  : 'dictee.termine'
            )}
            onPress={terminer}
            desactive={phrase.trim().length === 0 || commandes?.length === 0}
          />
          <Pressable onPress={onFermer} hitSlop={8}>
            <Text style={styles.annuler}>{t('commun.annuler')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** L'icône d'une commande, dans la liste de confirmation. */
const ICONE_COMMANDE: Partial<Record<Fiche['action'], 'calendar-outline' | 'close-circle-outline' | 'checkmark-circle-outline' | 'business-outline'>> = {
  quart: 'calendar-outline',
  annulation: 'close-circle-outline',
  dispo: 'checkmark-circle-outline',
  pharmacie: 'business-outline',
};

/** Une commande, en une ligne, telle qu'elle apparaît sur sa carte. */
function resumerCommande(
  commande: Fiche,
  langue: Langue,
  traduire: (cle: string, valeurs?: Record<string, unknown>) => string
): string {
  if (commande.action === 'quart') return resumer(commande, traduire);
  if (commande.action === 'dispo') {
    return commande.declarations.map((d) => resumerDeclaration(d, langue, traduire)).join(' · ');
  }
  if (commande.action === 'annulation') {
    // La carte ne nomme pas la pharmacie : le lecteur peut avoir plusieurs
    // candidats, et c'est l'écran d'annulation qui les montre un par un.
    const quand = commande.date ? formatDateCourte(commande.date, langue) : '';
    return [traduire('annulation.titre'), quand].filter(Boolean).join(' : ');
  }
  if (commande.action === 'pharmacie') {
    return traduire('dictee.creerPharmacie', { nom: commande.recherche });
  }
  return traduire('dictee.incompris');
}

/** Une déclaration de disponibilité, en une ligne lisible. */
function resumerDeclaration(
  declaration: DeclarationDispo,
  langue: Langue,
  traduire: (cle: string, valeurs?: Record<string, unknown>) => string
): string {
  const jours = declaration.dates.map((d) => formatDateCourte(d, langue)).join(', ');
  if (declaration.touteLaJournee) return jours;
  return `${jours} · ${declaration.heureDebut} – ${declaration.heureFin}`;
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
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayon,
    paddingVertical: espace.s,
    paddingHorizontal: espace.m,
    minHeight: 44,
  },
  carteTexte: { flex: 1, fontSize: 14, fontFamily: police.normal, color: couleurs.texte },
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
