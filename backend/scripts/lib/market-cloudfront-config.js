// Pure configuration builder, shared by the setup command and offline tests.
function buildProtectedConfiguration({ config, policy, distribution, origin, bucket, state }) {
  const protectedOriginId = `market-originals-${distribution.Id}`;
  const updated = structuredClone(config);
  const protectedOrigin = { ...structuredClone(origin), Id: protectedOriginId,
    OriginAccessControlId: state.oacId, S3OriginConfig: { OriginAccessIdentity: '' } };
  // Keep the existing origin/OAI and every public behavior untouched.
  const origins = updated.Origins.Items.filter(item => item.Id !== protectedOriginId);
  origins.push(protectedOrigin);
  updated.Origins = { Quantity: origins.length, Items: origins };
  const existing = updated.CacheBehaviors?.Items || [];
  const old = existing.find(item => item.PathPattern === 'asset-originals/*');
  const behavior = { ...(old || updated.DefaultCacheBehavior), PathPattern: 'asset-originals/*', TargetOriginId: protectedOriginId,
    ViewerProtocolPolicy: 'https-only', TrustedKeyGroups: { Enabled: true, Quantity: 1, Items: [state.keyGroupId] },
    TrustedSigners: { Enabled: false, Quantity: 0 }, CachePolicyId: state.cachePolicyId, ResponseHeadersPolicyId: state.responsePolicyId,
    AllowedMethods: { Quantity: 3, Items: ['GET', 'HEAD', 'OPTIONS'], CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] } }, Compress: false };
  delete behavior.ForwardedValues; delete behavior.MinTTL; delete behavior.DefaultTTL; delete behavior.MaxTTL;
  // Do not inherit public URL rewrites or origin-request policies for originals.
  delete behavior.FunctionAssociations; delete behavior.LambdaFunctionAssociations; delete behavior.OriginRequestPolicyId;
  const behaviors = [behavior, ...existing.filter(item => item.PathPattern !== behavior.PathPattern)];
  updated.CacheBehaviors = { Quantity: behaviors.length, Items: behaviors };
  const resource = `arn:aws:s3:::${bucket}/asset-originals/*`;
  const statements = (Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement]).filter(Boolean)
    .filter(item => !['EnsembleMarketCloudFrontRead', 'EnsembleMarketDenyAnonymous'].includes(item.Sid));
  statements.push({ Sid: 'EnsembleMarketCloudFrontRead', Effect: 'Allow', Principal: { Service: 'cloudfront.amazonaws.com' },
    Action: 's3:GetObject', Resource: resource, Condition: { StringEquals: { 'AWS:SourceArn': distribution.ARN } } },
  { Sid: 'EnsembleMarketDenyAnonymous', Effect: 'Deny', Principal: '*', Action: 's3:GetObject', Resource: resource,
    Condition: { StringEquals: { 'aws:PrincipalAccount': 'anonymous' } } });
  return { config: updated, policy: { ...policy, Statement: statements } };
}
module.exports = { buildProtectedConfiguration };
