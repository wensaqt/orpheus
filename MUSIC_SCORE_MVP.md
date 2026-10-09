# Partitions musicales — cahier des charges MVP

Statut : cadrage fonctionnel validé le 8 octobre 2026. Ce document décrit le premier livrable ; les choix de fournisseurs et de bibliothèques restent à valider par prototype.

## Objectif et utilisateur

Un instrumentiste possède une partition imprimée en PDF ou en photo. Il veut obtenir rapidement une partie lisible dans une autre tonalité ou pour un autre instrument, sans recopier la musique note par note.

Parcours cible : **importer → reconnaître → vérifier et corriger → transposer → remplacer ou créer une copie → exporter**.

## Périmètre du premier livrable

- Une partition est un type de document distinct dans une composition Orpheus. Les documents texte existants restent des documents texte ; le chutier, les titres et la navigation sont partagés.
- L'import accepte un PDF ou une ou plusieurs photos d'une partition **imprimée** en notation occidentale standard. Plusieurs pages d'une même partie sont acceptées. Une partie de piano sur deux portées compte comme une seule partie.
- L'import produit une partition musicale structurée, pas seulement une image ou un PDF affiché. Le résultat est inspectable et corrigible avant utilisation.
- L'utilisateur confirme l'instrument source et peut corriger les erreurs de reconnaissance essentielles : clef, armure, mesure, hauteur et altération d'une note, durée, silence, note omise ou ajoutée. L'image importée est accessible pendant cette vérification, sans obligation de la conserver à l'écran ensuite.
- Deux opérations distinctes sont proposées : **changer la tonalité** de la partie pour le même instrument, et **adapter la partie** à un instrument cible. Une prévisualisation montre le résultat avant validation.
- La transposition actualise les notes, l'armure et les symboles d'accord reconnus, tout en conservant rythmes et autres indications musicales prises en charge. Les notes hors tessiture du nouvel instrument sont signalées ; Orpheus ne prétend pas réarranger la musique.
- Par défaut, **Remplacer cette partition** enregistre le résultat dans le document courant. **Créer une composition avec la version transposée** laisse le document courant intact et crée une composition ne contenant que la partition transposée. Les autres éléments du chutier ne sont pas copiés.
- Chaque remplacement crée auparavant une révision persistante restaurable après rechargement. L'action est également annulable pendant la session. L'import original n'est pas affiché en permanence après transposition.
- La version validée est exportable en PDF imprimable et en MusicXML contenant réellement les notes transposées.

## Profils instrumentaux initiaux

La musique doit être distinguée de sa notation pour un instrument : la hauteur écrite et la hauteur sonore peuvent différer. L'instrument source est confirmé après reconnaissance ; l'instrument cible est choisi explicitement. Une ambiguïté non résolue empêche la conversion automatique entre instruments.

| Famille                                          | Profils initiaux                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Hauteur réelle                                   | piano, violon, alto, violoncelle, flûte, hautbois, trombone, voix                             |
| Transpositeurs                                   | clarinette en si♭, trompette en si♭, saxophone alto en mi♭, saxophone ténor en si♭, cor en fa |
| Avec convention d'octave à traiter explicitement | guitare, basse électrique, contrebasse                                                        |

La guitare et la basse sont prises en charge **en notation sur portée uniquement** si leur convention d'octave est vérifiée. Les tablatures, doigtés et diagrammes d'accords ne font pas partie du MVP. Un profil instrumental définit au minimum clef/portées, écart hauteur écrite–sonore et tessiture indicative ; il ne détermine pas à lui seul comment arranger une pièce.

## Règles de fonctionnement

1. L'utilisateur choisit un document partition ou importe une nouvelle partition depuis une composition. L'import se déroule comme un traitement avec progression, erreurs explicites et possibilité de réessayer.
2. Les fichiers envoyés sont privés et accessibles uniquement à leur propriétaire et aux traitements autorisés. Ils ne réutilisent pas la collection `Media` publique telle quelle. La conservation du fichier source est limitée à ce qui est nécessaire à la reconnaissance et à la vérification ; sa durée exacte dépendra du fournisseur retenu.
3. Une reconnaissance incomplète ou une notation hors périmètre est signalée. Le système ne présente pas une image non reconnue comme une partition transposable.
4. La confirmation de l'instrument source distingue la hauteur écrite de la hauteur sonore. Changer la tonalité et changer d'instrument restent deux commandes différentes.
5. La validation d'une transposition est atomique : elle ne laisse ni document partiellement remplacé ni nouvelle composition vide. En cas d'échec, la partition précédente reste utilisable.
6. Une révision enregistrée permet de restaurer l'état précédent après fermeture de l'onglet. La création d'une copie n'altère pas l'original.
7. Le PDF exporté et le MusicXML exporté représentent la même version transposée que l'aperçu validé.

## Hors périmètre MVP

- Création complète d'une partition note par note et édition avancée ; seuls les outils nécessaires à la correction d'un import sont prévus.
- Manuscrits, tablatures, percussions non tempérées et partitions d'ensemble à plusieurs parties instrumentales.
- Arrangement automatique, adaptation de tessiture, simplification, génération d'accompagnement et lecture audio.
- Reconnaissance garantie de tous les ornements, paroles ou mises en page. Les limites de l'import doivent être visibles.

## Critères d'acceptation

- Un utilisateur peut importer une partie imprimée de plusieurs pages depuis un PDF ou des photos, confirmer l'instrument et corriger une erreur de note avant transposition.
- Pour une partie de piano en do, une transposition vers ré modifie correctement les notes, l'armure et les accords reconnus, sans changer les durées.
- Une adaptation d'une partie en hauteur réelle vers une trompette en si♭ produit la hauteur **écrite** correcte pour que la hauteur sonore reste celle de la source ; une partie hors tessiture déclenche un avertissement.
- Après **Remplacer**, le document courant montre la nouvelle partition ; l'ancienne version reste restaurable après déconnexion et rechargement.
- Après **Créer une composition**, l'original est inchangé et la nouvelle composition contient la partition transposée, sans document texte vide ajouté automatiquement.
- Le MusicXML exporté, réimporté dans un lecteur indépendant, conserve la transposition, les armures et les accords ; le PDF correspond visuellement à la version validée.
- Un fichier non reconnu, une interruption du traitement ou un échec de sauvegarde ne remplace ni ne supprime une partition existante.

## Orientation technique à éprouver

- Stocker un contenu musical versionné, distinct du JSON Lexical actuel. MusicXML est le format d'échange requis ; la représentation interne exacte reste à choisir après prototype.
- Évaluer un moteur de reconnaissance musicale (OMR) qui retourne du MusicXML à partir de PDF/photos. L'API OMR de Flat est une option à comparer à une solution auto-hébergée ; coût, confidentialité, droits d'usage, rétention, qualité et formats pris en charge restent des critères de choix.
- Évaluer OpenSheetMusicDisplay pour l'affichage MusicXML et l'impression. Il utilise VexFlow et peut transposer **à l'affichage**, mais la transformation persistée et exportable doit être un composant séparé, testé par aller-retour MusicXML.
- Ajouter un type de document partition, un traitement d'import privé, des révisions persistantes et une création de composition sans document texte automatique. Ne pas faire passer les partitions par l'éditeur Lexical ou sa pagination textuelle.

Sources de référence : [MusicXML et instruments transpositeurs](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/), [OSMD : rendu et limites](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay), [OSMD : transposition d'affichage](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Transposing), [API OMR Flat](https://flat.io/developers/docs/api/omr/), [limites de reconnaissance](https://flat.io/developers/docs/api/omr/faq/quality).
