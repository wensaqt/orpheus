// The mounted editor owns this guard; global header actions can await it without a new provider.
const guards = new Set<() => Promise<boolean>>()

export function registerPendingChanges(guard: () => Promise<boolean>) {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}

export async function savePendingChanges(): Promise<boolean> {
  return (await Promise.all([...guards].map((guard) => guard()))).every(Boolean)
}
