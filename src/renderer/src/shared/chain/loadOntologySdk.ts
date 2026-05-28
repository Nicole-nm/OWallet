/**
 * Lazy-load the Ontology SDK as a singleton promise.
 *
 * Returned as `any` (via the `Sdk` alias) because callers destructure dozens
 * of varied symbols (TransactionBuilder, Crypto, utils, Parameter, ...) and
 * the SDK's compiled .d.ts is not strict enough for our usage to typecheck
 * without per-call casting. Per-domain typed wrappers (e.g. `loadVoteSdk`)
 * narrow this to the surface they need.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sdk = typeof import('ontology-ts-sdk') & Record<string, any>

let ontologySdkPromise: Promise<Sdk> | undefined

export function loadOntologySdk(): Promise<Sdk> {
  if (!ontologySdkPromise) {
    ontologySdkPromise = import('ontology-ts-sdk') as Promise<Sdk>
  }

  return ontologySdkPromise
}
