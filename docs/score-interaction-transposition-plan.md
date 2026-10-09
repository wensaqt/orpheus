# Partition : édition par geste et transposition instrumentale

Statut : en cours, 9 octobre 2026. L'import élargi, les diagnostics, le changement de tonalité des voix/portées, la confirmation de l'instrument source et la création d'une copie transposée sont implémentés. Le pont OSMD/MusicXML fiable pour l'édition directe et le geste de glisser restent à faire.

## Décisions de parcours

- Un clic sur une tête de note ouvre le panneau de correction ciblé déjà présent. Le menu Édition > Corriger une hauteur ouvre toujours la liste complète.
- Un glisser vertical déplace la note d'un **degré de portée par ligne ou interligne**. Vers le haut : `+1`, `+2`… ; vers le bas : `−1`, `−2`… . La valeur décrit un écart diatonique, pas un nombre de demi-tons. Le nom de note et l'octave changent ensemble ; l'altération est conservée pendant ce geste.
- Une prévisualisation suit le pointeur, mais le MusicXML, l'historique et l'autosauvegarde ne changent qu'au relâchement. Échap annule le geste. Un déplacement sous le seuil de glissement reste un clic.
- Au survol, la tête de note prend la couleur primaire. La note sélectionnée reçoit un halo discret qui pulse ; on anime le halo plutôt que le glyphe de gravure pour préserver l'alignement de la hampe, des accords et des lignes supplémentaires. Respecter `prefers-reduced-motion`.
- Deux commandes restent distinctes : **Changer la tonalité** change les hauteurs sonores ; **Transposer pour un instrument** conserve les hauteurs sonores et produit les hauteurs écrites de l'instrument cible.
- Pour la conversion instrumentale, demander ou confirmer l'instrument source quand les métadonnées MusicXML ne sont pas suffisamment claires. Le panneau affiche « Partie actuelle », « Instrument cible », l'écart écrit/sonore et les avertissements de tessiture. « Partition en ut (hauteur réelle) » est une convention de notation, pas un instrument.
- **Changer la tonalité** vise les parties à hauteurs déterminées, y compris plusieurs voix et une partie de piano sur deux portées. **Transposer pour un instrument** vise d'abord une partie compatible avec l'instrument cible ; convertir d'un coup les deux portées d'un piano en saxophone monodique ne constitue pas une partie jouable. Pour une partition d'ensemble, choisir explicitement la partie à convertir. Les percussions sans hauteur déterminée sont affichables, mais ne se transposent pas comme des notes tempérées.

## Modèle et transformations

1. Séparer trois opérations aujourd'hui mélangées dans `src/lib/scores/prototype.ts` : validation structurelle à l'import, indexation des notes éditables, et vérification de chaque transformation. Un MusicXML affichable ne doit pas être refusé simplement parce qu'il contient `<backup>`, `<forward>` ou `<time-modification>`.
2. Donner à chaque `<note>` importée un identifiant stable, conservé dans le MusicXML (`id` est autorisé sur `<note>`), **sans supposer qu'OSMD le transmet** : son `sourceNote` ne l'expose pas dans l'API typée. Construire un pont par partie, **occurrence de mesure** (son `number` peut se répéter), portée, voix, instant rationnel, rang dans l'accord et hauteur. Tenir compte de `<backup>`, `<forward>`, `<chord>`, des silences et des notes de grâce. Vérifier cardinalité et unicité des deux côtés ; désactiver le clic/glisser pour les unissons ou collisions ambigus. Le rang actuel dans `inspectScore()` ne suffit pas dès qu'il y a plusieurs voix ou portées.
3. Extraire `shiftDiatonic(pitch, steps)` : calculer la lettre et l'octave sur l'échelle `C D E F G A B`, puis conserver `<alter>`. Ainsi `B3 + 1 = C4`, jamais `C3`. Sur validation, recalculer les accidentelles visibles selon l'armure et la mesure ; ne pas recopier aveuglément l'ancienne balise `<accidental>`. Si la note appartient à une chaîne de liaison, déplacer toute la chaîne ou demander une correction ciblée, sans créer de liaison entre hauteurs différentes.
4. Définir un profil instrumental par `id`, nom, écart diatonique et chromatique **écrit → sonore**, clef/portées par défaut et tessiture indicative. Lire `<transpose>` et `<octave-change>` de la partie : `number` peut cibler une portée, et de nouveaux `<attributes>` peuvent modifier l'état au fil de la musique. Première conversion automatique seulement si la transposition source est constante, certaine et compatible avec la cible ; sinon demander une confirmation ou signaler la structure non couverte. Confirmer la source par opération. Ne prévoir un champ Payload et une migration pour mémoriser le choix que si le besoin est confirmé ; ce champ devrait alors être lié à la partie et à une empreinte du XML courant, pas au document entier sans version.
5. Pour convertir de la source `S` vers la cible `T` : `hauteurSonore = hauteurÉcrite + écart(S)` ; `nouvelleHauteurÉcrite = hauteurSonore − écart(T)`. L'écart comporte une composante diatonique pour l'orthographe et une chromatique pour le son. Transformer chaque hauteur déterminée de la partie choisie, ses armures et ses symboles d'accord pertinents ; préserver durées, voix, silences, triolets, liaisons et paroles. Écrire le `<transpose>` cible sans dupliquer l'ancien et normaliser les métadonnées de cette partie. Si la transposition source varie par portée ou instant, construire d'abord une chronologie explicite des offsets ou refuser cette conversion précise : un offset global serait faux.
6. Avant « Appliquer », vérifier toutes les parties et notes concernées. Si une écriture exige une altération non représentable par le moteur, une armure non prise en charge ou une source incertaine, montrer la mesure et la raison exacte ; ne rien remplacer. Les notes hors tessiture sont des avertissements, pas des corrections automatiques d'octave.

## Interaction de la partition

- Extraire le repérage OSMD actuellement dans `ScorePreview.tsx` vers un adaptateur `scoreHitTesting.ts`. Il renvoie l'identifiant de note, sa position graphique et l'espacement réel entre deux lignes de sa portée ; les coordonnées tiennent compte du zoom, du défilement et de la page SVG cliquée.
- Ajouter `useScoreNoteGesture.ts` pour `pointerdown / pointermove / pointerup / pointercancel`. Capturer le pointeur sur un conteneur stable, distinguer clic et glisser après un petit seuil, puis convertir le déplacement vertical en `round(−deltaY / demiInterligne)`. Limiter l'aperçu aux hauteurs MusicXML représentables.
- Pendant le geste, conserver le rendu OSMD fixe et dessiner un calque de prévisualisation sur la position visée : tête fantôme, repère violet et pastille `+n/−n` près de la note. Refaire le rendu OSMD uniquement au commit, pour éviter de détruire la cible du pointeur et de recalculer toute la partition à chaque pixel.
- Ajouter au panneau de correction la hauteur de départ et la hauteur proposée lorsque la note est sélectionnée. Le panneau global reste utilisable au clavier ; le geste ne doit pas devenir la seule méthode d'édition.
- Une validation du geste = une entrée dans l'historique et une sauvegarde. Échap, `pointercancel` et un relâchement sans changement ne créent aucune entrée.

## Pseudo-code à éprouver sur un corpus réel

```ts
function indexMeasure(partId, measureOrdinal, measure, divisionsTimeline) {
  let cursor = rational(0) // en unités de noire, malgré les changements de divisions
  let lastOnset = cursor
  for (const node of measure.children) {
    if (node.localName === 'backup')
      cursor = cursor.subtract(durationInQuarters(node, divisionsTimeline))
    if (node.localName === 'forward')
      cursor = cursor.add(durationInQuarters(node, divisionsTimeline))
    if (node.localName !== 'note') continue
    const onset = has(node, 'chord') ? lastOnset : cursor
    const key = [
      partId,
      measureOrdinal,
      staff(node),
      voice(node),
      onset,
      graceOrdinal(node),
      chordOrdinal(node),
      pitchSignature(node),
    ]
    xmlCandidates.add(key, noteId(node))
    if (!has(node, 'chord')) lastOnset = onset
    if (!has(node, 'chord') && !has(node, 'grace'))
      cursor = cursor.add(durationInQuarters(node, divisionsTimeline))
  }
  // Construire les mêmes clés depuis les sourceNote d'OSMD. N'activer l'édition
  // que si une clé correspond à exactement une note de chaque côté.
}

function shiftDiatonic(pitch, steps) {
  const position = 7 * pitch.octave + stepIndex(pitch.step) + steps
  return { step: STEPS[mod(position, 7)], octave: floor(position / 7), alter: pitch.alter }
}

function convertPart(xml, partId, sourceOffset, targetOffset) {
  const draft = parseAndClone(xml)
  assertConstantAndCertainSourceOffset(draft, partId, sourceOffset)
  assertCompatibleTarget(draft, partId, targetOffset)
  const delta = subtractOffsets(sourceOffset, targetOffset) // diatonique et chromatique
  for (const event of indexPart(draft, partId)) {
    if (event.pitchedNote) writePitch(event.note, transposeSpelled(event.pitch, delta))
    if (event.key) transposeKey(event.key, delta)
    if (event.harmony) transposeHarmony(event.harmony, delta)
  }
  recalculateAccidentalsAndValidateTies(draft, partId)
  replacePartTransposeMetadata(draft, partId, targetOffset)
  assertSoundingPitchesUnchanged(xml, draft, partId, sourceOffset, targetOffset)
  return serialize(draft) // l'appelant n'enregistre qu'après réussite de toutes les vérifications
}

function onPointerMove(event) {
  if (!gesture.dragging) return
  const steps = round((gesture.startY - event.clientY) / gesture.localHalfStaffSpace)
  drawGhostAndBadge(shiftDiatonic(gesture.originPitch, steps), signed(steps))
  // Ni mutation XML, ni sauvegarde, ni rerendu OSMD ici.
}
```

Le pont OSMD/MusicXML est un **spike bloquant** : l'`id` XML ne suffit pas à établir la correspondance, et les unissons superposés peuvent partager une tête de note. Le pseudo-code omet volontairement la gestion fine des clés enharmoniques et des chronologies de transposition ; celles-ci doivent être prouvées par fixtures avant implémentation.

## Découpage de réalisation

1. **Import et diagnostics** : importer les structures rythmiques ordinaires sans les refuser ; signaler précisément ce qui est affichable, éditable et transposable.
2. **Corpus, moteur et pont OSMD** : fixtures de plusieurs voix/portées, accords, triolets, unissons et changements de divisions ; transpositions pures et correspondance des notes testée. Les cas ambigus restent visibles mais non éditables directement.
3. **Transposition source → cible** : profils, confirmation de la source, vérification de compatibilité, prévisualisation, avertissements et export MusicXML. Tests aller-retour `ut → si♭ → ut`, `mi♭ → si♭`, saxophone ténor avec octave, armures et accords. Une conversion est refusée si l'offset source varie sans chronologie implémentée.
4. **Geste et sélection** : adaptateur OSMD éprouvé, survol, halo, badge, glisser, clic inchangé, annulation et historique. Test navigateur sur une note simple puis un accord, plusieurs portées, zoom et fenêtre étroite.
5. **Partition d'ensemble** : choix explicite des parties et de leur cible ; traiter les changements d'instrument au sein d'une partie avant de promettre leur conversion automatique.

## Critères d'acceptation

- Cliquer ouvre la correction ciblée ; glisser d'un demi-interligne au-dessus affiche `+1`, lâcher transforme `B3` en `C4` et conserve l'altération. Une note liée reste musicalement cohérente. Échap laisse le XML et l'historique inchangés.
- Survol et sélection restent visibles sur des notes isolées, des accords et des lignes supplémentaires, sans déplacer la gravure ; les animations sont désactivées si le système demande moins de mouvement.
- Une partie de piano à deux portées et plusieurs voix, avec triolets, s'importe et conserve ses rythmes après un **changement de tonalité**. Le panneau ne présente pas la conversion de cette partie entière vers un saxophone monodique comme une opération sûre. Une percussion non mélodique est signalée précisément et n'est pas transposée silencieusement.
- Une partie écrite pour saxophone ténor en si♭ peut être convertie en partie de piano en ut puis reconvertie : les hauteurs sonores restent identiques, et le MusicXML exporté porte la bonne métadonnée de transposition.
- Les erreurs indiquent la partie, la mesure et la structure concernée. Un échec de prévisualisation ou de conversion ne remplace pas le document.

Références : [MusicXML `<transpose>`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/), [écriture et hauteur sonore](https://www.w3.org/2021/06/musicxml40/tutorial/midi-compatible-part/), [MusicXML `<note>` et son identifiant](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/), [OSMD, moteur d'affichage](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/README.md).
