import { Client } from "pg"
import type { SalesCrmViewField } from "@/lib/sales/crm-field-config"

function twentyFieldType(fieldType: SalesCrmViewField["fieldType"]): string {
  if (fieldType === "url") return "LINKS"
  if (fieldType === "select" || fieldType === "multi_select") return "SELECT"
  return "TEXT"
}

export async function ensureTwentyTextFieldsViaDatabase(
  client: Client,
  objectId: string,
  fields: SalesCrmViewField[],
): Promise<void> {
  const customFields = fields.filter((field) => field.twentyFieldName.startsWith("paradigm"))
  if (customFields.length === 0) return

  const objectRes = await client.query<{ workspaceId: string | null }>(
    'select "workspaceId" from core."objectMetadata" where id = $1 limit 1',
    [objectId],
  )
  const workspaceId = objectRes.rows[0]?.workspaceId
  if (!workspaceId) throw new Error("Twenty company workspace id was not found.")

  const appRes = await client.query<{ applicationId: string | null }>(
    `
      select "applicationId"
      from core."fieldMetadata"
      where "objectMetadataId" = $1
        and "applicationId" is not null
      limit 1
    `,
    [objectId],
  )
  const applicationId = appRes.rows[0]?.applicationId ?? null

  const schemaRes = await client.query<{ table_schema: string }>(
    `
      select table_schema
      from information_schema.tables
      where table_name = 'company'
        and table_schema like 'workspace_%'
      order by table_schema
      limit 1
    `,
  )
  const companySchema = schemaRes.rows[0]?.table_schema
  if (!companySchema) throw new Error("Twenty workspace company table was not found.")
  if (!/^workspace_[a-z0-9_]+$/.test(companySchema)) throw new Error("Unexpected Twenty workspace schema name.")

  for (const field of customFields) {
    const twentyType = twentyFieldType(field.fieldType)
    await client.query(
      `
        insert into core."fieldMetadata" (
          id,
          "objectMetadataId",
          type,
          name,
          label,
          description,
          icon,
          settings,
          options,
          "isActive",
          "isSystem",
          "isUIReadOnly",
          "isUIEditable",
          "isNullable",
          "workspaceId",
          "isLabelSyncedWithName",
          "createdAt",
          "updatedAt",
          "universalIdentifier",
          "applicationId"
        )
        values (
          gen_random_uuid(),
          $1,
          $7,
          $2,
          $3,
          $4,
          'IconDatabase',
          null,
          null,
          true,
          false,
          false,
          true,
          true,
          $5,
          false,
          now(),
          now(),
          gen_random_uuid(),
          $6
        )
        on conflict (name, "objectMetadataId", "workspaceId")
        do update set
          label = excluded.label,
          description = excluded.description,
          type = excluded.type,
          "isActive" = true,
          "isLabelSyncedWithName" = false,
          "updatedAt" = now()
      `,
      [objectId, field.twentyFieldName, field.label, field.description, workspaceId, applicationId, twentyType],
    )
    if (twentyType === "LINKS") {
      await client.query(`alter table ${companySchema}.company add column if not exists "${field.twentyFieldName}PrimaryLinkLabel" text`)
      await client.query(`alter table ${companySchema}.company add column if not exists "${field.twentyFieldName}PrimaryLinkUrl" text`)
      await client.query(`alter table ${companySchema}.company add column if not exists "${field.twentyFieldName}SecondaryLinks" jsonb`)
    } else {
      await client.query(`alter table ${companySchema}.company add column if not exists "${field.twentyFieldName}" text`)
    }
  }
}

export async function ensureTwentyViewFieldsViaDatabase(
  client: Client,
  objectId: string,
  fields: SalesCrmViewField[],
): Promise<void> {
  const viewRes = await client.query<{ id: string }>(
    `
      select id
      from core."view"
      where "objectMetadataId" = $1
        and type in ('TABLE', 'FIELDS_WIDGET')
        and "deletedAt" is null
    `,
    [objectId],
  )
  if (viewRes.rows.length === 0) return

  for (const field of fields) {
    const fieldRes = await client.query<{ id: string; workspaceId: string; applicationId: string | null }>(
      `
        select id, "workspaceId", "applicationId"
        from core."fieldMetadata"
        where "objectMetadataId" = $1
          and name = $2
        limit 1
      `,
      [objectId, field.twentyFieldName],
    )
    const metadata = fieldRes.rows[0]
    if (!metadata) continue

    for (const view of viewRes.rows) {
      await client.query(
        `
          update core."viewField"
          set
            "isVisible" = $2,
            position = $3,
            "isActive" = true,
            "updatedAt" = now()
          where "fieldMetadataId" = $1
            and "viewId" = $4
            and "deletedAt" is null
        `,
        [metadata.id, field.isVisible, field.position, view.id],
      )
      await client.query(
        `
          insert into core."viewField" (
            id,
            "fieldMetadataId",
            "isVisible",
            size,
            position,
            "viewId",
            "workspaceId",
            "createdAt",
            "updatedAt",
            "universalIdentifier",
            "applicationId",
            "isActive"
          )
          select gen_random_uuid(), $1, $2, 180, $3, $4, $5, now(), now(), gen_random_uuid(), $6, true
          where not exists (
            select 1
            from core."viewField"
            where "fieldMetadataId" = $1
              and "viewId" = $4
              and "deletedAt" is null
          )
        `,
        [metadata.id, field.isVisible, field.position, view.id, metadata.workspaceId, metadata.applicationId],
      )
    }
  }
}
