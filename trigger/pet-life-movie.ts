import { logger, task } from "@trigger.dev/sdk/v3"
import { z } from "zod"
import { executePetMovieRenderJob } from "../src/lib/pet-life-movie/render"

const payloadSchema = z.object({ job_id: z.string().uuid(), project_id: z.string().uuid() })

export const petLifeMovieRenderTask = task({
  id: "pet-life-movie-render",
  description: "Dispatch a paid Pet Life Movie to the identity-safe OSS GPU renderer.",
  queue: { name: "pet-life-movie", concurrencyLimit: 2 },
  maxDuration: 1800,
  retry: { maxAttempts: 2, minTimeoutInMs: 60_000, maxTimeoutInMs: 300_000, factor: 2 },
  run: async (payload: unknown) => {
    const parsed = payloadSchema.parse(payload)
    logger.info("Pet Life Movie render starting", { jobId: parsed.job_id, projectId: parsed.project_id })
    return executePetMovieRenderJob(parsed.job_id, parsed.project_id)
  },
})

