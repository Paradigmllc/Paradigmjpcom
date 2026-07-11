/**
 * figma-mcp-client.ts — Proper MCP stdio client for @hapins/figma-mcp.
 *
 * Communicates with the Figma MCP server via JSON-RPC over stdio.
 * This is the correct, non-shortcut way to use the Figma MCP server.
 */
import { spawn, type ChildProcess } from "child_process"
import { createInterface } from "readline"

export interface FigmaMCPTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface FigmaMCPSession {
  listTools(): Promise<FigmaMCPTool[]>
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>
  close(): void
}

// ── MCP JSON-RPC client ──

class MCPStdioClient implements FigmaMCPSession {
  private proc: ChildProcess
  private requestId = 0
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private buffer = ""

  constructor() {
    // Spawn the Figma MCP server as a child process
    this.proc = spawn("npx", ["-y", "@hapins/figma-mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(process.env.FIGMA_ACCESS_TOKEN?.trim()
          ? { FIGMA_ACCESS_TOKEN: process.env.FIGMA_ACCESS_TOKEN.trim() }
          : {}),
      },
    })

    // Read responses from stdout line by line
    const rl = createInterface({ input: this.proc.stdout!, crlfDelay: Infinity })
    rl.on("line", (line: string) => {
      try {
        const msg = JSON.parse(line)
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          if (msg.error) reject(new Error(msg.error.message || "MCP error"))
          else resolve(msg.result)
        }
      } catch {
        // non-JSON line, ignore
      }
    })

    this.proc.stderr?.on("data", (d: Buffer) => {
      console.error("[figma-mcp] stderr:", d.toString().slice(0, 200))
    })

    this.proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[figma-mcp] process exited with code ${code}`)
      }
    })
  }

  private async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId
    const request = JSON.stringify({ jsonrpc: "2.0", id, method, params })
    this.proc.stdin!.write(request + "\n")

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`MCP call "${method}" timed out`))
        }
      }, 30_000)
    })
  }

  async initialize(): Promise<void> {
    // MCP initialization handshake
    const result = await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "paradigm-figma-client", version: "1.0.0" },
    })
    console.info("[figma-mcp] initialized:", JSON.stringify(result).slice(0, 200))

    // Send initialized notification
    this.proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n")
  }

  async listTools(): Promise<FigmaMCPTool[]> {
    const result = await this.send("tools/list") as { tools?: FigmaMCPTool[] }
    return result?.tools || []
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.send("tools/call", {
      name,
      arguments: args,
    })
    return result
  }

  close(): void {
    this.proc.kill()
    this.pending.forEach(({ reject }) => reject(new Error("Client closed")))
    this.pending.clear()
  }
}

// ── Public API ──

export async function createFigmaMCPSession(): Promise<FigmaMCPSession> {
  const client = new MCPStdioClient()
  await client.initialize()
  return client
}

// ── High-level: extract design system from Figma file ──

export interface FigmaDesignExtract {
  fileKey: string
  fileName: string
  colors: string[]
  fonts: string[]
  layoutPatterns: Array<{
    name: string
    type: string
    layoutMode?: string
    width: number
    height: number
    padding?: { t: number; r: number; b: number; l: number }
    gap?: number
    radius?: number
    bg?: string
  }>
  componentCount: number
  textStyles: Array<{
    text: string
    fontSize: number
    fontWeight: number
    fontFamily: string
  }>
}

export async function extractFigmaDesign(fileKey: string, nodeId?: string): Promise<FigmaDesignExtract> {
  const session = await createFigmaMCPSession()

  try {
    // List available tools
    const tools = await session.listTools()
    console.info("[figma-mcp] available tools:", tools.map(t => t.name).join(", "))

    // Call the get_file tool (or whatever the Figma MCP exposes)
    // The @hapins/figma-mcp exposes tools like get_file, get_component, etc.
    const fileTool = tools.find(t => t.name.includes("file") || t.name.includes("get_file"))
    const nodeTool = tools.find(t => t.name.includes("node") || t.name.includes("get_node"))
    const componentTool = tools.find(t => t.name.includes("component"))

    let fileData: any = {}
    let nodeData: any = {}

    if (fileTool) {
      fileData = await session.callTool(fileTool.name, { fileKey })
    }
    if (nodeTool && nodeId) {
      nodeData = await session.callTool(nodeTool.name, { fileKey, nodeId })
    }

    // Parse extracted data
    const colors = new Set<string>()
    const fonts = new Set<string>()
    const layoutPatterns: FigmaDesignExtract["layoutPatterns"] = []
    const textStyles: FigmaDesignExtract["textStyles"] = []

    // Walk the Figma node tree from MCP response
    function walkNode(node: any, depth: number) {
      if (!node || depth > 6) return

      if (node.layoutMode && node.layoutMode !== "NONE") {
        layoutPatterns.push({
          name: node.name || "unnamed",
          type: node.type || "FRAME",
          layoutMode: node.layoutMode,
          width: Math.round(node.absoluteBoundingBox?.width || 0),
          height: Math.round(node.absoluteBoundingBox?.height || 0),
          padding: node.paddingTop !== undefined ? {
            t: node.paddingTop || 0, r: node.paddingRight || 0,
            b: node.paddingBottom || 0, l: node.paddingLeft || 0,
          } : undefined,
          gap: node.itemSpacing || 0,
          radius: node.cornerRadius || 0,
          bg: node.fills?.[0]?.color ? rgbToHex(node.fills[0].color) : undefined,
        })
      }

      if (node.fills) {
        for (const f of node.fills) {
          if (f.type === "SOLID" && f.color) {
            colors.add(rgbToHex(f.color))
          }
        }
      }

      if (node.style?.fontFamily) fonts.add(node.style.fontFamily)
      if (node.type === "TEXT" && node.characters) {
        textStyles.push({
          text: node.characters.slice(0, 60),
          fontSize: node.style?.fontSize || 0,
          fontWeight: node.style?.fontWeight || 400,
          fontFamily: node.style?.fontFamily || "",
        })
      }

      if (node.children) {
        for (const child of node.children) walkNode(child, depth + 1)
      }
    }

    // Walk root document or node data
    if (nodeData?.document) walkNode(nodeData.document, 0)
    else if (fileData?.document) walkNode(fileData.document, 0)

    return {
      fileKey,
      fileName: fileData?.name || nodeData?.name || fileKey,
      colors: [...colors],
      fonts: [...fonts],
      layoutPatterns,
      componentCount: 0,
      textStyles,
    }
  } finally {
    session.close()
  }
}

function rgbToHex(c: { r: number; g: number; b: number }): string {
  return "#" + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("")
}
