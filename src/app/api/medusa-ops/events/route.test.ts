import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const m=vi.hoisted(()=>({save:vi.fn()}));
vi.mock("@/lib/medusa-ops/events",async original=>({...await original<typeof import("@/lib/medusa-ops/events")>(),saveChange:m.save}));
import { POST } from "./route";
const secret="s".repeat(32);
function request(body='{"topic":"product.updated","entityId":"prod_1","occurredAt":"2026-10-31T00:00:00Z"}',signed=true){
 const timestamp=String(Date.now());
 return new Request("https://ops.test/api/medusa-ops/events",{method:"POST",body,headers:{"x-sericia-timestamp":timestamp,"x-sericia-signature":signed?createHmac("sha256",secret).update(timestamp+"."+body).digest("hex"):"invalid"}});
}
beforeEach(()=>{vi.stubEnv("SERICIA_MEDUSA_EVENT_SECRET",secret);vi.clearAllMocks();m.save.mockResolvedValue({duplicate:false});});
afterEach(()=>vi.unstubAllEnvs());
it("rejects anonymous and oversized requests without writing",async()=>{
 const log=vi.spyOn(console,"error").mockImplementation(()=>{});
 expect((await POST(request(undefined,false))).status).toBe(401);
 expect((await POST(request("x".repeat(4097)))).status).toBe(413);
 expect(m.save).not.toHaveBeenCalled();log.mockRestore();
});
it("accepts verified minimal events and reports retriable storage failure",async()=>{
 expect((await POST(request())).status).toBe(200);
 m.save.mockRejectedValue(new Error("private details")); const log=vi.spyOn(console,"error").mockImplementation(()=>{});
 const response=await POST(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain("private");log.mockRestore();
});
