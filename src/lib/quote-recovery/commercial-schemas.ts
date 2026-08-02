import { z } from "zod"

const email = z.string().trim().toLowerCase().email("メールアドレスを確認してください").max(254)
const password = z.string().min(12, "パスワードは12文字以上で入力してください").max(128)
  .regex(/[a-z]/, "英小文字を1文字以上含めてください")
  .regex(/[A-Z]/, "英大文字を1文字以上含めてください")
  .regex(/[0-9]/, "数字を1文字以上含めてください")

export const quoteRecoverySignupSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1).max(100),
  organizationName: z.string().trim().max(200).optional(),
  inviteToken: z.string().trim().min(32).max(200).optional(),
}).superRefine((value, context) => {
  if (!value.inviteToken && !value.organizationName) {
    context.addIssue({ code: "custom", path: ["organizationName"], message: "会社名を入力してください" })
  }
})

export const quoteRecoveryLoginSchema = z.object({ email, password: z.string().min(1).max(128) })

export const quoteRecoveryResetRequestSchema = z.object({ email })

export const quoteRecoveryResetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(200),
  password,
})

export const quoteRecoveryInviteSchema = z.object({
  email,
  role: z.enum(["admin", "member"]),
})

export const quoteRecoveryActivitySchema = z.object({
  quoteId: z.string().uuid(),
  activityType: z.enum(["call", "email", "meeting", "note", "status_change", "next_action"]),
  note: z.string().trim().min(1).max(4000),
  occurredAt: z.string().datetime().optional(),
})

export const quoteRecoveryQuoteUpdateSchema = z.object({
  ownerName: z.string().trim().max(100).nullable(),
  nextActionDate: z.string().date().nullable(),
  status: z.enum(["open", "won", "lost"]),
  activityType: z.enum(["call", "email", "meeting", "note", "status_change", "next_action"]).optional(),
  note: z.string().trim().max(4000).optional(),
})

export const quoteRecoveryMemberUpdateSchema = z.object({
  role: z.enum(["admin", "member"]),
})

export const quoteRecoveryImportSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  rows: z.array(z.object({
    quoteId: z.string().trim().min(1).max(100),
    companyName: z.string().trim().min(1).max(200),
    quoteDate: z.string().date(),
    amount: z.number().int().min(0).max(1_000_000_000_000),
    owner: z.string().trim().max(100).nullable().optional(),
    lastContactDate: z.string().date().nullable().optional(),
    nextActionDate: z.string().date().nullable().optional(),
    status: z.enum(["open", "won", "lost"]).optional(),
  })).min(1).max(1_000),
})

export function zodCommercialError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "入力内容を確認してください"
}
