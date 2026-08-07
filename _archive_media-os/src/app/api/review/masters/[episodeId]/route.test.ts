import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, parseByteRange, streamReviewFile } from "./route";

let directory: string;
let masterPath: string;

beforeEach(() => {
  directory = mkdtempSync(resolve(tmpdir(), "media-os-review-route-"));
  mkdirSync(directory, { recursive: true });
  masterPath = resolve(directory, "review.mp4");
  writeFileSync(masterPath, "abcdefghij");
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("authenticated review master streaming", () => {
  it("parses bounded, open, and suffix ranges", () => {
    expect(parseByteRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseByteRange("bytes=7-", 10)).toEqual({ start: 7, end: 9 });
    expect(parseByteRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(parseByteRange("bytes=12-13", 10)).toBe("invalid");
  });

  it("streams a requested byte range for browser seeking", async () => {
    const response = await streamReviewFile(masterPath, "review.mp4", "bytes=2-5", false);
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(await response.text()).toBe("cdef");
  });

  it("supports metadata-only requests and rejects unknown masters", async () => {
    const head = await streamReviewFile(masterPath, "review.mp4", null, true);
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("10");
    const missing = await GET(new Request("http://localhost"), { params: Promise.resolve({ episodeId: "unknown" }) });
    expect(missing.status).toBe(404);
  });
});
