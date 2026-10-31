import { beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const m = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/shopify-ops/operations/store", () => ({ operationsDb: () => ({ from: m.from }) }));
vi.mock("@/lib/notify", () => ({ notifyBothChannels: m.notify }));
import { changeEvent, saveChange, verifyEventSignature } from "./events";
const event = { topic: "product.updated" as const, entityId: "prod_1", occurredAt: "2026-10-31T00:00:00Z" };
beforeEach(() => { vi.clearAllMocks(); m.notify.mockResolvedValue({ok:true}); });
it("rejects expired, malformed and tampered signatures", () => {
 const now=1793404800000, timestamp=String(now), secret="s".repeat(32), body=Buffer.from(JSON.stringify(event));
 const signature=createHmac("sha256",secret).update(timestamp+".").update(body).digest("hex");
 expect(verifyEventSignature(body,timestamp,signature,secret,now)).toBe(true);
 for(const [b,t,s] of [[Buffer.from("tampered"),timestamp,signature],[body,String(now-300001),signature],[body,timestamp,"x"],[body,null,signature]] as const)
  expect(verifyEventSignature(b,t,s,secret,now)).toBe(false);
 expect(changeEvent.safeParse({...event,email:"private"}).success).toBe(false);
 expect(changeEvent.safeParse({...event,topic:"order.placed"}).success).toBe(false);
});
it("deduplicates deliveries before notification",async()=>{
 const select=vi.fn().mockResolvedValue({data:[],error:null}); const upsert=vi.fn(()=>({select})); m.from.mockReturnValue({upsert});
 expect(await saveChange(event)).toEqual({duplicate:true}); expect(m.notify).not.toHaveBeenCalled();
 await saveChange(event); expect(upsert.mock.calls[0]).toEqual(upsert.mock.calls[1]);
});
it("reports notification failure durably without losing the event",async()=>{
 const eq=vi.fn().mockResolvedValue({error:null}); const update=vi.fn(()=>({eq}));
 m.from.mockReturnValue({upsert:()=>({select:async()=>({data:[{id:"saved"}],error:null})}),update});
 m.notify.mockResolvedValue({ok:false});
 const log=vi.spyOn(console,"error").mockImplementation(()=>{});
 expect(await saveChange(event)).toEqual({duplicate:false}); expect(update).toHaveBeenCalledWith({notification_error:true}); log.mockRestore();
});
it("does not acknowledge a failed database write",async()=>{
 m.from.mockReturnValue({upsert:()=>({select:async()=>({error:{code:"unavailable"}})})});
 await expect(saveChange(event)).rejects.toThrow("persistence"); expect(m.notify).not.toHaveBeenCalled();
});
