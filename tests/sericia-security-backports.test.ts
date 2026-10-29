// @vitest-environment node
import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const sdkRequire=createRequire(require.resolve('@coinbase/cdp-sdk'));
const {z}=sdkRequire('zod') as typeof import('zod/v3');
const merge=require('deepmerge') as (a:unknown,b:unknown)=>Record<string,unknown>;
it('bounds invalid array issue accumulation synchronously and asynchronously',async()=>{
 let visits=0;const schema=z.array(z.preprocess(v=>{visits++;return v;},z.number()));
 const result=schema.safeParse(Array(10000).fill('invalid'));
 expect(result.success).toBe(false);expect(visits).toBe(100);
 visits=0;expect((await schema.safeParseAsync(Array(10000).fill('invalid'))).success).toBe(false);expect(visits).toBe(100);
});
it('rejects oversized constrained arrays before validating each element',()=>{
 let visits=0;const schema=z.array(z.preprocess(v=>{visits++;return v;},z.number())).max(5);
 expect(schema.safeParse(Array(10000).fill(1)).success).toBe(false);expect(visits).toBe(0);
});
it('preserves valid values, transformations, nested errors and v3 record semantics',async()=>{
 expect(z.array(z.number().transform(v=>v+1)).parse([1,2])).toEqual([2,3]);
 expect((await z.array(z.number()).parseAsync(Array(1000).fill(1))).length).toBe(1000);
 expect(z.record(z.array(z.object({name:z.string(),type:z.string()}))).parse({Example:[{name:'value',type:'uint256'}]})).toEqual({Example:[{name:'value',type:'uint256'}]});
 const bad=z.array(z.array(z.number())).safeParse([['bad']]);expect(bad.success).toBe(false);if(!bad.success)expect(bad.error.issues[0].path).toEqual([0,0]);
});
it('blocks poisoning from both a malicious target and source',()=>{
 const attack=JSON.parse('{"__proto__":{"poisoned":true},"constructor":{"prototype":{"poisoned":true}},"safe":1}');
 for(const result of [merge(Object.create(null),attack),merge(attack,{}),merge({},attack)]){
  expect(result.poisoned).toBeUndefined();expect(Object.getPrototypeOf(result)).toBe(Object.prototype);expect(Object.hasOwn(result,'__proto__')).toBe(false);expect(result.safe).toBe(1);
 }
 expect(merge({list:[1],nested:{a:1}},{list:[2],nested:{b:2}})).toEqual({list:[1,2],nested:{a:1,b:2}});
});
it('ships reviewed, disclosed artifacts instead of relabelling unpatched upstream',()=>{
 const expected={
  'vendor/paradigmllc-zod-security-3.25.76.tgz':'sha512-GerEGbBZ04DzB5xTJ2DoEKCwXs1xtMRBJATF/ejb5Ho/I10GsYuN9Cpz4GhVQ+cWfjtWXrldafmosGxvZ4trSw==',
  'vendor/paradigmllc-deepmerge-security-4.3.1.tgz':'sha512-yfpB1f5C0tdw+miIGXC8hR6kY9fkZMFbOcJ6Gg+c1QxlE9T/HzuFFkhOqSCN+yfnre+EKrkn0khTBi2qLI7Jiw=='
 };
 for(const [file,hash] of Object.entries(expected))expect('sha512-'+createHash('sha512').update(readFileSync(file)).digest('base64')).toBe(hash);
 expect(sdkRequire('zod/package.json').paradigmUpstream.package).toBe('zod@3.25.76');
 expect(require('deepmerge/package.json').paradigmUpstream.package).toBe('deepmerge@4.3.1');
 expect(()=>sdkRequire('zod/v4')).toThrow();
});
