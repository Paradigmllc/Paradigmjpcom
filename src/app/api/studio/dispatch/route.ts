import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, voiceId, pipelineId, images } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.warn("[studio/dispatch] N8N_WEBHOOK_URL is not set. Simulating success.")
      return NextResponse.json({ 
        ok: true, 
        message: "Simulation mode: n8n webhook URL not configured.",
        jobId: `sim-${Date.now()}`
      })
    }

    // Dispatch the payload to Tier 2 (n8n Orchestrator)
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "paradigm_openmontage_studio",
        data: {
          prompt,
          voiceId,
          pipelineId,
          images: images || [],
        },
        metadata: {
          dispatchedAt: new Date().toISOString(),
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[studio/dispatch] n8n webhook failed:", errorText)
      return NextResponse.json({ error: "Failed to dispatch to orchestration tier" }, { status: 502 })
    }

    const result = await response.json()

    return NextResponse.json({ ok: true, result })

  } catch (error: any) {
    console.error("[studio/dispatch] Internal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
