import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {chromium,expect} from '@playwright/test';
const destination=process.argv[2];
if(!destination||!path.isAbsolute(destination))throw new Error('Absolute evidence directory required');
await fs.mkdir(destination,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Toaster} from 'sonner';import {MedusaOpsShell} from './src/components/shopify-ops/MedusaOpsShell';createRoot(document.getElementById('app')).render(<MedusaOpsShell/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}});
const styles=await postcss([tailwind()]).process('@import "tailwindcss"; @source "../src/components/shopify-ops/MedusaCatalogPanel.tsx"; @source "../src/components/shopify-ops/MedusaChanges.tsx"; @source "../src/components/shopify-ops/MedusaOpsShell.tsx"; @source "../src/components/shopify-ops/ShopifyDailyPanel.tsx";',{from:path.join(process.cwd(),'scripts/medusa-fixture.css')});
const browser=await chromium.launch({headless:true,channel:process.env.CI?undefined:'chrome'});
let mode='normal';const calls=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>{errors.push(e.message);console.error('[fixture] browser error',e.message);});
 await page.addInitScript(() => {
   window.__eventStreams=[];
   window.EventSource=class {
     constructor(url){this.url=url;window.__eventStreams.push(this);setTimeout(()=>{this.onmessage?.({data:JSON.stringify({type:'connected'})});this.onmessage?.({data:JSON.stringify({type:'changes',rows:[]})});},20);}
     close(){}
   };
 });
 await page.route('http://sericia-fixture.test/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/shopify-ops/daily') return route.fulfill({json:{ok:true,jobs:[{kind:'suppliers',state:'blocked',cursor:null,due_at:'2026-11-03T00:00:00Z',last_success_at:null,summary:{platform:'medusa',processed:0},error_message:'仕入先の在庫API利用許可・認証情報が未取得です。'}],history:[]}});
  if(url.pathname==='/api/medusa-ops'){
   calls.push({method:req.method(),query:url.search});
   if(mode==='error')return route.fulfill({status:503,json:{ok:false,error:'接続を確認してください'}});
   if(mode==='unconfigured')return route.fulfill({json:{ok:true,catalog:{configured:false}}});
   const kind=url.searchParams.get('kind'),offset=Number(url.searchParams.get('offset'));
   const common={configured:true,fetchedAt:'2026-10-30T00:00:00Z',kind,count:mode==='empty'?0:51,offset,nextOffset:offset===0&&mode!=='empty'?50:null};
   const rows=mode==='empty'?[]:kind==='orders'?[{id:'order_fixture',display_id:42,status:'pending',payment_status:'captured',fulfillment_status:'not_fulfilled',currency_code:'jpy',total:1200,created_at:'2026-11-03T00:00:00Z'}]:kind==='inventory'?
     [{id:'iitem_1',title:'Japanese textile',sku:'TEXTILE-1',location_levels:[]},{id:'iitem_2',title:'Tea cup',sku:'CUP-1',location_levels:[{id:'ilvl_1',location_id:'sloc_1',stocked_quantity:2,reserved_quantity:3,incoming_quantity:8}]}]:
     [{id:`prod_${offset}`,title:offset?'Next product':'Japanese tea',status:'draft'}];
   return route.fulfill({json:{ok:true,catalog:{...common,rows}}});
  }
  return route.fulfill({contentType:'text/html',body:`<!DOCTYPE html><html lang="ja"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles.css}</style><body><main id="app" style="padding:16px"></main><script>${bundle.outputFiles[0].text}</script></body></html>`});
 });
 await page.goto('http://sericia-fixture.test/');await expect(page.getByRole('heading',{name:'Japanese tea',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'次の50件'}).click();await expect(page.getByRole('heading',{name:'Next product',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'次の50件'})).toBeDisabled();
 await page.getByRole('button',{name:'在庫品目',exact:true}).click();
 await expect(page.getByText('在庫拠点未登録（数量未確認）')).toBeVisible();
 await expect(page.getByText('予約差引 -1 ／ 入庫予定 8')).toBeVisible();
 for(const [name,width,height] of [['mobile',390,844],['desktop',1440,1000]]){
  await page.setViewportSize({width,height});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error(`${name} overflow`);
  await page.screenshot({path:path.join(destination,`${name}.png`),fullPage:true});
 }
 await page.getByRole('button',{name:'注文',exact:true}).click();
 await expect(page.getByRole('heading',{name:'注文 #42',exact:true})).toBeVisible();
 await expect(page.getByText('発送: not_fulfilled')).toBeVisible();
 await expect(page.getByText('注文: pending ／ 決済: captured')).toBeVisible();
 const before=calls.length;
 await page.evaluate(()=>window.__eventStreams.at(-1).onmessage({data:JSON.stringify({type:'changes',rows:[{id:'change1',topic:'product.updated',entity_id:'prod_1',received_at:'2026-10-31T00:00:00Z',notification_error:false}]})}));
 await expect.poll(()=>calls.length).toBeGreaterThan(before);
 await expect(page.getByText('product.updated ／ prod_1',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'通知失敗のみ表示'}).click();
 await expect(page.getByText('通知失敗は記録されていません。')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.__eventStreams.at(-1).url)).toContain('notifications=failed');
 const failureCalls=calls.length;
 await page.evaluate(()=>window.__eventStreams.at(-1).onmessage({data:JSON.stringify({type:'changes',rows:[{id:'old-failure',topic:'product.updated',entity_id:'prod_failed',received_at:'2026-10-01T00:00:00Z',notification_error:true}]})}));
 await expect(page.getByText('ベル・Slack通知の一部が失敗しました。')).toBeVisible();
 await expect.poll(()=>calls.length).toBeGreaterThan(failureCalls);
 const unchangedCalls=calls.length;
 await page.evaluate(()=>window.__eventStreams.at(-1).onmessage({data:JSON.stringify({type:'changes',rows:[{id:'old-failure',topic:'product.updated',entity_id:'prod_failed',received_at:'2026-10-01T00:00:00Z',notification_error:true}]})}));
 await expect.poll(()=>calls.length).toBeGreaterThan(unchangedCalls);
 for(const [name,width,height] of [['failed-mobile',390,844],['failed-desktop',1440,1000]]){
  await page.setViewportSize({width,height});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error(`${name} overflow`);
  await page.screenshot({path:path.join(destination,`${name}.png`),fullPage:true});
 }
 await page.getByRole('button',{name:'すべての変更通知'}).click();
 mode='empty';await page.getByRole('button',{name:'Medusaデータを再取得'}).click();await expect(page.getByText('このページに登録データはありません。')).toBeVisible();
 mode='unconfigured';await page.reload();await expect(page.getByText('Medusa管理APIは未接続です。',{exact:false})).toBeVisible();
 mode='error';await page.getByRole('button',{name:'Medusaデータを再取得'}).click();await expect(page.getByRole('alert')).toContainText('接続を確認してください');
 mode='normal';await page.getByRole('button',{name:'Medusaデータを再取得'}).click();await expect(page.getByRole('heading',{name:'Japanese tea',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'日々の運用・接続状況',exact:true}).click();
 await expect(page.getByText('仕入先の在庫API利用許可・認証情報が未取得です。',{exact:true})).toBeVisible();
 await expect(page).toHaveURL(/tab=daily/);
 await page.reload();
 await expect(page.getByRole('heading',{name:'日々の自動運用',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'商品・在庫・注文',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Japanese tea',exact:true})).toBeVisible();
 if(calls.some(call=>call.method!=='GET')||errors.length)throw new Error(JSON.stringify({calls,errors}));
 await fs.writeFile(path.join(destination,'result.json'),JSON.stringify({passed:true,calls,errors},null,2));
}finally{await browser.close();}
