/**
 * storageCodec.ts
 *
 * A tiny, typed helper for deserializing the Ontology SDK's binary storage
 * payloads. The SDK exposes a loosely-typed `StringReader` whose cursor-based
 * methods (`readLong`, `readNextBytes`, …) return `any`. `deserialize` narrows
 * that reader to {@link StringReaderLike} and builds a strongly-typed record by
 * reading each field in declaration order, so callers no longer need
 * `as unknown as` casts when materializing typed governance structures.
 */

/**
 * The cursor-based subset of the SDK `StringReader` used by storage readers.
 * Each call advances the internal read position, so field decoders MUST be
 * invoked in the exact wire order.
 */
export interface StringReaderLike {
  readInt(): number
  readUint8(): number
  readUint32(): number
  readLong(): number
  /** Reads a length-prefixed byte run and returns it as a hex string. */
  readNextBytes(): string
  /** Reads `len` bytes and returns them as a hex string. */
  read(len: number): string
}

/**
 * Maps every key of `T` to a decoder that extracts that field from the reader.
 * The decoder order in the object literal defines the read order.
 */
export type StorageSchema<T> = {
  [K in keyof T]: (sr: StringReaderLike) => T[K]
}

/**
 * Builds a typed object by running each decoder against the shared reader in
 * insertion order. Insertion order is preserved because the schema is a plain
 * object literal, which matters since the reader is stateful and sequential.
 */
export function deserialize<T extends object>(sr: StringReaderLike, schema: StorageSchema<T>): T {
  const out: Partial<T> = {}
  for (const key of Object.keys(schema) as (keyof T)[]) {
    out[key] = schema[key](sr)
  }
  return out as T
}
