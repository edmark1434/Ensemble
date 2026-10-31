// Run from backend: node scripts/SetupMarketCloudFront.js [--apply|--verify]
// Default is a read-only plan. AWS_PROFILE or exported temporary AWS credentials
// may provide the administrator identity; never put administrator keys in Git.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPairSync } = require('node:crypto');
const { createRequire } = require('node:module');
const CF = require('@aws-sdk/client-cloudfront');
const S3 = require('@aws-sdk/client-s3');
const { buildProtectedConfiguration } = require('./lib/market-cloudfront-config');
const editor = path.resolve(__dirname, '../../video-editor');
const privateDir = path.join(editor, '.cloudfront');
const statePath = path.join(privateDir, 'setup-state.json');
const credentials = process.env.AWS_PROFILE ? undefined : {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
};
const cf = new CF.CloudFrontClient({ region: 'us-east-1', credentials });
const s3 = new S3.S3Client({ region: process.env.AWS_REGION, credentials });
const bucket = process.env.AWS_BUCKET_NAME;
const save = state => fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

async function inspect() {
  const host = new URL(process.env.CLOUDFRONT_URL).hostname;
  let marker, distribution;
  do {
    const page = await cf.send(new CF.ListDistributionsCommand({ Marker: marker }));
    distribution = page.DistributionList?.Items?.find(d => d.DomainName === host || d.Aliases?.Items?.includes(host));
    marker = page.DistributionList?.IsTruncated ? page.DistributionList.NextMarker : undefined;
  } while (!distribution && marker);
  if (!distribution) throw new Error('Configured CloudFront distribution was not found.');
  const current = await cf.send(new CF.GetDistributionConfigCommand({ Id: distribution.Id }));
  const config = current.DistributionConfig;
  const origins = config.Origins.Items.filter(o => o.DomainName.startsWith(`${bucket}.s3`)
    && o.Id !== `market-originals-${distribution.Id}`);
  if (origins.length !== 1 || origins[0].OriginPath) throw new Error('Expected one S3 origin for the configured bucket without an origin path.');
  let policy;
  try { policy = JSON.parse((await s3.send(new S3.GetBucketPolicyCommand({ Bucket: bucket }))).Policy); }
  catch (error) { if (error.name !== 'NoSuchBucketPolicy') throw error; policy = { Version: '2012-10-17', Statement: [] }; }
  return { distribution, config, etag: current.ETag, origin: origins[0], policy };
}

function activate(state) {
  const filename = path.join(editor, '.env.local');
  let contents = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
  const settings = {
    MARKET_CLOUDFRONT_ENABLED: 'true', MARKET_CLOUDFRONT_URL: state.base,
    MARKET_CLOUDFRONT_KEY_PAIR_ID: state.publicKeyId,
    MARKET_CLOUDFRONT_PRIVATE_KEY_PATH: path.join(privateDir, 'private.pem').replace(/\\/g, '/'),
  };
  for (const [key, value] of Object.entries(settings)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    contents = pattern.test(contents) ? contents.replace(pattern, () => line) : contents.trimEnd() + '\n' + line + '\n';
  }
  fs.writeFileSync(filename, contents, { mode: 0o600 });
}

async function verifyDelivery(state) {
  if ((await cf.send(new CF.GetDistributionCommand({ Id: state.distributionId }))).Distribution?.Status !== 'Deployed') {
    throw new Error('CloudFront is still deploying. Run --verify again after deployment completes.');
  }
  const objects = await s3.send(new S3.ListObjectsV2Command({ Bucket: bucket, Prefix: 'asset-originals/', MaxKeys: 100 }));
  const key = objects.Contents?.find(o => o.Size > 1024 && !o.Key.endsWith('/'))?.Key;
  if (!key) throw new Error('No protected original is available to verify delivery.');
  const { getSignedUrl } = createRequire(path.join(editor, 'package.json'))('@aws-sdk/cloudfront-signer');
  const url = new URL(key.split('/').map(encodeURIComponent).join('/'), state.base).href;
  const sign = expires => getSignedUrl({ url, keyPairId: state.publicKeyId,
    privateKey: fs.readFileSync(path.join(privateDir, 'private.pem'), 'utf8'), dateLessThan: new Date(expires).toISOString() });
  const request = async (label, target, expected) => {
    const start = performance.now();
    const response = await fetch(target, { headers: { Range: 'bytes=0-1023', Origin: 'http://localhost:3000' }, signal: AbortSignal.timeout(30_000) });
    const bytes = await response.arrayBuffer();
    console.log(label, JSON.stringify({ status: response.status, bytes: bytes.byteLength,
      ms: Math.round(performance.now() - start), cache: response.headers.get('x-cache') }));
    if (response.status !== expected) throw new Error(`${label} failed its expected status check.`);
    if (expected === 206 && (response.headers.get('access-control-allow-origin') !== '*' || !response.headers.get('content-range'))) {
      throw new Error('Signed range response is missing CORS/range headers.');
    }
  };
  const signed = sign(Date.now() + 300_000);
  await request('Unsigned CloudFront', url, 403);
  const tampered = new URL(signed);
  const signature = tampered.searchParams.get('Signature');
  tampered.searchParams.set('Signature', (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1));
  await request('Tampered signature', tampered.href, 403);
  await request('Expired grant', sign(Date.now() - 60_000), 403);
  await request('Signed range', signed, 206);
  await request('Repeated signed range', signed, 206);
  await request('Anonymous S3', `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`, 403);
  activate(state);
  console.log('Verification passed. Local editor CloudFront delivery enabled; restart the editor if it does not reload .env.local automatically.');
}

async function main() {
  if (process.argv.includes('--verify')) {
    if (!fs.existsSync(statePath)) throw new Error('Run --apply before --verify.');
    await verifyDelivery(JSON.parse(fs.readFileSync(statePath, 'utf8'))); return;
  }
  const { distribution, config, etag, origin, policy } = await inspect();
  console.log(JSON.stringify({ distributionId: distribution.Id, protectedPath: 'asset-originals/*', bucket,
    actions: ['Create/reuse a signing key group', 'Require signatures only for protected originals',
      'Create a separate OAC origin for originals; preserve the public origin', 'Allow this distribution to read originals; deny anonymous originals',
      'Cache protected bytes at the edge; grant private browser caching and range CORS'],
    activation: 'Only --verify enables the local application after signed/unsigned/range checks pass.' }, null, 2));
  if (!process.argv.includes('--apply')) return;
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {
    distributionId: distribution.Id, base: `https://${distribution.DomainName}`,
    originalConfig: config, originalBucketPolicy: policy, createdAt: new Date().toISOString(),
  };
  if (state.distributionId !== distribution.Id) throw new Error('Saved setup belongs to another distribution.');
  save(state);
  const keyPath = path.join(privateDir, 'private.pem');
  if (!fs.existsSync(keyPath)) {
    if (state.publicKeyId) throw new Error('The private signing key is missing; restore it before continuing.');
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
    fs.writeFileSync(keyPath, pair.privateKey, { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(path.join(privateDir, 'public.pem'), pair.publicKey, { flag: 'wx' });
  }
  const name = `ensemble-market-${distribution.Id.toLowerCase()}`;
  if (!state.publicKeyId) {
    const result = await cf.send(new CF.CreatePublicKeyCommand({ PublicKeyConfig: {
      CallerReference: `${name}-${state.createdAt}`, Name: name, EncodedKey: fs.readFileSync(path.join(privateDir, 'public.pem'), 'utf8'),
    } })); state.publicKeyId = result.PublicKey.Id; save(state);
  }
  if (!state.keyGroupId) {
    const result = await cf.send(new CF.CreateKeyGroupCommand({ KeyGroupConfig: { Name: name, Items: [state.publicKeyId] } }));
    state.keyGroupId = result.KeyGroup.Id; save(state);
  }
  if (!state.oacId) {
    state.oacId = (await cf.send(new CF.CreateOriginAccessControlCommand({ OriginAccessControlConfig: {
      Name: name, OriginAccessControlOriginType: 's3', SigningBehavior: 'always', SigningProtocol: 'sigv4',
    } }))).OriginAccessControl.Id; save(state);
  }
  if (!state.cachePolicyId) {
    const result = await cf.send(new CF.CreateCachePolicyCommand({ CachePolicyConfig: {
      Name: name, MinTTL: 3600, DefaultTTL: 86400, MaxTTL: 86400,
      ParametersInCacheKeyAndForwardedToOrigin: { EnableAcceptEncodingGzip: false, EnableAcceptEncodingBrotli: false,
        HeadersConfig: { HeaderBehavior: 'none' }, CookiesConfig: { CookieBehavior: 'none' }, QueryStringsConfig: { QueryStringBehavior: 'none' } },
    } })); state.cachePolicyId = result.CachePolicy.Id; save(state);
  }
  if (!state.responsePolicyId) {
    const result = await cf.send(new CF.CreateResponseHeadersPolicyCommand({ ResponseHeadersPolicyConfig: {
      Name: name, CorsConfig: { AccessControlAllowCredentials: false,
        AccessControlAllowOrigins: { Quantity: 1, Items: ['*'] }, AccessControlAllowHeaders: { Quantity: 1, Items: ['*'] },
        AccessControlAllowMethods: { Quantity: 3, Items: ['GET', 'HEAD', 'OPTIONS'] },
        AccessControlExposeHeaders: { Quantity: 4, Items: ['Accept-Ranges', 'Content-Range', 'Content-Length', 'ETag'] },
        AccessControlMaxAgeSec: 600, OriginOverride: true },
      CustomHeadersConfig: { Quantity: 1, Items: [{ Header: 'Cache-Control', Value: 'private, max-age=300', Override: true }] },
    } })); state.responsePolicyId = result.ResponseHeadersPolicy.Id; save(state);
  }
  const protectedConfig = buildProtectedConfiguration({ config, policy, distribution, origin, bucket, state });
  await s3.send(new S3.PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(protectedConfig.policy) }));
  await cf.send(new CF.UpdateDistributionCommand({ Id: distribution.Id, IfMatch: etag, DistributionConfig: protectedConfig.config }));
  state.appliedAt = new Date().toISOString(); save(state);
  console.log('Protected distribution update submitted. When deployed, run this script with --verify. Application cutover is still disabled.');
}
main().catch(error => {
  // AWS errors may embed request data. Do not log signed URLs/credentials.
  console.error('Market CloudFront setup failed:', error.$metadata ? `${error.name} (${error.$metadata.httpStatusCode})` : error.message);
  process.exitCode = 1;
}).finally(() => { cf.destroy(); s3.destroy(); });
