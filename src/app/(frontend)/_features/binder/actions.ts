'use server'

import type { RequiredDataFromCollectionSlug } from 'payload'

import { type BinderItemKind, MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import type { BinderMove, BinderNodeData } from '@/lib/binder/tree'
import { cleanTitle } from '@/lib/titles'
import type { Id } from '@/lib/ids'
import type { BinderItem } from '@/payload-types'
import { isId } from '@/lib/ids'
import { validateScoreImport } from '@/lib/scores/validation'
import { SAMPLE_SCORE } from '@/lib/scores/sample'
import type { ScoreVariant } from '@/lib/scores/variantTitle'

import { type ActionResult, done, failed } from '@front/_lib/actionResult'
import { authedAction } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'

import { binderEntries, toEntry } from './queries'
import {
  createScoreVariant,
  inBinderTransaction,
  planBinderMove,
  writePlacements,
} from './mutations'
import type { BinderEntry, LexicalContent } from './types'
import { isBinderNodes, isKind, isMove, isParent } from './validation'

/*
 * Binder changes from the editor. Each action checks its input (server actions are public
 * endpoints), then runs as the signed-in user with access control on: the collection checks
 * ownership and keeps the tree well formed. Nothing is revalidated: the binder applies each
 * change itself, and a refresh meanwhile would overwrite what the writer is typing.
 */

// The binder as the server has it now, to replace a copy restored from the router's cache
export const loadBinderEntries = authedAction(
  async (session, compositionId: Id): Promise<ActionResult<BinderEntry[]>> => {
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
    id: Id,
    content: LexicalContent,
  ): Promise<ActionResult<{ updatedAt: string }>> => {
    if (!isId(id)) return failed
    try {
      const item = await payload.findByID({
        collection: 'binder-items',
        id,
        user,
        overrideAccess: false,
        depth: 0,
      })
      if (item.kind !== 'document' || item.documentType !== 'text') return failed
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

export const saveScoreDocument = authedAction(
  async (
    { payload, user },
    id: Id,
    scoreXml: string,
  ): Promise<ActionResult<{ updatedAt: string }>> => {
    if (!isId(id)) return failed
    try {
      validateScoreImport(scoreXml)
      const item = await payload.findByID({
        collection: 'binder-items',
        id,
        user,
        overrideAccess: false,
        depth: 0,
      })
      if (item.kind !== 'document' || item.documentType !== 'score') return failed
      const { updatedAt } = await payload.update({
        collection: 'binder-items',
        id,
        data: { scoreXml },
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
    compositionId: Id,
    kind: BinderItemKind,
    parent: Id | null,
    documentType: 'text' | 'score' = 'text',
  ): Promise<ActionResult<BinderEntry & Pick<BinderItem, 'updatedAt'>>> => {
    if (
      !isId(compositionId) ||
      !isKind(kind) ||
      !isParent(parent) ||
      (documentType !== 'text' && documentType !== 'score') ||
      (kind === 'folder' && documentType !== 'text')
    )
      return failed
    const t = await getT()
    try {
      const item = await payload.create({
        collection: 'binder-items',
        // Owner and position are filled in by the collection, which the types cannot know
        data: {
          composition: compositionId,
          kind,
          documentType,
          scoreXml: documentType === 'score' ? SAMPLE_SCORE : null,
          parent,
          title: t(
            kind === 'folder'
              ? 'binder.untitledFolder'
              : documentType === 'score'
                ? 'binder.untitledScore'
                : 'binder.untitledDocument',
          ),
        } as RequiredDataFromCollectionSlug<'binder-items'>,
        user,
        overrideAccess: false,
        depth: 0,
      })
      return done({ ...toEntry(item), updatedAt: item.updatedAt })
    } catch {
      return failed
    }
  },
)

// A transposition is a new score beside its source. Creation and placement commit together.
export const createTransposedScore = authedAction(
  async (
    session,
    sourceId: Id,
    scoreXml: string,
    variant: ScoreVariant,
  ): Promise<ActionResult<BinderEntry & Pick<BinderItem, 'updatedAt'>>> => {
    if (!isId(sourceId)) return failed
    return inBinderTransaction(session, (req) =>
      createScoreVariant(req, sourceId, scoreXml, variant),
    )
  },
)

// Renames an item; an empty or overlong title is refused
export const renameBinderItem = authedAction(
  async ({ payload, user }, id: Id, title: string, expected?: string): Promise<ActionResult> => {
    const cleaned = cleanTitle(title, MAX_BINDER_TITLE_LENGTH)
    if (!isId(id) || !cleaned || (expected !== undefined && typeof expected !== 'string'))
      return failed
    try {
      if (expected !== undefined) {
        const item = await payload.findByID({
          collection: 'binder-items',
          id,
          user,
          overrideAccess: false,
          depth: 0,
        })
        if (item.title !== expected) return failed
      }
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
  async ({ payload, user }, id: Id): Promise<ActionResult> => {
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
  async (session, id: Id, move: BinderMove, expected?: BinderNodeData[]): Promise<ActionResult> => {
    if (!isId(id) || !isMove(move) || (expected !== undefined && !isBinderNodes(expected)))
      return failed
    try {
      const placements = await planBinderMove(session, id, move, expected)
      return await inBinderTransaction(session, async (req) => {
        await writePlacements(req, placements)
        return undefined
      })
    } catch {
      return failed
    }
  },
)
