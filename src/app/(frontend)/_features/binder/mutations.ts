import 'server-only'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type PayloadRequest,
  type RequiredDataFromCollectionSlug,
} from 'payload'

import {
  type BinderMove,
  type BinderNodeData,
  type BinderPlacement,
  planMove,
  siblingsOf,
  toBinderNode,
} from '@/lib/binder/tree'
import type { Id } from '@/lib/ids'
import { relationId } from '@/lib/relationId'
import { validateScoreImport } from '@/lib/scores/validation'
import { scoreVariantTitle, type ScoreVariant } from '@/lib/scores/variantTitle'
import type { BinderItem } from '@/payload-types'
import { done, failed, type ActionResult } from '@front/_lib/actionResult'
import type { Session } from '@front/_lib/server/auth'

import { binderEntries, toEntry } from './queries'

export async function inBinderTransaction<Result>(
  session: Session,
  change: (req: PayloadRequest) => Promise<Result>,
): Promise<ActionResult<Result>> {
  const req = await createLocalReq({ user: session.user }, session.payload)
  try {
    await initTransaction(req)
    const result = await change(req)
    await commitTransaction(req)
    return done(result)
  } catch {
    await killTransaction(req)
    return failed
  }
}

function findBinderItem(req: PayloadRequest, id: Id) {
  return req.payload.findByID({
    collection: 'binder-items',
    id,
    user: req.user,
    overrideAccess: false,
    depth: 0,
    req,
  })
}

async function binderStructure(req: PayloadRequest, composition: Id): Promise<BinderNodeData[]> {
  const { docs } = await req.payload.find({
    collection: 'binder-items',
    where: { composition: { equals: composition } },
    select: { kind: true, parent: true, position: true },
    user: req.user,
    overrideAccess: false,
    pagination: false,
    depth: 0,
    req,
  })
  return docs.map(toBinderNode)
}

export async function writePlacements(
  req: PayloadRequest,
  placements: BinderPlacement[],
): Promise<void> {
  for (const { id, parent, position } of placements)
    await req.payload.update({
      collection: 'binder-items',
      id,
      data: { parent, position },
      user: req.user,
      overrideAccess: false,
      depth: 0,
      req,
      context: { keepPosition: true },
    })
}

function checkedVariantTitle(source: BinderItem, variant: ScoreVariant, xml: string): string {
  if (source.kind !== 'document' || source.documentType !== 'score')
    throw new Error('Source is not a score')
  const title = scoreVariantTitle(source.title, variant, xml)
  if (!title) throw new Error('Invalid score variant')
  return title
}

function createScoreCopy(req: PayloadRequest, source: BinderItem, title: string, scoreXml: string) {
  return req.payload.create({
    collection: 'binder-items',
    data: {
      composition: relationId(source.composition),
      kind: 'document',
      documentType: 'score',
      parent: relationId(source.parent),
      title,
      scoreXml,
    } as RequiredDataFromCollectionSlug<'binder-items'>,
    user: req.user,
    overrideAccess: false,
    depth: 0,
    req,
  })
}

function placementAfterSource(
  nodes: BinderNodeData[],
  source: BinderItem,
  createdId: Id,
): BinderPlacement[] {
  const parent = relationId(source.parent)
  const index = siblingsOf(nodes, parent).findIndex((item) => item.id === source.id)
  if (index < 0) throw new Error('Source score is missing from its folder')
  return planMove(nodes, createdId, { parent, index: index + 1 })
}

async function placeCopyAfterSource(
  req: PayloadRequest,
  source: BinderItem,
  createdId: Id,
): Promise<void> {
  const nodes = await binderStructure(req, relationId(source.composition))
  await writePlacements(req, placementAfterSource(nodes, source, createdId))
}

export async function createScoreVariant(
  req: PayloadRequest,
  sourceId: Id,
  xml: string,
  variant: ScoreVariant,
) {
  validateScoreImport(xml)
  const source = await findBinderItem(req, sourceId)
  const created = await createScoreCopy(req, source, checkedVariantTitle(source, variant, xml), xml)
  await placeCopyAfterSource(req, source, created.id)
  const placed = await findBinderItem(req, created.id)
  return { ...toEntry(placed), updatedAt: placed.updatedAt }
}

function samePlacement(expected: BinderNodeData, current: BinderNodeData | undefined): boolean {
  return (
    current !== undefined &&
    current.kind === expected.kind &&
    current.parent === expected.parent &&
    current.position === expected.position
  )
}

function assertExpectedStructure(entries: BinderNodeData[], expected?: BinderNodeData[]): void {
  if (expected === undefined) return
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  if (
    expected.length !== entries.length ||
    expected.some((node) => !samePlacement(node, byId.get(node.id)))
  )
    throw new Error('The binder structure changed')
}

export async function planBinderMove(
  session: Session,
  id: Id,
  move: BinderMove,
  expected?: BinderNodeData[],
): Promise<BinderPlacement[]> {
  const item = await session.payload.findByID({
    collection: 'binder-items',
    id,
    user: session.user,
    overrideAccess: false,
    depth: 0,
  })
  const entries = await binderEntries(session, relationId(item.composition))
  assertExpectedStructure(entries, expected)
  return planMove(entries, id, move)
}
