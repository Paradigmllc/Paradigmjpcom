// Reproducible narrow backports for dependencies without compatible upstream fixes.
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const vendor=resolve('vendor');mkdirSync(vendor,{recursive:true});
function run(args,cwd){return execFileSync('npm',args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:2**20});}
function patch(file,from,to){const text=readFileSync(file,'utf8');if(!text.includes(from))throw new Error(`Patch anchor missing: ${file}`);writeFileSync(file,text.replace(from,to));}
function prepare(name,version,integrity,edit){
 const cwd=mkdtempSync(join(tmpdir(),'sericia-security-'));
 const [download]=JSON.parse(run(['pack',`${name}@${version}`,'--ignore-scripts','--json'],cwd));
 if(`sha512-${createHash('sha512').update(readFileSync(join(cwd,download.filename))).digest('base64')}`!==integrity)throw new Error('Upstream integrity mismatch');
 execFileSync('tar',['-xzf',download.filename],{cwd});const dir=join(cwd,'package');edit(dir);
 const p=join(dir,'package.json'),pkg=JSON.parse(readFileSync(p,'utf8'));
 pkg.name=`@paradigmllc/${name}-security`;pkg.paradigmUpstream={package:`${name}@${version}`,integrity};pkg.paradigmSecurityRevision=1;
 writeFileSync(p,JSON.stringify(pkg,null,2)+'\n');
 const [out]=JSON.parse(run(['pack','--ignore-scripts','--json','--pack-destination',vendor],dir));
 process.stdout.write(JSON.stringify({name,archive:out.filename,integrity:out.integrity})+'\n');
}
prepare('deepmerge','4.3.1','sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==',dir=>{
 for(const file of ['index.js','dist/cjs.js','dist/umd.js']){
  patch(join(dir,file),'function propertyIsUnsafe(target, key) {','function propertyIsUnsafe(target, key) {\n\tif (key === "__proto__" || key === "constructor" || key === "prototype") return true');
  patch(join(dir,file),'getKeys(target).forEach(function(key) {','getKeys(target).forEach(function(key) {\n\t\t\tif (propertyIsUnsafe(target, key)) return');
 }
});
prepare('zod','3.25.76','sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==',dir=>{
 for(const file of ['v3/types.js','v3/types.cjs']){
  const p=join(dir,file),s=readFileSync(p,'utf8'),start=s.indexOf('        if (ctx.common.async)',s.indexOf('class ZodArray')),end=s.indexOf('\n    }\n    get element()',start);
  if(start<0||end<0)throw new Error('Array patch anchor missing');
  const prefix=file.endsWith('.cjs')?'parseUtil_js_1.':'';
  const replacement=`        // Bound issue accumulation and avoid eagerly scheduling untrusted arrays.
        if ((def.maxLength && ctx.data.length > def.maxLength.value) || (def.exactLength && ctx.data.length !== def.exactLength.value)) return ${prefix}INVALID;
        if (ctx.common.async) {
            return (async () => {
                const result = [];
                for (let i = 0; i < ctx.data.length; i++) {
                    if (ctx.common.issues.length >= 100) return ${prefix}INVALID;
                    result.push(await def.type._parseAsync(new ParseInputLazyPath(ctx, ctx.data[i], ctx.path, i)));
                }
                return ${prefix}ParseStatus.mergeArray(status, result);
            })();
        }
        const result = [];
        for (let i = 0; i < ctx.data.length; i++) {
            if (ctx.common.issues.length >= 100) return ${prefix}INVALID;
            result.push(def.type._parseSync(new ParseInputLazyPath(ctx, ctx.data[i], ctx.path, i)));
        }
        return ${prefix}ParseStatus.mergeArray(status, result);`;
  writeFileSync(p,s.slice(0,start)+replacement+s.slice(end));
 }
 // This SDK compatibility fork exposes only patched v3; v4 users use upstream4.6.7.
 const p=join(dir,'package.json'),pkg=JSON.parse(readFileSync(p,'utf8'));
 pkg.files=['index.js','index.cjs','index.d.ts','index.d.cts','v3','LICENSE','README.md'];
 pkg.exports=Object.fromEntries(Object.entries(pkg.exports).filter(([key])=>['.','./v3','./package.json'].includes(key)).map(([key,value])=>[key,typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>k!=='@zod/source')):value]));
 delete pkg.tshy;writeFileSync(p,JSON.stringify(pkg,null,2)+'\n');
});
