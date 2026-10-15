import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'

import { contentRevision } from '@/lib/contentRevision'
import type { Id } from '@/lib/ids'
import { conflicted, done, failed, type ActionResult } from '@front/_lib/actionResult'
import type { Session } from '@front/_lib/server/auth'
import type { LexicalContent } from './types'

type Body = { content: LexicalContent } | { scoreXml: string }

async function lockDocument(req: PayloadRequest, id: Id) {
  if (!req.user) throw new Error('A document save requires an authenticated owner')
  const transactionId = await req.transactionID
  // This application configures the Postgres adapter; fail closed if no transaction exists.
  const database = req.payload.db as unknown as PostgresAdapter
  const transaction = transactionId && database.sessions[transactionId]?.db
  if (!transaction) throw new Error('A document save requires a database transaction')
  await transaction.execute(
    sql`SELECT id FROM binder_items WHERE id = ${id} AND owner_id = ${req.user.id} FOR UPDATE`,
  )
}

async function saveLockedBody(req: PayloadRequest, id: Id, body: Body, expectedRevision: string) {
  const item = await req.payload.findByID({
    collection: 'binder-items',
    id,
    req,
    user: req.user,
    overrideAccess: false,
    depth: 0,
  })
  const score = 'scoreXml' in body
  if (item.kind !== 'document' || item.documentType !== (score ? 'score' : 'text')) {
    req.payload.logger.warn({
      msg: 'Document save refused: body does not match the document type',
      documentId: id,
      expectedType: score ? 'score' : 'text',
    })
    return failed
  }
  const revision = await contentRevision(score ? item.scoreXml : item.content)
  if (revision !== expectedRevision) {
    // A committed save whose response was lost must be safe to retry without another write.
    if ((await contentRevision('scoreXml' in body ? body.scoreXml : body.content)) === revision)
      return done({ updatedAt: item.updatedAt, revision })
    return conflicted
  }
  const saved = await req.payload.update({
    collection: 'binder-items',
    id,
    data: body,
    req,
    user: req.user,
    overrideAccess: false,
    depth: 0,
  })
  return done({
    updatedAt: saved.updatedAt,
    revision: await contentRevision(score ? saved.scoreXml : saved.content),
  })
}

// Hold the row lock through Payload validation and commit. Bulk update's where clause alone
// cannot guarantee compare-and-swap: Payload first resolves IDs, then updates them separately.
export async function persistDocumentBody(
  session: Session,
  id: Id,
  body: Body,
  expectedRevision: string,
): Promise<ActionResult<{ updatedAt: string; revision: string }>> {
  if (typeof expectedRevision !== 'string' || !/^[a-f0-9]{64}$/.test(expectedRevision)) {
    session.payload.logger.warn({
      msg: 'Document save refused: invalid revision',
      documentId: id,
      revisionType: typeof expectedRevision,
      revisionLength: typeof expectedRevision === 'string' ? expectedRevision.length : null,
    })
    return failed
  }
  const req = await createLocalReq({ user: session.user }, session.payload)
  try {
    await initTransaction(req)
    await lockDocument(req, id)
    const result = await saveLockedBody(req, id, body, expectedRevision)
    if (result.status === 'done') await commitTransaction(req)
    else await killTransaction(req)
    return result
  } catch (error) {
    await killTransaction(req)
    // Database errors may embed SQL parameters, including private document content.
    session.payload.logger.error({
      msg: 'Document save failed',
      documentId: id,
      errorClass: error instanceof Error ? error.constructor.name : 'UnknownError',
    })
    return failed
  }
}
