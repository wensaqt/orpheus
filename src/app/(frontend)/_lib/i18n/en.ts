// English UI strings. Parameters are written as {name}.
export const en = {
  app: {
    name: 'Orpheus',
    home: 'Home',
  },
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    dismiss: 'Dismiss',
    notifications: 'Notifications',
  },
  home: {
    create: { title: 'New composition', subtitle: 'Start a new piece' },
    browse: { title: 'All compositions', subtitle: 'Revisit your pieces' },
  },
  compositions: {
    heading: 'All compositions',
    create: 'New composition',
    empty: {
      title: 'No compositions yet',
      subtitle: 'Every piece begins with a blank page.',
    },
    actions: {
      open: 'Actions for {title}',
      duplicate: 'Duplicate',
      move: 'Move to…',
      delete: 'Delete',
      soon: 'Coming soon',
    },
    delete: {
      title: 'Delete “{title}”?',
      description: 'This cannot be undone.',
      confirm: 'Delete',
      done: '“{title}” deleted',
      error: 'Could not delete this composition. Please try again.',
    },
  },
  lexicon: {
    relationLabel: 'Word relation',
    relations: { synonyms: 'Synonyms', antonyms: 'Antonyms' },
    searchLabel: {
      synonyms: 'Find synonyms',
      antonyms: 'Find antonyms',
    },
    placeholder: 'Type a word…',
    hint: {
      synonyms: 'Type a word to see its synonyms. Click one to copy it.',
      antonyms: 'Type a word to see its antonyms. Click one to copy it.',
    },
    searching: 'Searching…',
    found: {
      synonyms: 'Synonyms found for “{word}”: {count}',
      antonyms: 'Antonyms found for “{word}”: {count}',
    },
    empty: {
      synonyms: 'No synonyms found for “{word}”.',
      antonyms: 'No antonyms found for “{word}”.',
    },
    matched: {
      synonyms: 'Synonyms of “{word}”',
      antonyms: 'Antonyms of “{word}”',
    },
    copied: '“{word}” copied',
    copyError: 'Could not copy “{word}”',
    error: 'Could not load results. Please try again.',
    source: 'Wiktionnaire',
    license: 'CC BY-SA',
    partsOfSpeech: {
      noun: 'Noun',
      adjective: 'Adjective',
      verb: 'Verb',
      adverb: 'Adverb',
      pronoun: 'Pronoun',
      preposition: 'Preposition',
      conjunction: 'Conjunction',
      determiner: 'Determiner',
      interjection: 'Interjection',
    },
  },
  editor: {
    titleLabel: 'Composition title',
    placeholder: 'Start writing…',
    saveError: 'Could not save — retrying on next change',
  },
} as const
