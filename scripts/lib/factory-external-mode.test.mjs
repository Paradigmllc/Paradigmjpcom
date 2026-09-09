import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('../../docker-entrypoint.sh',import.meta.url),'utf8');
test('external Factory mode validates a private target before workspace mutation',()=>{
  assert.ok(source.indexOf('External Factory requires') < source.indexOf('mkdir -p'));
  assert.ok(source.includes('http://media-os-factory:8080'));
  assert.ok(source.indexOf('if [ "$VIDEO_FACTORY_RUNTIME_MODE" = embedded ]; then') < source.indexOf('mkdir -p'));
  assert.ok(source.includes('chown -R nextjs:nodejs "${VIDEO_FACTORY_WORKSPACE}"\nfi'));
});
test('external Factory cannot start or respawn embedded generation',()=>{
  assert.ok(source.includes('if [ "$VIDEO_FACTORY_RUNTIME_MODE" = embedded ]; then\n  start_video_factory'));
  assert.ok(source.includes('if [ "$VIDEO_FACTORY_RUNTIME_MODE" = embedded ] && ! kill -0'));
  assert.equal(spawnSync('sh',['-n'],{input:source}).status,0);
});
test('unknown mode fails before any application startup',()=>{
  const prefix=source.slice(0,source.indexOf('PERSISTENT_CONFIG_ROOT='));
  const result=spawnSync('sh',[],{input:prefix,env:{...process.env,VIDEO_FACTORY_RUNTIME_MODE:'unknown'},encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Invalid Factory runtime mode/);
});
test('external mode without exact private URL is refused',()=>{
  const prefix=source.slice(0,source.indexOf('PERSISTENT_CONFIG_ROOT='));
  const result=spawnSync('sh',[],{input:prefix,env:{...process.env,VIDEO_FACTORY_RUNTIME_MODE:'external',VIDEO_FACTORY_INTERNAL_URL:'http://127.0.0.1:8080'},encoding:'utf8'});
  assert.notEqual(result.status,0);
});
