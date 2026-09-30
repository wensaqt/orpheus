// Textes de l'interface en anglais. Les paramètres s'écrivent {nom}.
export const en = {
  app: {
    name: 'Orpheus',
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
    back: 'Home',
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
  editor: {
    back: 'All compositions',
    titleLabel: 'Composition title',
    placeholder: 'Start writing…',
    saveError: 'Could not save — retrying on next change',
  },
} as const
