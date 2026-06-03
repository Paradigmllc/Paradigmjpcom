import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  console.error("Missing N8N_BASE_URL or N8N_API_KEY in .env.local");
  process.exit(1);
}

const workflow = {
  name: "OpenMontage Studio Pipeline",
  active: true,
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "studio-pipeline",
        responseMode: "lastNode",
        options: {}
      },
      name: "Webhook (Studio Trigger)",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [250, 300]
    },
    {
      parameters: {
        keepOnlySet: true,
        values: {
          string: [
            { name: "status", value: "success" },
            { name: "message", value: "Dispatched to ComfyUI pipeline successfully via n8n" },
            { name: "jobId", value: "={{ $json.body.jobId || 'n8n-' + $execution.id }}" }
          ]
        },
        options: {}
      },
      name: "Mock ComfyUI E2E Response",
      type: "n8n-nodes-base.set",
      typeVersion: 1,
      position: [500, 300]
    }
  ],
  connections: {
    "Webhook (Studio Trigger)": {
      main: [
        [
          {
            node: "Mock ComfyUI E2E Response",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  },
  settings: {
    executionOrder: "v1"
  }
};

async function deployWorkflow() {
  console.log(`Deploying workflow to ${N8N_BASE_URL}...`);
  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": N8N_API_KEY as string
      },
      body: JSON.stringify(workflow)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to deploy workflow: ${res.status} ${res.statusText}`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await res.json();
    console.log(`Successfully deployed workflow. ID: ${data.id}`);
    
    // The webhook URL will be {N8N_BASE_URL}/webhook/studio-pipeline
    const webhookUrl = `${N8N_BASE_URL}/webhook/studio-pipeline`;
    console.log(`\nWebhook URL for OpenMontage Studio: ${webhookUrl}`);
    
    // Write back to .env.local
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("N8N_STUDIO_WEBHOOK_URL=")) {
      envContent = envContent.replace(/N8N_STUDIO_WEBHOOK_URL=.*/, `N8N_STUDIO_WEBHOOK_URL=${webhookUrl}`);
    } else {
      envContent += `\nN8N_STUDIO_WEBHOOK_URL=${webhookUrl}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`\nUpdated .env.local with N8N_STUDIO_WEBHOOK_URL`);

  } catch (err) {
    console.error("Error during deployment:", err);
    process.exit(1);
  }
}

deployWorkflow();
