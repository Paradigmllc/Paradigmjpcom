import { beforeEach, expect, it, vi } from 'vitest';
const get = vi.hoisted(() => vi.fn());
vi.mock('./catalog', () => ({ getMedusaCatalog: get }));
import { performMedusaDailyTask } from './daily';
import { performDailyTask } from '@/lib/shopify-ops/daily/tasks';
beforeEach(() => { get.mockReset(); });
it('blocks unconnected suppliers and social without external calls', async () => {
  for (const kind of ['suppliers', 'social'] as const) expect(await performMedusaDailyTask(kind, null)).toMatchObject({state:'blocked',cursor:null,summary:{platform:'medusa',processed:0}});
  expect(get).not.toHaveBeenCalled();
});
it('restarts legacy cursors and audits Medusa without copying customer data', async () => {
  get.mockResolvedValue({configured:true,count:1,rows:[{id:'order_1',email:'private'}],nextOffset:null});
  const result = await performMedusaDailyTask('orders','old-shopify-cursor');
  expect(get).toHaveBeenCalledWith({kind:'orders',offset:0});
  expect(result).toMatchObject({state:'succeeded',cursor:null,summary:{processed:1,count:1,readOnly:true}});
  expect(JSON.stringify(result)).not.toContain('private');
});
it('bounds each run to five pages and persists a Medusa-specific continuation', async () => {
  get.mockImplementation(async ({offset}) => ({configured:true,count:1000,rows:Array(50).fill({}),nextOffset:offset+50}));
  expect(await performMedusaDailyTask('inventory','medusa:50')).toMatchObject({cursor:'medusa:300',summary:{processed:250,cycleComplete:false}});
  expect(get).toHaveBeenCalledTimes(5);
});
it('does not report success for failed or missing upstream configuration', async () => {
  get.mockResolvedValue({configured:false});
  await expect(performMedusaDailyTask('products',null)).rejects.toThrow('未接続');
  get.mockRejectedValue(new Error('upstream unavailable'));
  await expect(performMedusaDailyTask('orders',null)).rejects.toThrow('upstream unavailable');
  await expect(performMedusaDailyTask('orders','medusa:1000001')).rejects.toThrow('取得位置');
});

it('routes the existing job executor to Medusa and requires an actor', async () => {
  get.mockResolvedValue({configured:true,count:0,rows:[],nextOffset:null});
  await expect(performDailyTask('orders',null,'')).rejects.toThrow('操作主体');
  expect(get).not.toHaveBeenCalled();
  expect(await performDailyTask('orders',null,'payload:1')).toMatchObject({summary:{platform:'medusa',count:0}});
});
