const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildProtectedConfiguration } = require('./lib/market-cloudfront-config');

test('protected delivery preserves shared origins/public behavior and is repeatable', () => {
  const origin = { Id: 'public', DomainName: 'bucket.s3.us-east-1.amazonaws.com',
    S3OriginConfig: { OriginAccessIdentity: 'origin-access-identity/cloudfront/existing' } };
  const config = { Origins: { Quantity: 1, Items: [origin] },
    DefaultCacheBehavior: { TargetOriginId: 'public', ForwardedValues: {}, MinTTL: 0,
      FunctionAssociations: { Quantity: 1, Items: [{ FunctionARN: 'public-rewrite' }] } },
    CacheBehaviors: { Quantity: 1, Items: [{ PathPattern: 'assets/*', TargetOriginId: 'public' }] } };
  const policy = { Version: '2012-10-17', Statement: [{ Sid: 'ExistingPublicAccess', Effect: 'Allow' }] };
  const input = { config, policy, origin, bucket: 'bucket', distribution: { Id: 'DIST', ARN: 'arn:aws:cloudfront::123:distribution/DIST' },
    state: { oacId: 'oac', keyGroupId: 'keys', cachePolicyId: 'cache', responsePolicyId: 'cors' } };
  const result = buildProtectedConfiguration(input);
  assert.equal(config.Origins.Items.length, 1);
  assert.deepEqual(result.config.Origins.Items[0], origin);
  assert.deepEqual(result.config.DefaultCacheBehavior, config.DefaultCacheBehavior);
  assert.deepEqual(result.config.CacheBehaviors.Items[1], config.CacheBehaviors.Items[0]);
  const protectedBehavior = result.config.CacheBehaviors.Items[0];
  assert.equal(protectedBehavior.TargetOriginId, 'market-originals-DIST');
  assert.equal(protectedBehavior.PathPattern, 'asset-originals/*');
  assert.equal(protectedBehavior.TrustedKeyGroups.Enabled, true);
  assert.equal(protectedBehavior.FunctionAssociations, undefined);
  assert.equal(protectedBehavior.ForwardedValues, undefined);
  assert.equal(result.config.Origins.Items[1].OriginAccessControlId, 'oac');
  assert.deepEqual(result.policy.Statement[0], policy.Statement[0]);
  assert.ok(result.policy.Statement.slice(1).every(statement => statement.Resource === 'arn:aws:s3:::bucket/asset-originals/*'));
  const repeated = buildProtectedConfiguration({ ...input, ...result });
  assert.deepEqual(repeated, result);
});
