// @vitest-environment node
import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import sharp from "sharp"

function box(name: string, data: Buffer, declaredSize = data.length + 8) {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(declaredSize)
  header.write(name, 4, "ascii")
  return Buffer.concat([header, data])
}

const ispe = Buffer.alloc(12)
ispe.writeUInt32BE(128, 4)
ispe.writeUInt32BE(256, 8)
const icns = Buffer.from("69636e73000000106973333200000000", "hex")
const heif = Buffer.concat([
  box("ftyp", Buffer.from("avif\0\0\0\0", "binary")),
  box("meta", Buffer.concat([Buffer.alloc(4), box("iprp", box("ipco", box("ispe", ispe, 0)))])),
])
const jxl = Buffer.concat([
  box("JXL ", Buffer.from("0d0a870a", "hex")),
  box("ftyp", Buffer.from("jxl \0\0\0\0", "binary")),
  box("jxlp", Buffer.alloc(4), 0),
])

// The timeout runs OUTSIDE the parser process: an event-loop hang cannot defeat it.
// Fixtures never leave this machine and never hit a production upload endpoint.
const probe = String.raw`
  const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const { pathToFileURL } = require('node:url');
  const [mode] = process.argv.slice(1);
  const data = Buffer.from(readFileSync(0, 'utf8'), 'base64');
  const dir = mkdtempSync(join(tmpdir(), 'paradigm-image-probe-'));
  const file = join(dir, 'fixture.bin');
  (async () => {
    try {
      writeFileSync(file, data);
      const entry = pathToFileURL(require.resolve('payload'));
      const { getImageSize } = await import(new URL('uploads/getImageSize.js', entry));
      const fileInput = { data, mimetype: 'image/png', ...(mode.endsWith('file') ? { tempFilePath: file } : {}) };
      const result = await getImageSize({ file: fileInput, ...(mode.startsWith('sharp') ? { sharp: require('sharp') } : {}) });
      process.stdout.write(JSON.stringify({ completed: true, result }));
    } catch (error) {
      if (['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ENOENT'].includes(error?.code)) throw error;
      process.stderr.write(String(error) + '\n');
      process.stdout.write(JSON.stringify({ completed: true, rejected: true }));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  })().catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
`

function runProbe(data: Buffer, mode: string) {
  const child = spawnSync(process.execPath, ["--max-old-space-size=64", "-e", probe, mode], {
    input: data.toString("base64"), encoding: "utf8", timeout: 2000, killSignal: "SIGKILL", maxBuffer: 8192,
  })
  expect(child.error, `${mode}: ${child.error?.message ?? child.stderr}`).toBeUndefined()
  expect(child.status, `${mode}: ${child.stderr}`).toBe(0)
  return JSON.parse(child.stdout) as { completed: boolean; rejected?: boolean; result?: { width: number; height: number } }
}

const modes = ["probe-buffer", "probe-file", "sharp-buffer", "sharp-file"] as const
describe("image parser security regression", () => {
  for (const [name, data] of [["ICNS", icns], ["HEIF", heif], ["JXL", jxl]] as const) {
    it.each(modes)(`${name} zero length terminates through %s`, (mode) => {
      expect(runProbe(data, mode).completed).toBe(true)
    })
  }

  it.each(["png", "jpeg", "webp", "avif", "tiff", "gif"] as const)("preserves %s dimensions", async (format) => {
    const buffer = await sharp({ create: { width: 128, height: 256, channels: 3, background: "#c0a080" } }).toFormat(format).toBuffer()
    for (const mode of modes) expect(runProbe(buffer, mode).result).toMatchObject({ width: 128, height: 256 })
  })

})
