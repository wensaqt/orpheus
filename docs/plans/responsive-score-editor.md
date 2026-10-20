# Responsive de l’éditeur de partitions

Ébauche sur `feat/score-editor`. Ce plan prend en compte les changements locaux sur les mesures et les instruments. Il prépare l’implémentation ; aucun changement fonctionnel n’est inclus.

## Objectif et parcours

Sur téléphone, pouvoir ouvrir ou importer une partition, la lire, sélectionner une note prise en charge, corriger sa hauteur, gérer les mesures et transposer sans devoir utiliser un ordinateur. Ces opérations gardent les règles musicales, l’historique et les protections de sauvegarde existants.

Hypothèse de départ à valider : lecture **et** édition sur téléphone dès la première version.

## Première itération — réalisée

- Cadre compact partagé avec le texte, largeur des partitions corrigée et header tactile avec undo/redo directs. Les menus Fichier/Édition existants sont conservés.
- Recomposition sur changement de largeur sans recharger MusicXML ; les changements de hauteur seuls sont ignorés et les sélections graphiques sont réindexées après rendu.
- Arrêt de l’observation et annulation des frames obsolètes lors d’un changement de document ; diagnostic et récupération après une erreur de recomposition.
- Panneau d’outils placé en bas sur téléphone, contrôles agrandis et validation d’import basée sur la largeur hors padding.
- Tests unitaires de recomposition et tests navigateur de rotation, correction, sauvegarde, undo/redo, piano polyphonique et tablette tactile.

Restent pour les itérations suivantes : panneau repliable conservant l’aperçu, indication de sélection sur la partition, tolérance tactile, conservation d’un repère musical sur les longues partitions et rendu d’impression indépendant du téléphone.

## Présentation cible

- Téléphone : partition sur toute la largeur disponible, systèmes successifs en défilement vertical, menu Actions et undo/redo accessibles. La barre existante de navigation entre documents reste disponible.
- Tablette portrait : même lecture fluide ; les outils restent escamotables.
- Tablette paysage : classeur ou outils latéraux seulement lorsque la largeur restante permet de lire la partition. Ne pas afficher deux panneaux au détriment de la musique.
- Ordinateur : conserver le parcours actuel.

Recomposer les systèmes à la largeur disponible plutôt que réduire toute une partition à une miniature. Certaines mesures denses peuvent dépasser une largeur confortable : leur débordement reste contenu dans la zone de partition, avec défilement horizontal local. Ne jamais masquer automatiquement des instruments pour faire tenir la musique.

## Constats dans le code

1. `EditorShell.tsx` exclut explicitement les partitions de `data-continuous`. Cela coupe également les tailles de commandes et la mise en page compacte du texte. Le tiroir du classeur et la navigation mobile existent déjà.
2. `EditorShell.module.css` garde une grille de trois colonnes pour `[data-score='true']`. Sa spécificité dépasse celle de la règle mobile `.desk`, alors que `.column` est déplacée en première colonne sur petit écran. La géométrie doit être corrigée explicitement pour les partitions.
3. `ScoreRenderer.tsx` ne relance le rendu qu’à un changement de XML et `scoreRendering.ts` configure OSMD avec `autoResize: false`. Rotation, ouverture du classeur et changement de largeur peuvent laisser une géométrie obsolète.
4. `ScorePanel` est une section fixe en haut à droite. Sur téléphone, elle couvre une grande partie de la musique. Sa hauteur repose sur une variable de header qui ne correspond pas nécessairement à la hauteur du header des partitions.
5. La sélection se fait par clic et proximité dans les coordonnées OSMD. Le tap peut produire ce clic, mais la précision au doigt et la distinction entre défilement et sélection ne sont pas testées.
6. `closePanel()` annule actuellement l’aperçu de transposition : replier les outils pour regarder la partition doit être une action distincte de fermer/annuler.
7. L’import est validé par un rendu hors écran dont la largeur vient de `.sheet.clientWidth`, sans soustraire son padding. La validation doit utiliser la même largeur utile et les mêmes options que le rendu visible.

## Découpage proposé

### 1. Adapter le cadre de l’éditeur

- [ ] Réutiliser `useEditorDisplay` pour les capacités d’écran, sans faire du mode texte continu la condition de toute interface compacte.
- [ ] Distinguer les capacités communes (écran compact, classeur disponible) du mode de présentation du document (texte continu ou partition).
- [ ] Corriger explicitement les colonnes, les contraintes de largeur et les marges pour les partitions mobiles.
- [ ] Adapter le header : titres bornés, commandes tactiles, undo/redo et menu Actions. Réutiliser les commandes de `ScoreMenuBar`.
- [ ] Réserver l’espace de la barre de navigation, des zones de sécurité et des erreurs. Les titres restent visibles pendant le renommage.

Livrable : partition et commandes accessibles dès 320 px, sans débordement horizontal du document HTML.

### 2. Rendre le rendu musical sensible à sa largeur

- [ ] Observer la largeur utile du conteneur de partition avec `ResizeObserver`.
- [ ] Séparer le chargement du XML et le recalcul de sa présentation. Un redimensionnement ne recharge pas le document ni son historique.
- [ ] Regrouper les notifications de largeur dans une frame ; ignorer les largeurs inchangées ou nulles. La hauteur du clavier ne déclenche pas à elle seule un nouveau rendu musical.
- [ ] Recalculer les systèmes OSMD à cette largeur. Les types installés proposent déjà le format `Endless` et des retours de système calculés par le moteur : vérifier leur résultat sur les fixtures simples, piano et multi-instruments avant de figer les options.
- [ ] Invalider la sélection graphique pendant un rendu, puis reconstruire son index sur la géométrie effectivement affichée.
- [ ] Garder une génération de chargement et un nettoyage explicites : une ancienne opération ne peut ni dessiner sur un document récent, ni publier un faux état prêt.
- [ ] Conserver un repère musical visible après rotation/recomposition, de préférence la note sélectionnée ou la mesure en haut de l’écran, plutôt qu’un ancien nombre de pixels.
- [ ] Faire utiliser la largeur utile et la configuration de rendu commune à la validation d’import.

Découpage à garder local au moteur de rendu : chargement, mesure de largeur, recalcul du rendu et reconstruction de la sélection. Éviter un gros effet regroupant ces responsabilités ou une abstraction générique d’événements.

Livrable : rotation et changements de panneaux recomposent correctement la musique sans modifier le XML ni déclencher de sauvegarde.

### 3. Adapter les outils au téléphone et à la tablette

- [ ] Téléphone : panneau ancré en bas, repliable, avec commande explicite pour revenir à la partition. Pas de geste de glissement personnalisé requis dans cette première version.
- [ ] Correction : panneau non modal limité à la note sélectionnée pour permettre de toucher une autre note encore visible. Garder une sélection perceptible sur la partition.
- [ ] Transposition et mesures : mêmes composants métier, disposition adaptée ; actions importantes accessibles sans être cachées derrière le clavier.
- [ ] Replier conserve les réglages et l’aperçu. Fermer/annuler réutilise les règles existantes. Une rotation ne réinitialise pas ces données.
- [ ] Tablette : placer les outils sur le côté uniquement si la largeur utile de la partition le permet ; sinon réutiliser le panneau du téléphone.
- [ ] Réutiliser `Button`, `SelectField`, `NumberStepper` et les composants de dialogue existants lorsque l’interaction est réellement modale. Un panneau non modal ne doit pas piéger le focus.
- [ ] Centraliser uniquement les dimensions de viewport réellement partagées avec la navigation mobile. Ne pas appliquer le hook du curseur de texte à une partition.

Livrable : corriger une note, gérer les mesures et comparer une transposition tout en gardant la partition consultable.

### 4. Fiabiliser la sélection tactile

- [ ] Conserver le calcul SVG → OSMD existant et vérifier sa justesse après recomposition, défilement et zoom natif.
- [ ] Mesurer la tolérance de sélection en pixels visibles pour le tactile. Une zone plus large ne doit pas sélectionner arbitrairement une note voisine.
- [ ] Un défilement ou un pincement ne déclenche pas de correction accidentelle ; préserver les gestes natifs du navigateur.
- [ ] Si le mapping musical est ambigu ou non pris en charge, conserver la restriction actuelle et son explication. Le responsive n’élargit pas implicitement les capacités d’édition polyphonique.
- [ ] Réappliquer l’indication de note sélectionnée après un rendu, à partir de son identité dans le document et non d’un ancien élément SVG.

Livrable : sélection au doigt prévisible sur les partitions éditables, sans régression à la souris.

### 5. Préserver l’impression et les états asynchrones

- [ ] Préparer un rendu d’impression indépendant de la largeur du téléphone, puis restaurer le rendu écran et le repère musical après impression.
- [ ] Attendre le rendu demandé avant d’imprimer ; les outils, la sélection graphique et la navigation ne s’impriment pas.
- [ ] Conserver MusicXML comme source de vérité ; largeur, état du panneau et repères d’affichage ne font pas partie de l’historique musical ni de la sauvegarde.
- [ ] Préserver import validé avant remplacement, undo/redo, garde de navigation, conflit de révision, export de secours et reconnexion.
- [ ] Un rendu demandé pendant import, rotation ou aperçu ne peut pas réactiver une ancienne sélection ni rendre applicable un aperçu obsolète.

### 6. Valider les parcours complets

- [ ] Tests de rendu : resize sans rechargement XML, largeur nulle, notification inchangée, chargement dépassé par un autre, cleanup et index de sélection actualisé.
- [ ] Tests de panneaux : replier/rouvrir conserve l’aperçu ; annuler le retire ; contrôles, erreurs et focus restent accessibles avec un petit viewport.
- [ ] Tests navigateur ciblés en 320/390 px, tablette portrait/paysage et ordinateur : ouvrir/importer, sélectionner/corriger, undo/redo, ajouter/supprimer une mesure, prévisualiser/appliquer une transposition, changer de document et recharger.
- [ ] Fixtures : partition simple, piano polyphonique et partition multi-instruments dense. Vérifier la lecture même lorsque la correction directe n’est pas prise en charge.
- [ ] Vérifier une sauvegarde échouée pendant une rotation et une reconnexion sans perdre le XML modifié.
- [ ] Vérifier impression depuis téléphone et retour à la lecture, ainsi que l’absence de débordement global.
- [ ] Types et lint, puis tests existants pertinents. Vérification réelle Safari iOS/Chrome Android pour les gestes et le clavier ; l’émulation ne suffit pas pour les confirmer.

## Ordre d’implémentation

1. Cadre mobile et recomposition musicale : résoudre la largeur et établir une lecture fiable.
2. Outils adaptatifs et sélection tactile : atteindre un parcours d’édition complet sur téléphone.
3. Impression, concurrence et validation des appareils : sécuriser la livraison.

La première étape est une base technique, pas une livraison finale « lecture seule ». Le jalon fonctionnel inclut l’édition existante sur mobile.

## Hors périmètre initial

Nouvelle saisie musicale complète, piano virtuel, lecture audio, gestes personnalisés de zoom/panneau, choix de parties ou virtualisation des grandes partitions. Mesurer les performances sur les partitions représentatives avant de décider d’une optimisation supplémentaire.
