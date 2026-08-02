import { z } from "zod"

export const createPetMovieProjectSchema = z.object({
  petName: z.string().trim().min(1).max(80),
  species: z.enum(["dog", "cat"]),
  occasion: z.enum(["life", "birthday", "adoption", "growth", "memorial"]),
  locale: z.enum(["ja", "en", "es", "pt"]),
  mood: z.enum(["warm", "playful", "cinematic", "gentle"]),
  timeTogether: z.string().trim().max(120),
  memories: z.array(z.string().trim().max(300))
    .min(1)
    .max(3)
    .transform((items) => items.filter(Boolean))
    .refine((items) => items.length > 0, "At least one memory is required"),
  consentConfirmed: z.boolean().refine((value) => value, "Photo and AI-assisted creation consent is required"),
})

export const petMovieUploadSchema = z.object({
  files: z.array(z.object({
    name: z.string().trim().min(1).max(180),
    type: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
    size: z.number().int().min(1).max(20 * 1024 * 1024),
  })).min(1).max(20),
  contributorToken: z.string().min(32).optional(),
})

export const confirmPetMovieUploadsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(20),
})

export const petMovieCheckoutSchema = z.object({
  plan: z.enum(["mini", "story", "cinema"]),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
})

export const petMovieInviteSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254).optional(),
})

export type CreatePetMovieProjectInput = z.infer<typeof createPetMovieProjectSchema>

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch (error) {
    console.error("[pet-life-movie] invalid JSON body", error)
    throw new Error("INVALID_JSON")
  }
}
