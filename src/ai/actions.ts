'use server';
/**
 * @fileOverview This file contains client-callable server actions that execute Genkit flows.
 */

import { makeAdminFlow } from './flows/make-admin-flow';
import type { MakeAdminOutput } from './flows/make-admin-flow';

/**
 * A client-callable server action that executes the makeAdminFlow.
 * @returns A promise that resolves with the output of the makeAdminFlow.
 */
export async function makeAdmin(): Promise<MakeAdminOutput> {
  return makeAdminFlow();
}
