import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {chromium,expect} from '@playwright/test';
const destination=process.argv[2];if(!destination||!path.isAbsolute(destination))throw new Error('Absolute evidence directory required');await fs.mkdir(destination,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Toaster} from 'sonner';import {ShopifyDailyPanel} from './src/components/shopify-ops/ShopifyDailyPanel';createRoot(document.getElementById('app')).render(<><Toaster/><ShopifyDailyPanel/></>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const styles=await postcss([tailwind()]).process('@import "tailwindcss"; @source "../src/components/shopify-ops/ShopifyDailyPanel.tsx";',{from:path.join(process.cwd(),'scripts/daily-fixture.css')});
const browser=await chromium.launch({headless:true,channel:'chrome'});
let mode='normal';const calls=[];const errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://sericia-fixture.test/**',async route=>{
  const req=route.request();if(new URL(req.url()).pathname==='/api/shopify-ops/daily'){
   if(req.method()==='POST'){calls.push(req.postDataJSON());return route.fulfill({json:{ok:true,result:{state:'blocked',error_message:'Fixture provider connection pending'}}});}
   if(mode==='error')return route.fulfill({status:503,json:{ok:false,error:'fixture failure'}});
   const now=new Date().toISOString();return route.fulfill({json:{ok:true,jobs:mode==='empty'?[]:['products','inventory','orders','suppliers','social'].map(kind=>({kind,state:kind==='social'?'blocked':'succeeded',cursor:null,due_at:now,started_at:now,completed_at:now,last_success_at:now,attempts:1,summary:{},error_message:kind==='social'?'SNS認証設定待ち':null})),history:mode==='empty'?[]:[{id:'run',kind:'inventory',state:'succeeded',started_at:now,error_message:null}]}});
  }
  return route.fulfill({contentType:'text/html',body:`<!DOCTYPE html><html lang="ja"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles.css}</style><body><main id="app" style="padding:16px"></main><script>${bundle.outputFiles[0].text}</script></body></html>`});
 });
 await page.goto('http://sericia-fixture.test/');await expect(page.getByRole('heading',{name:'日々の自動運用',exact:true})).toBeVisible();await expect(page.getByText('要対応 1件')).toBeVisible();
 await page.getByRole('button',{name:'Shopify在庫の再照合を実行'}).click();await expect(page.getByRole('alert').filter({hasText:'Fixture provider connection pending'})).toBeVisible();
 if(calls[0]?.kind!=='inventory')throw new Error('Wrong job action');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');
 await page.screenshot({path:path.join(destination,'mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(destination,'desktop.png'),fullPage:true});
 mode='empty';await page.reload();await expect(page.getByText('実行設定がありません。DBの設定を確認してください。')).toBeVisible();
 mode='error';await page.reload();await expect(page.getByRole('alert')).toContainText('日々の実行状況を取得できません');
 if(errors.length)throw new Error(errors.join('\n'));
 await fs.writeFile(path.join(destination,'result.json'),JSON.stringify({passed:true,mobileOverflow:false,errors,calls},null,2));
}finally{await browser.close();}
