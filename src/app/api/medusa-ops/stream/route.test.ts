import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({client:vi.fn(),auth:vi.fn(),history:vi.fn(),subscribe:vi.fn(),remove:vi.fn(),disconnect:vi.fn(),on:vi.fn()}));
vi.mock("@/lib/admin-auth",()=>({authorizePayloadAdminRequest:m.auth}));
vi.mock("@/lib/medusa-ops/events",async(importOriginal)=>({...await importOriginal<typeof import("@/lib/medusa-ops/events")>(),readChanges:m.history}));
vi.mock("@/lib/supabase",()=>({getSalesSupabaseConfig:()=>({url:"http://supabase-rest-1:3000",serviceKey:"secret"})}));
vi.mock("@supabase/supabase-js",()=>({RealtimeClient:class {
 constructor(...args: unknown[]){m.client(...args);}
 channel(){const channel={on:m.on.mockImplementation(()=>channel),subscribe:m.subscribe};return channel;}
 removeChannel=m.remove;disconnect=m.disconnect;
}}));
import { GET } from "./route";
beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({ok:true,userId:"1",userRole:"admin"});m.history.mockResolvedValue([]);m.remove.mockResolvedValue(undefined);m.disconnect.mockResolvedValue(undefined);});
afterEach(()=>vi.restoreAllMocks());
it("rejects anonymous and viewer before opening a stream",async()=>{
 for(const auth of [{ok:false},{ok:true,userId:"1",userRole:"viewer"},{ok:true,userRole:"admin"}]){
  m.auth.mockResolvedValue(auth);expect((await GET(new Request("https://ops.test/api/medusa-ops/stream")))).toHaveProperty("status",401);
 }
 expect(m.subscribe).not.toHaveBeenCalled();
});
it("subscribes before reading history, pushes changes and cleans up on abort",async()=>{
 const controller=new AbortController();const response=await GET(new Request("https://ops.test/api/medusa-ops/stream",{signal:controller.signal}));
 expect(m.client.mock.calls[0][0]).toBe("http://supabase-realtime:4000/socket");
 expect(m.client.mock.calls[0][1].transport).toBeTypeOf("function");
 expect(response.headers.get("cache-control")).toBe("private, no-store");expect(m.history).not.toHaveBeenCalled();
 m.subscribe.mock.calls[0][0]("SUBSCRIBED");await vi.waitFor(()=>expect(m.history).toHaveBeenCalledTimes(1));
 m.on.mock.calls[0][2]();await vi.waitFor(()=>expect(m.history).toHaveBeenCalledTimes(2));
 controller.abort();await vi.waitFor(()=>expect(m.disconnect).toHaveBeenCalledTimes(1));
 expect(m.remove).toHaveBeenCalledTimes(1);
});

it("rejects invalid and repeated filters before opening a stream",async()=>{
 for(const query of ["notifications=unknown","notifications=all&notifications=failed","other=failed"]){
  expect((await GET(new Request(`https://ops.test/api/medusa-ops/stream?${query}`))).status).toBe(400);
 }
 expect(m.subscribe).not.toHaveBeenCalled();
});
it("keeps the failure filter on realtime updates",async()=>{
 const controller=new AbortController();
 await GET(new Request("https://ops.test/api/medusa-ops/stream?notifications=failed",{signal:controller.signal}));
 m.subscribe.mock.calls[0][0]("SUBSCRIBED");
 await vi.waitFor(()=>expect(m.history).toHaveBeenCalledWith("failed"));
 m.on.mock.calls[0][2]();
 await vi.waitFor(()=>expect(m.history).toHaveBeenCalledTimes(2));
 expect(m.history.mock.calls.every(call=>call[0]==="failed")).toBe(true);
 controller.abort();
});
