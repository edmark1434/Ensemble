// Read-only configuration inventory. Never print credentials or signing keys.
require('dotenv').config({ quiet: true });
const { CloudFrontClient, ListDistributionsCommand, GetDistributionConfigCommand } = require('@aws-sdk/client-cloudfront');
const { GetBucketPolicyCommand, GetPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');

async function main() {
  const host = new URL(process.env.CLOUDFRONT_URL).hostname;
  const cf = new CloudFrontClient({ region: 'us-east-1', credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } });
  let marker;
  let found;
  do {
    const page = await cf.send(new ListDistributionsCommand({ Marker: marker }));
    found = page.DistributionList?.Items?.find(d => d.DomainName === host || d.Aliases?.Items?.includes(host));
    marker = page.DistributionList?.IsTruncated ? page.DistributionList.NextMarker : undefined;
  } while (!found && marker);
  if (!found) throw new Error('ConfiguredDistributionNotFound');
  const { DistributionConfig: config } = await cf.send(new GetDistributionConfigCommand({ Id: found.Id }));
  console.log(JSON.stringify({ distributionId: found.Id, domain: found.DomainName, status: found.Status,
    origins: config.Origins.Items.map(o => ({ id: o.Id, domain: o.DomainName, path: o.OriginPath,
      oac: o.OriginAccessControlId, oai: o.S3OriginConfig?.OriginAccessIdentity })),
    behaviors: [config.DefaultCacheBehavior, ...(config.CacheBehaviors?.Items || [])].map(b => ({
      path: b.PathPattern || '*', origin: b.TargetOriginId, keyGroups: b.TrustedKeyGroups,
      cachePolicy: b.CachePolicyId, responsePolicy: b.ResponseHeadersPolicyId,
      functions: b.FunctionAssociations, lambdas: b.LambdaFunctionAssociations,
    })),
  }, null, 2));
  try {
    const policy = await s3.send(new GetBucketPolicyCommand({ Bucket: process.env.AWS_BUCKET_NAME }));
    console.log('Bucket policy:', JSON.stringify(JSON.parse(policy.Policy).Statement));
    const block = await s3.send(new GetPublicAccessBlockCommand({ Bucket: process.env.AWS_BUCKET_NAME }));
    console.log('Public access block:', JSON.stringify(block.PublicAccessBlockConfiguration));
  } catch (error) { console.log('Bucket policy inspection:', error.name); }
  cf.destroy(); s3.destroy();
}
main().catch(error => { console.error('CloudFront inspection failed:', error.name, error.$metadata?.httpStatusCode || ''); process.exitCode = 1; });
