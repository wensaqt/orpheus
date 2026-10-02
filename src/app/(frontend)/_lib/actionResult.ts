/*
 * What a server action called from the client answers: done (with its data), or an error the
 * interface reports. Actions never throw for an expected failure, so callers handle one shape.
 */
export type ActionResult<Data = undefined> = { status: 'done'; data: Data } | { status: 'error' }

export function done(): { status: 'done'; data: undefined }
export function done<Data>(data: Data): { status: 'done'; data: Data }
export function done(data?: unknown) {
  return { status: 'done', data }
}

export const failed = { status: 'error' } as const

// Whether a call to an action worked; a rejected call (network, expired session) did not
export const succeeded = (call: Promise<ActionResult<unknown>>) =>
  call.then(
    (result) => result.status === 'done',
    () => false,
  )
