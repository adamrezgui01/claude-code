# Pharmacien remplaçant

Application mobile personnelle pour un pharmacien qui travaille dans plusieurs
pharmacies. Horaire, conditions et codes d'accès par pharmacie, statistiques,
factures PDF, suivi de la formation continue et des documents professionnels.

Tout reste sur l'appareil, à une exception près : le calcul de la distance
jusqu'à une pharmacie interroge un service d'itinéraire. Pas de compte, pas de
serveur, pas de partage entre usagers. Une installation = un usager.

## Démarrer

```bash
npm install
npx expo start
```

Puis ouvrir le projet dans Expo Go (ou dans un build de développement) sur le
téléphone.

Les notifications locales fonctionnent de façon fiable dans un build de
développement (`npx expo run:android` / `run:ios`). Dans Expo Go, elles peuvent
être ignorées selon la plateforme ; l'application continue de fonctionner, seuls
les rappels ne sont pas programmés.

## Écrans

- **Horaire** — calendrier mensuel ou liste des quarts à venir, toutes
  pharmacies confondues. Un quart qui en chevauche un autre est encadré en rouge.
  De là : statistiques, liste des pharmacies, ajout et modification d'un quart.
- **Liens et infos utiles** — numéros d'urgence, organismes, références
  cliniques, information aux patients, rappels. Contenu écrit en dur dans
  `src/content/liens.ts`.
- **Profil** — compteur de formation continue, échéances des documents
  professionnels, coordonnées imprimées sur les factures, réglages.

Sous-écrans : fiche par pharmacie, statistiques, génération de factures,
historique des factures.

## La pharmacie porte ses conditions

Un remplaçant fréquente des dizaines de pharmacies, chacune avec ses propres
conditions. Elles vivent donc dans la fiche de la pharmacie, pas dans un réglage
global :

- taux horaire habituel ;
- per diem par jour ;
- mode de remboursement du déplacement : aucun, au kilomètre (distance
  aller-retour × taux par kilomètre) ou montant fixe par quart.

Créer un quart dans une pharmacie reprend ces valeurs automatiquement ; elles
restent modifiables pour un quart en particulier sans toucher à la fiche.

Le seul montant resté dans les réglages est le taux par kilomètre par défaut,
qui sert à préremplir une nouvelle fiche.

Partout où l'on choisit une pharmacie, la sélection se fait par recherche, avec
les pharmacies récentes en premier et la liste complète en dessous.

## Stockage

| Donnée | Où | Pourquoi |
| --- | --- | --- |
| Pharmacies, quarts, documents, factures, réglages | SQLite locale (`expo-sqlite`, base `pharmacien.db`) | Requêtes par période et par pharmacie |
| Codes d'accès, identifiants du logiciel de pharmacie | Trousseau du système (`expo-secure-store` : Keychain sur iOS, Keystore sur Android) | Ne doivent pas se retrouver en clair dans la base |

Les secrets sont enregistrés sous les clés `codes_pharmacie_<id>` (tableau JSON
de `{ libelle, valeur }`) et `identifiants_pharmacie_<id>`
(`{ utilisateur, motDePasse }`). Supprimer une pharmacie supprime ses quarts en
cascade, ses secrets et les rappels associés.

Le schéma migre de lui-même au démarrage : `initialiserBase` crée ce qui manque,
puis `migrer` ajoute les colonnes absentes d'une base plus ancienne. Les
opérations testent la présence de chaque colonne, donc elles peuvent être
rejouées sans dommage.

## Modèle de données

- `pharmacies` — nom, adresse, contact (nom, téléphone, courriel), notes,
  logiciel utilisé, et les conditions décrites plus haut.
- `quarts` — pharmacie, date, heures, taux horaire, kilométrage ou montant fixe
  de déplacement, notes, identifiant du rappel programmé. Une heure de fin
  antérieure à l'heure de début désigne un quart de nuit : la durée est calculée
  sur le lendemain.
- `factures` — une par pharmacie : numéro, période, totaux, et le HTML rendu.
- `reglages` — coordonnées du pharmacien (nom, permis OPQ, adresse, téléphone,
  courriel), taux par kilomètre par défaut, clé du service d'itinéraire. Une
  seule ligne.
- `formation_continue` — heures complétées, heures requises, fin de la période
  de référence. Une seule ligne.
- `documents` — nom, date d'expiration, préavis, identifiant du rappel.

## Facture

Une facture par pharmacie. Sélectionner une période et trois pharmacies produit
trois PDF distincts, chacun avec son numéro, ses quarts et son total. L'écran
qui suit les liste avec un bouton Partager sur chacun : on les envoie une à une,
chacune à sa pharmacie.

Le kilométrage et le per diem de chaque facture se calculent à partir des
conditions de sa pharmacie. L'hébergement est un montant saisi pour l'occasion,
un champ par pharmacie. Aucun poste à zéro ne s'imprime.

Le HTML rendu est conservé en base : repartager une facture redonne le document
envoyé, même si les conditions de la pharmacie ont changé depuis.

Le calcul vit dans `src/lib/facture.ts`, sans dépendance native, ce qui le rend
vérifiable hors application. `src/lib/facturePdf.ts` ne fait que l'impression et
le partage.

## Calcul de la distance

Dans la fiche d'une pharmacie, le bouton *Calculer la distance* :

1. convertit votre adresse et celle de la pharmacie en coordonnées avec le
   géocodeur du système, sur l'appareil, sans clé ;
2. demande la distance routière à OpenRouteService avec la clé saisie dans
   Profil › Réglages ;
3. inscrit l'aller-retour, arrondi au kilomètre. Le champ reste modifiable.

Sans clé, ou si le service ne répond pas, l'application propose d'ouvrir
l'itinéraire dans Plans ou Google Maps pour lire la distance soi-même.

C'est la seule fonction qui envoie des données à l'extérieur de l'appareil : les
deux adresses partent vers le service d'itinéraire. Tout le fournisseur est
contenu dans `src/lib/distance.ts` ; en changer n'affecte rien d'autre.

## Notifications locales

- 24 h avant le début de chaque quart.
- Avant l'expiration de chaque document professionnel, à 9 h, selon le nombre de
  jours défini pour ce document.

Les rappels sont reprogrammés à chaque modification et annulés à la suppression.

## Hors de cette version

Contenu d'information réglementaire, révision hebdomadaire, remplissage d'un
quart par IA, fonctions multi-usagers, checklist de début et de fin de quart,
TPS et TVQ.
