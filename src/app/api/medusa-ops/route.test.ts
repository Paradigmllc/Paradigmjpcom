import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({auth:vi.fn(),get:vi.fn()}));
vi.mock("@/lib/admin-auth",()=>({authorizePayloadAdminRequest:m.auth}));
vi.mock("@/lib/medusa-ops/catalog",async importOriginal=>{
  const original=await importOriginal<typeof import("@/lib/medusa-ops/catalog")>();
  return {...original,getMedusaCatalog:m.get};
});
import { GET } from "./route";
const request=(query="")=>new NextRequest(`https://paradigmjp.com/api/medusa-ops${query}`);
beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({ok:true,userId:1,userRole:"admin"});m.get.mockResolvedValue({configured:false});});
it("denies anonymous, unidentified and viewer sessions",async()=>{
  for(const auth of [{ok:false},{ok:true,userRole:"admin"},{ok:true,userId:1,userRole:"viewer"}]){
    m.auth.mockResolvedValue(auth);expect((await GET(request())).status).toBe(401);
  }
  expect(m.get).not.toHaveBeenCalled();
});
it("validates paging before contacting Medusa",async()=>{
  expect((await GET(request("?offset=-1"))).status).toBe(400);
  expect((await GET(request("?url=https://evil.test"))).status).toBe(400);
  expect(m.get).not.toHaveBeenCalled();
});
it("reads as editor without caching private data",async()=>{
  m.auth.mockResolvedValue({ok:true,userId:2,userRole:"editor"});
  const response=await GET(request("?kind=inventory&offset=50"));
  expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(m.get).toHaveBeenCalledWith({kind:"inventory",offset:50});
});
it("does not expose upstream credentials or private error payloads",async()=>{
  const log=vi.spyOn(console,"error").mockImplementation(()=>{});
  m.get.mockRejectedValue(new Error("http://internal secret-key"));
  const response=await GET(request());expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret-key");
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret-key");log.mockRestore();
});
