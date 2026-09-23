const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool, connectPostgresDB } = require('../lib/Database');
const redisClient = require('../lib/Redis');
const bcrypt = require('bcrypt');
const {
  requestPasswordReset,
  verifyResetToken,
  resetPasswordWithToken,
  LoginUserOrEmail,
} = require('../services/UserServices');
const {
  getUserByEmailForPasswordReset,
  updateUserPassword,
} = require('../repositories/UserRepositories');

async function runTestSuite() {
  console.log('=== Starting Password Reset Verification Suite ===\n');
  await connectPostgresDB();

  // Find a test user from database with password_hash
  const userQuery = await pool.query(
    'SELECT user_id, email_address, password_hash, first_name, last_name FROM users WHERE password_hash IS NOT NULL LIMIT 1'
  );

  if (!userQuery.rows.length) {
    console.error('No users found in database to test.');
    process.exit(1);
  }

  const testUser = userQuery.rows[0];
  const originalPasswordHash = testUser.password_hash;
  console.log(`Using test user: ${testUser.email_address} (${testUser.user_id})\n`);

  let allPassed = true;
  function assert(condition, name, detail = '') {
    if (condition) {
      console.log(`[PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
    } else {
      console.error(`[FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
      allPassed = false;
    }
  }

  try {
    // 1. Repository lookup
    const repoUser = await getUserByEmailForPasswordReset(testUser.email_address);
    assert(repoUser && repoUser.user_id === testUser.user_id, 'Repository lookup finds user by email');

    // 2. Anti-enumeration: non-existent email returns identical success message and creates no token
    const nonExistentEmail = `nonexistent_${Date.now()}@ensemble.software`;
    const anonRes = await requestPasswordReset(nonExistentEmail);
    assert(
      anonRes.message === 'If an account with that email exists, a password reset link has been sent.',
      'Anti-enumeration response uniformity'
    );

    // 3. Request reset for actual user
    const resetRes = await requestPasswordReset(testUser.email_address);
    assert(
      resetRes.message === 'If an account with that email exists, a password reset link has been sent.',
      'Request password reset returns uniform message'
    );

    // Retrieve token from Redis tracking key
    const activeToken = await redisClient.get(`password-reset:user:${testUser.user_id}`);
    assert(Boolean(activeToken), 'Token stored in Redis tracking key', `token=${activeToken?.slice(0, 8)}...`);

    const rawTokenData = await redisClient.get(`password-reset:token:${activeToken}`);
    const tokenData = rawTokenData ? JSON.parse(rawTokenData) : null;
    assert(tokenData && tokenData.userId === testUser.user_id, 'Token payload contains correct userId');
    assert(tokenData && tokenData.email.toLowerCase() === testUser.email_address.toLowerCase(), 'Token payload contains correct email');

    const ttl = await redisClient.ttl(`password-reset:token:${activeToken}`);
    assert(ttl > 0 && ttl <= 900, 'Token TTL correctly set to 15 minutes', `ttl=${ttl}s`);

    // 4. Verify token service
    const verifyRes = await verifyResetToken(activeToken);
    assert(verifyRes.valid === true, 'verifyResetToken accepts valid token');
    assert(verifyRes.email.toLowerCase() === testUser.email_address.toLowerCase(), 'verifyResetToken returns matching email');

    // 5. Verify invalid token rejected
    let invalidTokenCaught = false;
    try {
      await verifyResetToken('invalid_token_12345678901234567890123456789012');
    } catch {
      invalidTokenCaught = true;
    }
    assert(invalidTokenCaught, 'verifyResetToken rejects invalid token');

    // 6. Test 4 password rules enforcement
    const weakPasswords = [
      { pw: 'Short1!', label: 'Less than 8 chars' },
      { pw: 'nouppercase1!@#', label: 'No uppercase letter' },
      { pw: 'NOLOWERCASE1!@#', label: 'No lowercase letter' },
      { pw: 'NoSpecialChar123', label: 'No special character' },
    ];

    for (const testCase of weakPasswords) {
      let rejected = false;
      try {
        await resetPasswordWithToken(activeToken, testCase.pw);
      } catch (err) {
        rejected = true;
      }
      assert(rejected, `Signup password rule enforced: ${testCase.label}`);
    }

    // 7. Successful reset with valid password
    const newPassword = 'NewSecretPassword!2026';
    const resetSuccess = await resetPasswordWithToken(activeToken, newPassword);
    assert(resetSuccess.success === true, 'resetPasswordWithToken succeeds with compliant password');

    // 8. Replay attack prevention: token must be deleted and cannot be reused
    let replayRejected = false;
    try {
      await resetPasswordWithToken(activeToken, newPassword);
    } catch {
      replayRejected = true;
    }
    assert(replayRejected, 'Replay protection: token cannot be reused after successful reset');

    // 9. Token deleted from Redis
    const tokenStillInRedis = await redisClient.get(`password-reset:token:${activeToken}`);
    assert(!tokenStillInRedis, 'Token is deleted from Redis immediately upon use');

    // 10. Verify login succeeds with the new password
    const loginResult = await LoginUserOrEmail(testUser.email_address, newPassword);
    assert(Boolean(loginResult && (loginResult.email_address || loginResult.email)), 'User can successfully login with the new password');

  } catch (err) {
    console.error('Unexpected test error:', err);
    allPassed = false;
  } finally {
    // Restore original password hash
    console.log('\nRestoring original password hash in database...');
    await updateUserPassword(testUser.user_id, originalPasswordHash);
    console.log('Original credentials restored.');

    console.log('\n=== Test Suite Result ===');
    if (allPassed) {
      console.log('ALL TESTS PASSED! Password reset flow is fully verified.');
      process.exit(0);
    } else {
      console.error('SOME TESTS FAILED!');
      process.exit(1);
    }
  }
}

runTestSuite();
