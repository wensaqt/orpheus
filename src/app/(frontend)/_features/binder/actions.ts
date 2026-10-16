'use server'

import type { RequiredDataFromCollectionSlug } from 'payload'

import { type BinderItemKind, MAX_BINDER_TITLE_LENGTH } from '@/lib/binder/constants'
import type { BinderMove, BinderNodeData } from '@/lib/binder/tree'
import { cleanTitle } from '@/lib/titles'
import type { Id } from '@/lib/ids'
import type { BinderItem } from '@/payload-types'
import { isId } from '@/lib/ids'
import { validateScoreImport } from '@/lib/scores/validation'
import { ScoreError } from '@/lib/scores/errors'
import { SAMPLE_SCORE } from '@/lib/scores/sample'
import type { ScoreVariant } from '@/lib/scores/variantTitle'

import { type ActionResult, done, failed } from '@front/_lib/actionResult'
import { authedAction, authedSave } from '@front/_lib/server/auth'
import { getT } from '@front/_lib/server/i18n'

import { binderEntries, toEntry } from './queries'
import { persistDocumentBody } from './saveDocument'
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

// Saves compare the body revision under a row lock, independently of title and placement.
export const saveDocument = authedSave(
  async (session, id: Id, content: LexicalContent, revision: string) => {
    if (!isId(id)) return failed
    return persistDocumentBody(session, id, { content }, revision)
  },
)

export const saveScoreDocument = authedSave(
  // A single object keeps large XML out of React Flight's argument-array size guard.
  async (session, request: { id: Id; scoreXml: string; expectedRevision: string }) => {
    if (!request || typeof request !== 'object') {
      session.payload.logger.warn({ msg: 'Score document save refused: invalid request' })
      return failed
    }
    const { id, scoreXml, expectedRevision } = request
    if (!isId(id)) {
      session.payload.logger.warn({ msg: 'Score document save refused: invalid document ID' })
      return failed
    }
    try {
      validateScoreImport(scoreXml)
    } catch (error) {
      session.payload.logger.warn({
        msg: 'Score document validation failed',
        documentId: id,
        code: error instanceof ScoreError ? error.code : 'unexpected-validation-error',
      })
      return failed
    }
    return persistDocumentBody(session, id, { scoreXml }, expectedRevision)
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
    request: { sourceId: Id; scoreXml: string; variant: ScoreVariant },
  ): Promise<ActionResult<BinderEntry & Pick<BinderItem, 'updatedAt'>>> => {
    if (!request) return failed
    const { sourceId, scoreXml, variant } = request
    if (!isId(sourceId)) return failed
    return inBinderTransaction(session, (req) =>
      createScoreVariant(req, sourceId, scoreXml, variant),
    )
  },
)

// Renames an item; an empty or overlong title is refused
export const renameBinderItem = authedSave(
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
