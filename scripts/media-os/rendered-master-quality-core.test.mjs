import { describe, expect, it } from "vitest";
import { evaluateRenderedMaster } from "./rendered-master-quality-core.mjs";

const probe = {
  format: { duration: "30.000" },
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "30/1" },
    { codec_type: "audio", codec_name: "aac", channels: 2, sample_rate: "48000" },
  ],
};

describe("rendered master quality gate", () => {
  it("passes a delivery-ready audiovisual master", () => {
    const report = evaluateRenderedMaster({ probe, targetDuration: 30, loudness: { input_i: "-14.2", input_tp: "-1.7" }, sampleHashes: ["a", "b", "c"] });
    expect(report.status).toBe("pass");
    expect(report.score).toBe(100);
  });

  it("blocks a silent video-only file", () => {
    const report = evaluateRenderedMaster({ probe: { ...probe, streams: [probe.streams[0]] }, targetDuration: 30, loudness: {}, sampleHashes: ["a", "b"] });
    expect(report.status).toBe("blocked");
    expect(report.blockerIds).toContain("delivery_audio_stream");
    expect(report.blockerIds).toContain("integrated_loudness");
  });
});
