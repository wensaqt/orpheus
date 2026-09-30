import { cleanupTestUsers, getTestPayload } from '../helpers/testUsers'

/*
 * Runs once before the whole e2e run: removes accounts left by an interrupted run. This must not
 * happen per spec file (e.g. in afterAll), since workers run in parallel and it would delete the
 * accounts of tests still in progress. Each test removes its own account when it ends.
 */
export default async function globalSetup() {
  await cleanupTestUsers(await getTestPayload())
}
