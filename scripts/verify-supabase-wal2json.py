import subprocess,time,json,uuid
image='paradigm-postgres:16.14-wal2json-2.7'
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE).strip()
name='sericia-wal2json-check-'+uuid.uuid4().hex[:8]
run('docker','run','-d','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD=isolated-test-only',image,'postgres','-c','wal_level=logical')
try:
 for _ in range(30):
  if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:break
  time.sleep(1)
 else:raise RuntimeError('Isolated PostgreSQL not ready')
 base=run('docker','exec','supabase-db-1','sha256sum','/usr/local/bin/postgres').split()[0]
 assert base==run('docker','exec',name,'sha256sum','/usr/local/bin/postgres').split()[0]
 sql="CREATE TABLE probe(id int); SELECT pg_create_logical_replication_slot('probe_slot','wal2json'); INSERT INTO probe VALUES(1);"
 for statement in sql.split(';'):
  if statement.strip():run('docker','exec',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-c',statement)
 sql="SELECT data FROM pg_logical_slot_get_changes('probe_slot',null,null,'format-version','2','add-tables','public.probe') WHERE data::jsonb->>'action'='I'"
 row=json.loads(run('docker','exec',name,'psql','-U','postgres','-Atc',sql))
 assert row['table']=='probe' and row['columns'][0]['value']==1
 print(json.dumps({'identicalPostgresBinary':True,'actualInsertDecoded':True,'pluginSha256':run('docker','exec',name,'sha256sum','/usr/local/lib/postgresql/wal2json.so').split()[0],'image':run('docker','image','inspect',image,'--format','{{.Id}}')}))
finally:run('docker','rm','-f',name)
