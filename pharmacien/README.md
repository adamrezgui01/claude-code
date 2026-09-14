# Pharmacien remplaçant

Application mobile personnelle pour un pharmacien qui travaille dans plusieurs
pharmacies. Horaire, conditions et codes d'accès par pharmacie, validation des
quarts, frais extra, statistiques, factures PDF et leur paiement, suivi de la
formation continue et des documents professionnels.

Tout reste sur l'appareil, à une exception près : la recherche d'adresse et le
calcul de la distance interrogent OpenRouteService. Pas de compte, pas de
serveur, pas de partage entre usagers. Une installation = un usager.

## Deux règles

Elles tranchent la plupart des questions d'interface :

- **Zéro friction.** Jamais plus de cinq secondes d'hésitation. Le chemin
  courant tient en un geste, et il existe toujours une sortie : « revenir à ça
  plus tard », une saisie manuelle, un champ qu'on laisse vide.
- **Tout automatiser.** Les rappels et les vérifications partent d'eux-mêmes.
  L'usager n'a pas à penser à valider un quart, ni à se demander quelles
  factures sont impayées.

## Démarrer

```bash
npm install
npx expo start
```

Puis ouvrir le projet dans Expo Go (ou dans un build de développement) sur le
téléphone.

Les notifications locales fonctionnent de façon fiable dans un build de
développement (`npx expo run:android` / `run:ios`). Dans Expo Go, elles peuvent
être ignorées selon la plateforme ; le badge « à valider » reste juste, parce
qu'il se déduit de l'heure de fin des quarts et non des notifications reçues.

## Écrans

- **Horaire** — calendrier, liste ou carte, toutes pharmacies confondues. En
  haut : les quarts à valider, et une fois par mois la bannière des factures à
  faire. Un quart qui en chevauche un autre est encadré en rouge. De là :
  statistiques, liste des pharmacies, ajout et modification d'un quart.
- **Liens et infos utiles** — numéros d'urgence, organismes, références
  cliniques, information aux patients, rappels. Contenu écrit en dur dans
  `src/content/liens.ts`.
- **Profil** — compteur de formation continue, échéances des documents
  professionnels, coordonnées imprimées sur les factures, apparence, réglages.

Sous-écrans : fiche par pharmacie, validation d'un quart, frais d'un quart,
statistiques, génération de factures, historique des factures.

## La pharmacie porte ses conditions

Un remplaçant fréquente des dizaines de pharmacies, chacune avec ses propres
conditions. Elles vivent donc dans la fiche de la pharmacie, pas dans un réglage
global :

- taux horaire habituel ;
- per diem par jour ;
- mode de remboursement du déplacement : aucun, au kilomètre (distance
  aller-retour × taux par kilomètre) ou montant fixe par quart ;
- pause repas : durée et, séparément, si elle est payée.

Créer un quart dans une pharmacie reprend ces valeurs automatiquement ; elles
restent modifiables pour un quart en particulier sans toucher à la fiche.

Le seul montant resté dans les réglages est le taux par kilomètre par défaut,
qui sert à préremplir une nouvelle fiche.

Partout où l'on choisit une pharmacie, la sélection se fait par recherche, avec
les pharmacies récentes en premier et la liste complète en dessous.

## Adresses

L'adresse est structurée : numéro civique, rue, local, code postal, ville,
province. Le chemin normal est l'autocomplétion — l'usager tape, touche la bonne
adresse, et tous les champs se remplissent, coordonnées comprises.

Rien n'oblige à passer par là. Une pharmacie trop récente pour figurer dans la
base, ou une panne de réseau, se contournent en saisissant les champs à la main.
Une adresse incomplète ou non localisée s'enregistre quand même : la pharmacie
n'apparaît simplement pas sur la carte.

`src/lib/adresses.ts` ne contient que la mise en forme, sans dépendance native.
Le fournisseur — autocomplétion et géocodage — est isolé dans
`src/lib/adressesRecherche.ts`.

## Carte

La vue carte de l'onglet Horaire place les quarts à venir avec trois couleurs
fixes, jamais touchées par le choix d'accent :

| Couleur | Quand |
| --- | --- |
| Rouge | dans 48 h ou moins |
| Orange | dans 14 jours ou moins |
| Jaune | plus tard |
| Vert désaturé | déjà travaillé |

L'historique se règle dans un coin de la carte : 1, 3, 6 ou 12 mois. Les points
trop rapprochés se regroupent automatiquement (`supercluster`), et toucher un
point ouvre le quart, avec un bouton d'itinéraire vers la pharmacie.

## Validation des quarts

Deux heures après la fin d'un quart, une notification demande si les heures
étaient les bonnes. L'écran de validation offre trois boutons empilés :

1. **Valider** — les heures prévues deviennent les heures réelles ;
2. **Modifier les heures** — pour l'ouverture tardive ou le dépannage de deux
   heures de plus ;
3. **Le quart n'a pas eu lieu** — il sort des statistiques et des factures.

Et, en dessous, « revenir à ça plus tard », qui ne fait rien perdre.

Le statut se déduit de l'heure de fin (`statutQuart` dans `src/db/quarts.ts`) :
un quart terminé depuis plus de deux heures est *à valider*, même si la
notification n'est jamais partie. Le badge de l'onglet Horaire compte ces
quarts-là. Les heures facturées sont les heures réelles quand elles existent,
moins la pause si elle n'est pas payée.

## Frais extra

Chaque quart accepte des frais : une description libre — pas de catégories
imposées — un montant, et une photo du reçu. Sans reçu, l'application avertit
sans bloquer : c'est un rappel, pas une condition.

Les frais s'ajoutent au total de la facture de leur pharmacie, en lignes
détaillées, et se comptent dans les statistiques.

## Facture

Une facture par pharmacie. Sélectionner une période et trois pharmacies produit
trois PDF distincts, chacun avec son numéro, ses quarts et son total. L'écran
qui suit les liste avec un bouton Partager sur chacun : on les envoie une à une,
chacune à sa pharmacie.

Le kilométrage, le per diem et les frais extra de chaque facture se calculent à
partir de ses propres quarts. L'hébergement est un montant saisi pour
l'occasion, un champ par pharmacie. Aucun poste à zéro ne s'imprime. Ni TPS ni
TVQ.

Le PDF reste en noir et blanc : c'est un document comptable, pas une vitrine.

Le HTML rendu est conservé en base : repartager une facture redonne le document
envoyé, même si les conditions de la pharmacie ont changé depuis.

Le calcul vit dans `src/lib/facture.ts`, sans dépendance native, ce qui le rend
vérifiable hors application. `src/lib/facturePdf.ts` ne fait que l'impression et
le partage.

### Paiement

Une facture est *en attente* (gris) ou *payée* (vert). Un geste suffit pour la
marquer payée dans l'historique. Pas de badge rouge, pas de relance : une
facture impayée n'est pas une faute.

Une fois par mois, l'onglet Horaire affiche une bannière qui rappelle de faire
ses factures. La repousser la fait taire une semaine
(`src/lib/rappelFactures.ts`).

## Notifications locales

- 48 h avant le début de chaque quart.
- Des rappels secondaires facultatifs, aux délais choisis dans Profil (par
  défaut 3 h avant).
- 2 h après la fin de chaque quart, la demande de validation. Toucher la
  notification ouvre directement l'écran de validation du quart.
- Avant l'expiration de chaque document professionnel, à 9 h, selon le nombre de
  jours défini pour ce document.

Les rappels sont reprogrammés à chaque modification et annulés à la suppression.

## Direction visuelle

Un seul accent : un mauve poussiéreux, choisi parmi quatre dans
Profil › Apparence. Le choix se fait sur un vrai écran, parce qu'un mauve ne se
juge pas sur papier, et s'applique immédiatement partout.

Le reste est fixe : fond blanc cassé chaud (`#F6F4F2`), un seul rayon d'arrondi
global (`rayon`), Nunito partout, les icônes d'Ionicons seulement, des
transitions courtes. Les couleurs d'état — succès, alerte, échéance sur la carte
— ne suivent pas l'accent : elles doivent rester lisibles quel que soit le mauve.

L'application ne se montre qu'au moment d'un accomplissement : une coche verte
d'une seconde quand un quart est validé ou une facture générée
(`src/ui/Recompense.tsx`). Jamais au début d'un quart.

## Stockage

| Donnée | Où | Pourquoi |
| --- | --- | --- |
| Pharmacies, quarts, frais, documents, factures, réglages | SQLite locale (`expo-sqlite`, base `pharmacien.db`) | Requêtes par période et par pharmacie |
| Codes d'accès, identifiants du logiciel de pharmacie | Trousseau du système (`expo-secure-store` : Keychain sur iOS, Keystore sur Android) | Ne doivent pas se retrouver en clair dans la base |
| Photos des reçus | Dossier de l'application (`expo-file-system`) | Elles ne sortent jamais de l'appareil |

Les secrets sont enregistrés sous les clés `codes_pharmacie_<id>` (tableau JSON
de `{ libelle, valeur }`) et `identifiants_pharmacie_<id>`
(`{ utilisateur, motDePasse }`). Supprimer une pharmacie supprime ses quarts en
cascade, ses frais, ses secrets et les rappels associés.

Le schéma est versionné par `PRAGMA user_version`. Une base d'une version
antérieure est **effacée et recréée** au démarrage, secrets compris :
l'application n'a pas encore d'usagers dont il faudrait préserver les données, et
une recréation vaut mieux qu'une migration à moitié juste. Passer d'une version
à l'autre veut donc dire ressaisir ses pharmacies.

## Modèle de données

- `pharmacies` — nom, adresse structurée et coordonnées, contact (nom,
  téléphone, courriel), notes, logiciel utilisé, et les conditions décrites plus
  haut.
- `quarts` — pharmacie, date, heures prévues et heures réelles, statut, taux
  horaire, kilométrage ou montant fixe de déplacement, pause, notes,
  identifiants des rappels programmés. Une heure de fin antérieure à l'heure de
  début désigne un quart de nuit : la durée est calculée sur le lendemain.
- `frais_extra` — quart, description, montant, chemin de la photo du reçu.
- `factures` — une par pharmacie : numéro, période, totaux, statut de paiement
  et le HTML rendu.
- `reglages` — coordonnées du pharmacien (nom, permis OPQ, adresse, téléphone,
  courriel), taux par kilomètre par défaut, clé OpenRouteService, accent choisi,
  rappels secondaires. Une seule ligne.
- `formation_continue` — heures complétées, heures requises, fin de la période
  de référence. Une seule ligne.
- `documents` — nom, date d'expiration, préavis, identifiant du rappel.

## Calcul de la distance

Dans la fiche d'une pharmacie, le bouton *Calculer la distance* :

1. utilise les coordonnées venues de l'autocomplétion, ou géocode l'adresse avec
   le géocodeur du système, sur l'appareil, sans clé ;
2. demande la distance routière à OpenRouteService avec la clé saisie dans
   Profil › Réglages ;
3. inscrit l'aller-retour, arrondi au kilomètre. Le champ reste modifiable.

Sans clé, ou si le service ne répond pas, l'application propose d'ouvrir
l'itinéraire dans Plans ou Google Maps pour lire la distance soi-même.

C'est, avec l'autocomplétion d'adresse, la seule fonction qui envoie des données
à l'extérieur de l'appareil. Tout le fournisseur est contenu dans
`src/lib/distance.ts` et `src/lib/adressesRecherche.ts` ; en changer n'affecte
rien d'autre.

## Hors de cette version

Live Activities, contenu d'information réglementaire, fonctions d'IA, fonctions
multi-usagers, checklist de début et de fin de quart, calcul du temps de trajet
réel, TPS et TVQ.
