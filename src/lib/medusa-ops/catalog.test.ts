import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { catalogQuery, getMedusaCatalog } from "./catalog";
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
  vi.stubEnv("SERICIA_MEDUSA_ADMIN_URL", "http://medusa:9000");
  vi.stubEnv("SERICIA_MEDUSA_SECRET_API_KEY", "private-test-key");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("reports unconfigured without making a request", async () => {
  vi.stubEnv("SERICIA_MEDUSA_ADMIN_URL", ""); vi.stubEnv("SERICIA_MEDUSA_SECRET_API_KEY", "");
  expect(await getMedusaCatalog({kind:"products",offset:0})).toEqual({configured:false});
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects incomplete settings, caller URLs and malformed paging", async () => {
  vi.stubEnv("SERICIA_MEDUSA_SECRET_API_KEY", "");
  await expect(getMedusaCatalog({kind:"products",offset:0})).rejects.toThrow();
  for(const params of [{kind:"orders"},{offset:-1},{offset:1.2},{offset:1000001},{url:"https://evil.test"}])
    expect(catalogQuery.safeParse(params).success).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("uses a fixed GET path, secret header, no redirects or caching and strips unrelated fields", async () => {
  fetchMock.mockResolvedValue(Response.json({count:51,offset:0,limit:50,products:Array.from({length:50},(_,i)=>({id:`prod_${i}`,title:"Tea",handle:"tea",status:"draft",updated_at:"2026-10-30T00:00:00Z",metadata:{secret:"omit"}}))}));
  const data=await getMedusaCatalog({kind:"products",offset:0});
  expect(data).toMatchObject({configured:true,kind:"products",count:51,nextOffset:50});
  expect(JSON.stringify(data)).not.toContain("secret");
  const [url,options]=fetchMock.mock.calls[0];
  expect(url.pathname).toBe("/admin/products");
  expect(url.searchParams.get("limit")).toBe("50");
  expect(options).toMatchObject({headers:{Authorization:"Basic private-test-key"},cache:"no-store",redirect:"error"});
  expect(options.method).toBeUndefined();
});
it("preserves absence of warehouse levels and negative reservation balance",async()=>{
  fetchMock.mockResolvedValue(Response.json({count:2,offset:0,limit:50,inventory_items:[
    {id:"iitem_1",title:null,sku:null,updated_at:"2026-10-30T00:00:00Z",location_levels:[]},
    {id:"iitem_2",title:"Tea",sku:"tea",updated_at:"2026-10-30T00:00:00Z",location_levels:[{id:"ilvl_1",location_id:"sloc_1",stocked_quantity:2,reserved_quantity:3,incoming_quantity:8,metadata:{private:true}}]},
  ]}));
  const data=await getMedusaCatalog({kind:"inventory",offset:0});
  expect(data).toMatchObject({configured:true,kind:"inventory",nextOffset:null,rows:[{location_levels:[]},{location_levels:[{stocked_quantity:2,reserved_quantity:3,incoming_quantity:8}]}]});
  expect(JSON.stringify(data)).not.toContain("private");
});
it("rejects missing levels instead of inventing zero stock",async()=>{
  fetchMock.mockResolvedValue(Response.json({count:1,offset:0,limit:50,inventory_items:[{id:"i",title:null,sku:null,updated_at:"2026-10-30T00:00:00Z"}]}));
  await expect(getMedusaCatalog({kind:"inventory",offset:0})).rejects.toThrow();
});
it("rejects failed upstream and inconsistent pagination",async()=>{
  fetchMock.mockResolvedValue(new Response("private error",{status:401}));
  await expect(getMedusaCatalog({kind:"products",offset:0})).rejects.toThrow("HTTP 401");
  fetchMock.mockResolvedValue(Response.json({count:1,offset:0,limit:50,products:[]}));
  await expect(getMedusaCatalog({kind:"products",offset:0})).rejects.toThrow("不整合");
});
