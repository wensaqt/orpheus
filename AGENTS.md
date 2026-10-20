# Critères qualité — Orpheus

Ces consignes s'appliquent à tout le repository. Privilégier du code dont les intentions et le parcours se comprennent à la lecture, sans abstractions inutiles.

## Lisibilité et découpage

- Une fonction porte une intention identifiable. Son nom décrit l'opération, de préférence avec le vocabulaire métier : `restorePreviousXml` plutôt que `processData`.
- Au-delà de 5–10 lignes de logique, examiner le découpage. Cette limite est indicative : une fonction plus longue reste acceptable si sa longueur est justifiée et son intention cohérente. Ne pas compter mécaniquement le JSX ou les déclarations de configuration comme de la logique.
- Extraire des helpers nommés pour les étapes indépendantes, en laissant le parcours principal visible. Éviter les getters/setters artificiels et le découpage qui oblige à ouvrir de nombreux fichiers pour comprendre une seule opération.
- Un module correspond à une responsabilité cohérente. Garder les petits helpers locaux lorsqu'ils ne servent que ce module.

## Simplicité, types et état

- Réutiliser les types et constantes existants. Dériver les types de leur source plutôt que recopier des structures.
- Nommer les valeurs dont le sens métier n'est pas évident. Ne pas extraire chaque littéral anodin en constante.
- Éviter les conditions dupliquées, abstractions spéculatives et fallbacks sans cas concret. Mutualiser lorsque cela clarifie une règle commune, sans coupler des comportements distincts.
- Garder une source de vérité claire pour chaque information. Déduire les valeurs simples plutôt que les stocker dans un état supplémentaire.

## React et opérations asynchrones

- Utiliser `useCallback` et `useMemo` pour un besoin identifié : identité stable requise par un consommateur, ou calcul dont la mémorisation est utile. Documenter la raison lorsqu'elle n'est pas évidente, ainsi que les dépendances inhabituelles.
- Rendre explicites les mutations, sauvegardes et requêtes. Préserver leur ordre et gérer les résultats obsolètes, les opérations concurrentes et les nettoyages nécessaires.
- Ne pas avaler silencieusement les erreurs. Prévoir un traitement adapté : retour typé, feedback utilisateur ou diagnostic exploitable. Un fallback ne doit pas cacher un invariant cassé.

## Commentaires et interface

- Écrire les commentaires de code et les JSDoc toujours en anglais.
- Expliquer les raisons, contraintes et invariants difficiles à déduire ; éviter les commentaires qui paraphrasent le code.
- Réutiliser le design system et les composants existants avant d'en créer de nouveaux. Garder les nouveaux composants génériques seulement lorsque leur usage le justifie.
- Préserver l'accessibilité et prévoir les contraintes de largeur, notamment le padding et l'overflow des panneaux.
- Suivre le mécanisme de traduction existant pour les nouveaux textes d'interface.

## Périmètre et validation

- Rédiger les titres et descriptions des pull requests toujours en anglais.
- Séparer les refactors des changements fonctionnels. Un nettoyage conserve le comportement ; signaler explicitement toute exception nécessaire.
- Rester dans le périmètre demandé. Éviter les réécritures ou corrections sans rapport avec la tâche.
- Tester les comportements et les régressions plausibles, plutôt que reproduire l'implémentation dans les tests. Protéger particulièrement la persistance, l'undo et la concurrence asynchrone.
- Adapter la validation au risque : pas de test e2e systématique pour une petite retouche visuelle. Pour un refactor sensible, caractériser les transitions avant extraction et réutiliser les tests pertinents.
- Vérifier les types et le lint pour les changements de code. Rapporter les vérifications exécutées et leurs limites.
