# Pharmacien remplaçant

Application mobile personnelle pour un pharmacien qui travaille dans plusieurs
pharmacies. Horaire, conditions et codes d'accès par pharmacie, frais par quart,
statistiques, factures PDF et leur paiement, suivi de la formation continue et
des documents professionnels.

Tout reste sur l'appareil, à une exception près : la recherche d'adresse et le
calcul de la distance interrogent OpenRouteService. Pas de compte, pas de
serveur, pas de partage entre usagers. Une installation = un usager.

## Deux règles

Elles tranchent la plupart des questions d'interface :

- **Zéro friction.** Jamais plus de cinq secondes d'hésitation. Le chemin
  courant tient en un geste, et il existe toujours une sortie : « revenir à ça
  plus tard », une saisie manuelle, un champ qu'on laisse vide.
- **Tout automatiser.** Les rappels et les vérifications partent d'eux-mêmes. Un
  quart travaillé se compte tout seul, et l'usager n'a pas à se demander quelles
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
être ignorées selon la plateforme. Rien de vital n'en dépend : un quart est
compté sans elles, et le mémo de correction ne fait que rappeler une exception.

## Écrans

- **Horaire** — agenda, liste ou carte, toutes pharmacies confondues. Une fois
  par mois, la bannière des factures à faire s'affiche en haut. Un quart qui en
  chevauche un autre est encadré en rouge. De là : statistiques, liste des
  pharmacies, ajout et modification d'un quart.
- **Liens et infos utiles** — numéros d'urgence, organismes, références
  cliniques, information aux patients, rappels. Contenu écrit en dur dans
  `src/content/liens.ts`.
- **Profil** — compteur de formation continue, échéances des documents
  professionnels, coordonnées imprimées sur les factures, apparence, réglages.

Sous-écrans : fiche par pharmacie, modification d'un quart, frais d'un quart,
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

## Agenda

Un sélecteur principal à trois choix — agenda, liste, carte — garde le haut de
l'écran dégagé. Dans l'agenda, un sous-choix discret bascule entre trois
affichages.

| Affichage | Ce qu'il montre |
| --- | --- |
| Jour | une colonne, lisible même avec deux quarts dans la journée |
| Semaine | sept colonnes, du lundi au dimanche |
| Mois | la grille classique, une pastille sur les jours qui portent un quart |

Jour et semaine sont des colonnes façon Google Agenda : chaque quart est un bloc
vertical dont la hauteur correspond à ses heures, et les quarts qui se
chevauchent se partagent la largeur. C'est ce qui rend visibles d'un coup d'œil
les trous et les chevauchements d'une même journée entre deux pharmacies — ce
qu'une liste ne montre pas. La plage d'heures affichée se resserre autour des
quarts du jour, sans jamais descendre sous huit heures.

## Créer plusieurs quarts d'un coup

Un contrat de deux semaines, ce sont dix quarts identiques. Le nombre de gestes
ne doit pas grandir avec la durée du contrat, alors trois mécanismes se
complètent :

- **Récurrence.** À la création d'un quart, cocher des jours de la semaine et un
  nombre de semaines crée toute la série d'un coup. Chaque quart reste ensuite
  modifiable seul : un contrat réel n'est jamais parfaitement régulier.
- **Duplication.** Sur un quart existant, *Dupliquer ce quart* ouvre un
  formulaire prérempli ; il ne reste que la date à changer.
- **Glisser-déposer.** Dans les vues jour et semaine, rester appuyé sur un bloc
  arme une copie ; on la glisse vers un autre jour et une autre heure. Au dépôt,
  l'heure s'aimante au quart d'heure le plus proche — sur un petit écran, 9 h 00
  et 9 h 10 se jouent à quelques pixels — puis le formulaire s'ouvre pour
  confirmer.

Le calcul des dates vit dans `src/lib/recurrence.ts`, sans dépendance native.

## Vérification à l'ajout d'un quart

À l'enregistrement, les heures du nouveau quart sont comparées à celles des
quarts déjà pris le même jour. Aucun calcul de distance : seulement des heures
et des noms de pharmacies.

| Cas | Réponse |
| --- | --- |
| Les heures se chevauchent | l'enregistrement est bloqué, avec les options utiles : modifier ce quart-ci, ouvrir l'autre, le supprimer, ou enregistrer quand même |
| Pharmacies différentes, moins d'une heure d'écart | avertissement qui ne bloque pas |
| Même pharmacie, ou une heure ou plus d'écart | rien |

Une série est vérifiée sur chacune de ses dates : deux semaines de contrat
peuvent tomber sur un quart déjà pris un seul de ces jours-là.

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

## Confirmation automatique d'un quart

Un quart est compté comme travaillé selon ses heures prévues, automatiquement,
sans que l'usager touche à quoi que ce soit. Il n'y a rien à valider, pas de
statut « à valider », pas de pastille sur l'onglet Horaire. Un quart peut
déborder ou ne pas avoir lieu, mais c'est l'exception : demander un geste pour
approuver ce qui est déjà vrai serait exactement la friction que la première
règle interdit.

Deux heures après l'heure de fin prévue — le temps de rentrer chez soi — un mémo
rappelle de corriger les heures si elles étaient différentes. Il ne demande
rien. Le toucher ouvre l'écran de modification du quart, les sélecteurs déjà
préremplis ; l'ignorer est un choix valide et sans conséquence.

Ce fonctionnement tient parce que la personne qui a fait des heures
supplémentaires est la plus motivée qui soit à aller les inscrire : c'est de
l'argent dans sa poche.

Sur un quart déjà passé, les sélecteurs d'heure portent les heures réelles. Les
heures prévues sont un fait comptable et ne bougent pas ; elles restent le repli
quand aucune correction n'a été faite. Un bouton distinct, *le quart n'a pas eu
lieu*, le sort des statistiques et des factures — le mot « annuler » serait
ambigu à côté d'une suppression.

## Frais d'un quart

Le kilométrage et le repas ne se réclament pas de la même façon à chaque quart.
Une semaine dans le Nord, le propriétaire rembourse le trajet aller le lundi et
le retour le vendredi, mais rien du mardi au jeudi — alors que le repas se
réclame les cinq jours. Les frais vivent donc sur le quart, pas sur la
pharmacie.

La hiérarchie va des réglages du profil à la fiche de la pharmacie, puis au
quart. La fiche ne porte que les valeurs habituelles, qui préremplissent chaque
nouveau quart en silence. Modifier une valeur habituelle ne change que les
quarts créés ensuite : un quart déjà entré est un fait comptable.

Dans le formulaire d'un quart, les frais tiennent en une ligne repliée —
« Frais · 40 km · repas 25,00 $ » — avec un *modifier* à côté. Le cas normal ne
demande aucun geste ; l'exception en demande un. Aucun pop-up de confirmation au
moment de choisir la pharmacie : il interromprait chaque ajout de quart pour
servir un cas rare.

## Frais extra

En plus des heures, chaque quart accepte des frais ponctuels : une description
libre — pas de catégories imposées, elles orientent vers des cas qui n'arrivent
pas — un montant, et une photo du reçu. Sans reçu, l'application avertit sans
bloquer : c'est un argument de crédibilité pour l'usager honnête, pas un verrou
anti-fraude.

Les frais extra s'ajoutent au total de la facture de leur pharmacie, en lignes
détaillées, et se comptent dans les statistiques.

## Facture

Une facture par pharmacie. Sélectionner une période et trois pharmacies produit
trois PDF distincts, chacun avec son numéro, ses quarts et son total. L'écran
qui suit les liste avec un bouton Partager sur chacun : on les envoie une à une,
chacune à sa pharmacie.

Le kilométrage, le per diem et les frais extra de chaque facture s'additionnent
à partir de ses propres quarts : c'est ce qui permet de facturer un repas tous
les jours et le trajet seulement à l'aller et au retour. L'hébergement est un montant saisi pour
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
- 2 h après la fin de chaque quart, le mémo de correction des heures. Toucher la
  notification ouvre directement le quart. Il ne demande aucune confirmation.
- Avant l'expiration de chaque document professionnel, à 9 h, selon le nombre de
  jours défini pour ce document.

Les rappels sont reprogrammés à chaque modification et annulés à la suppression.

## Direction visuelle

Un seul accent : un mauve franc, choisi parmi quatre dans Profil › Apparence. Le
choix se fait sur un vrai écran, parce qu'un mauve ne se juge pas sur papier, et
s'applique immédiatement partout.

Les quatre sont à la même luminosité — celle d'un mauve ardoise, ni pâle ni
presque noir — et ne diffèrent que par la teinte, du plus froid au plus chaud.
Tous sont nettement saturés : un mauve grisé devient fade, quasi pastel. Tous
passent 5:1 de contraste avec du texte blanc, donc n'importe lequel reste
lisible sur un bouton.

Le reste est fixe : fond blanc cassé chaud (`#F6F4F2`), un seul rayon d'arrondi
global (`rayon`), Nunito partout, les icônes d'Ionicons seulement, des
transitions courtes. Les variations claires ou foncées de l'accent ne font que
de l'ambiance et ne portent jamais d'information. Les couleurs d'état — succès,
alerte, échéance sur la carte, paiement d'une facture — ne suivent pas l'accent :
elles doivent rester lisibles quel que soit le mauve.

L'application ne se montre qu'au moment d'un accomplissement : une coche verte
d'une seconde quand une série de quarts est créée ou une facture générée
(`src/ui/Recompense.tsx`). Jamais au début d'un quart — la personne est pressée
à ce moment-là.

## Détails d'interface qui comptent

Deux comportements que rien ne signale mais que l'absence rendrait pénible :

- Les sélecteurs de date et d'heure s'ouvrent dans une feuille pleine largeur.
  Posé dans une colonne à demi-largeur, un sélecteur iOS déborde de l'écran.
- Le clavier se ferme au défilement, au toucher n'importe où en dehors d'un
  champ, et par une touche *Terminé* — un pavé numérique n'ayant pas de touche
  de retour sur iOS, une barre lui en donne une. Tout écran de saisie passe par
  le composant `Ecran`, qui s'en charge.

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

Le schéma est versionné par `PRAGMA user_version` (actuellement 3). Une base
d'une version antérieure est **effacée et recréée** au démarrage, secrets
compris : l'application n'a pas encore d'usagers dont il faudrait préserver les
données, et une recréation vaut mieux qu'une migration à moitié juste. Passer
d'une version à l'autre veut donc dire ressaisir ses pharmacies.

## Modèle de données

- `pharmacies` — nom, adresse structurée et coordonnées, contact (nom,
  téléphone, courriel), notes, logiciel utilisé, et les conditions décrites plus
  haut.
- `quarts` — pharmacie, date, heures prévues et heures réelles, indicateur de
  quart annulé, taux horaire, kilométrage ou montant fixe de déplacement, repas
  réclamé, pause, notes, identifiant de série de récurrence, identifiants des
  rappels programmés. Une heure de fin antérieure à l'heure de début désigne un
  quart de nuit : la durée est calculée sur le lendemain.
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

Live Activities et Dynamic Island, contenu d'information réglementaire,
fonctions d'IA — dont le remplissage de quarts à partir d'un texte collé, qui se
posera par-dessus la structure actuelle puisque les frais y vivent déjà au
niveau de chaque quart —, fonctions multi-usagers, checklist de début et de fin
de quart, calcul du temps de trajet réel entre deux pharmacies, TPS et TVQ.
