'use server'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type RequiredDataFromCollectionSlug,
} from 'payload'

import { type BinderItemKind, MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import { type BinderMove, planMove } from '@/lib/binder/tree'
import { relationId } from '@/lib/relationId'
import { cleanTitle } from '@/lib/titles'

import { type ActionResult, done, failed } from '@front/_lib/actionResult'
import { authedAction } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'
import { isId } from '@front/_lib/validation'

import { binderEntries, toEntry } from './queries'
import type { BinderEntry, LexicalContent } from './types'
import { isKind, isMove, isParent } from './validation'

/*
 * Binder changes from the editor. Each action checks its input (server actions are public
 * endpoints), then runs as the signed-in user with access control on: the collection checks
 * ownership and keeps the tree well formed. Nothing is revalidated: the binder applies each
 * change itself, and a refresh meanwhile would overwrite what the writer is typing.
 */

// The binder as the server has it now, to replace a copy restored from the router's cache
export const loadBinderEntries = authedAction(
  async (session, compositionId: number): Promise<ActionResult<BinderEntry[]>> => {
    if (!isId(compositionId)) return failed
    try {
      return done(await binderEntries(session, compositionId))
    } catch {
      return failed
    }
  },
)

// Saves the text of a document (its shape is checked by the collection), returning its version
export const saveDocument = authedAction(
  async (
    { payload, user },
    id: number,
    content: LexicalContent,
  ): Promise<ActionResult<{ updatedAt: string }>> => {
    if (!isId(id)) return failed
    try {
      const { updatedAt } = await payload.update({
        collection: 'binder-items',
        id,
        data: { content },
        user,
        overrideAccess: false,
        depth: 0,
      })
      return done({ updatedAt })
    } catch {
      return failed
    }
  },
)

// A new document or folder, last in the given folder (or at the root), titled in the user's language
export const createBinderItem = authedAction(
  async (
    { payload, user },
    compositionId: number,
    kind: BinderItemKind,
    parent: number | null,
  ): Promise<ActionResult<BinderEntry>> => {
    if (!isId(compositionId) || !isKind(kind) || !isParent(parent)) return failed
    const t = await getT()
    try {
      const item = await payload.create({
        collection: 'binder-items',
        // Owner and position are filled in by the collection, which the types cannot know
        data: {
          composition: compositionId,
          kind,
          parent,
          title: t(kind === 'folder' ? 'binder.untitledFolder' : 'binder.untitledDocument'),
        } as RequiredDataFromCollectionSlug<'binder-items'>,
        user,
        overrideAccess: false,
        depth: 0,
      })
      return done(toEntry(item))
    } catch {
      return failed
    }
  },
)

// Renames an item; an empty or overlong title is refused
export const renameBinderItem = authedAction(
  async ({ payload, user }, id: number, title: string): Promise<ActionResult> => {
    const cleaned = cleanTitle(title, MAX_BINDER_TITLE_LENGTH)
    if (!isId(id) || !cleaned) return failed
    try {
      await payload.update({
        collection: 'binder-items',
        id,
        data: { title: cleaned },
        user,
        overrideAccess: false,
        depth: 0,
      })
      return done()
    } catch {
      return failed
    }
  },
)

// Deletes an item; a folder goes with everything inside it
export const deleteBinderItem = authedAction(
  async ({ payload, user }, id: number): Promise<ActionResult> => {
    if (!isId(id)) return failed
    try {
      // Access control limits the deletion to the user's own items
      await payload.delete({ collection: 'binder-items', id, user, overrideAccess: false })
      return done()
    } catch {
      return failed
    }
  },
)

/*
 * Moves an item to an index in a folder (or the root). The new order is planned on the whole
 * binder, then written in one transaction: either every renumbered item changes, or none.
 */
export const moveBinderItem = authedAction(
  async (session, id: number, move: BinderMove): Promise<ActionResult> => {
    if (!isId(id) || !isMove(move)) return failed
    const { payload, user } = session
    const item = await payload
      .findByID({ collection: 'binder-items', id, user, overrideAccess: false, depth: 0 })
      .catch(() => null)
    if (!item) return failed

    let placements
    try {
      placements = planMove(await binderEntries(session, relationId(item.composition)!), id, move)
    } catch {
      return failed
    }

    const req = await createLocalReq({ user }, payload)
    await initTransaction(req)
    try {
      for (const { id: itemId, parent, position } of placements) {
        await payload.update({
          collection: 'binder-items',
          id: itemId,
          data: { parent, position },
          user,
          overrideAccess: false,
          depth: 0,
          req,
          // Positions are planned above: the collection must not move the item to the end
          context: { keepPosition: true },
        })
      }
      await commitTransaction(req)
      return done()
    } catch {
      await killTransaction(req)
      return failed
    }
  },
)
