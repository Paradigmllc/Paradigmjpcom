type InsertError = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

type InsertResult<T = unknown> = {
  data?: T | null
  error: InsertError | null
}

type InsertPayload = Record<string, unknown> | Array<Record<string, unknown>>
type InsertClient = { from: (table: string) => unknown }

function missingColumn(error: InsertError | null, columns: string[]): string | null {
  if (!error) return null
  const haystack = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ")
  return columns.find((column) => haystack.includes(column)) ?? null
}

function stripColumns<T extends Record<string, unknown>>(row: T, columns: string[]): T {
  const next = { ...row }
  for (const column of columns) delete next[column]
  return next
}

function stripPayload(payload: InsertPayload, columns: string[]): InsertPayload {
  if (Array.isArray(payload)) {
    return payload.map((row) => stripColumns(row, columns))
  }
  return stripColumns(payload, columns)
}

async function insertPayload(client: InsertClient, table: string, payload: InsertPayload): Promise<InsertResult> {
  const builder = client.from(table) as {
    insert: (values: InsertPayload) => PromiseLike<InsertResult>
  }
  return builder.insert(payload)
}

export async function insertWithOptionalColumns(
  client: InsertClient,
  table: string,
  payload: InsertPayload,
  optionalColumns: string[],
): Promise<InsertResult> {
  const first = await insertPayload(client, table, payload)
  const column = missingColumn(first.error, optionalColumns)
  if (!column) return first

  console.warn(`[sales-db] ${table}.${column} is not available; retrying insert without optional columns`)
  return insertPayload(client, table, stripPayload(payload, optionalColumns))
}

export function isMissingOptionalColumn(error: InsertError | null, columns: string[]): boolean {
  return Boolean(missingColumn(error, columns))
}

export function withoutOptionalColumns<T extends Record<string, unknown>>(payload: T, columns: string[]): T {
  return stripColumns(payload, columns)
}
