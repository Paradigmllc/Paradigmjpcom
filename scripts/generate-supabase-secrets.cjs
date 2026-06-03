const fs = require('fs');
const crypto = require('crypto');

// Generate secrets
const password = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(40).toString('hex');
const publicUrl = 'https://supabase.appexx.me';

// Base64 encode header and payload for JWT
function toBase64Url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const header = { alg: 'HS256', typ: 'JWT' };
const servicePayload = { role: 'service_role', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 315360000 };
const anonPayload = { role: 'anon', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 315360000 };

const header64 = toBase64Url(header);
const servicePayload64 = toBase64Url(servicePayload);
const anonPayload64 = toBase64Url(anonPayload);

const hmacService = crypto.createHmac('sha256', jwtSecret);
hmacService.update(header64 + '.' + servicePayload64);
const serviceSig = hmacService.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const serviceKey = header64 + '.' + servicePayload64 + '.' + serviceSig;

const hmacAnon = crypto.createHmac('sha256', jwtSecret);
hmacAnon.update(header64 + '.' + anonPayload64);
const anonSig = hmacAnon.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const anonKey = header64 + '.' + anonPayload64 + '.' + anonSig;

const envContent = `SUPABASE_POSTGRES_USER=postgres
SUPABASE_POSTGRES_PASSWORD=${password}
SUPABASE_POSTGRES_DB=postgres
SUPABASE_JWT_SECRET=${jwtSecret}
SUPABASE_PUBLIC_URL=${publicUrl}
SUPABASE_STUDIO_ORG=Paradigm
SUPABASE_STUDIO_PROJECT=paradigm-os
`;

fs.writeFileSync('.env.supabase', envContent);

const keysContent = `SERVICE_ROLE_KEY=${serviceKey}\nANON_KEY=${anonKey}\nPOSTGRES_PASSWORD=${password}`;
fs.writeFileSync('.supabase.keys', keysContent);
console.log('Generated keys successfully.');
