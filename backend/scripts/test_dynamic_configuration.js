const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// The suite edits configuration rows with raw SQL and expects the next read to see them.
process.env.SETTINGS_CACHE_TTL_MS = '0';
const { pool } = require('../lib/Database');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { getPublicConfigurationController } = require('../controllers/ConfigurationControllers');
const { registerUser } = require('../services/UserServices');
const { getActiveCreditPackagesService } = require('../services/PaymentServices');
const requireAdmin = require('../middleware/RequireAdmin');

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.data = body;
      return this;
    },
    send(body) {
      this.data = body;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('=== Starting Dynamic Configuration Test Suite ===\n');
  const results = [];

  // Helper to record result
  function record(name, passed, detail = '') {
    results.push({ name, passed, detail });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
  }

  try {
    // -------------------------------------------------------------
    // Test 1: GET /api/configuration/public
    // -------------------------------------------------------------
    {
      const req = {};
      const res = mockRes();
      await getPublicConfigurationController(req, res);
      const ok =
        res.statusCode === 200 &&
        res.data?.success === true &&
        typeof res.data?.configuration?.siteName === 'string' &&
        Array.isArray(res.data?.configuration?.creditPackages);

      record(
        'Public configuration endpoint (GET /api/configuration/public)',
        ok,
        `HTTP ${res.statusCode}, Site: ${res.data?.configuration?.siteName}, Packages count: ${res.data?.configuration?.creditPackages?.length}`
      );
    }

    // -------------------------------------------------------------
    // Test 2: Dynamic Economy - Credit Packages
    // -------------------------------------------------------------
    {
      const req = {};
      const res = mockRes();
      await getActiveCreditPackagesService(req, res);
      const packages = res.data?.creditPackages;
      const ok =
        res.statusCode === 200 &&
        res.data?.success === true &&
        Array.isArray(packages) &&
        packages.length > 0 &&
        packages.some((p) => p.credits === 500 && p.price === 499);

      record(
        'Dynamic credit packages loaded from configuration table',
        ok,
        `Retrieved ${packages?.length} active packages: ${packages?.map((p) => `${p.name} (${p.credits}c -> ₱${p.price})`).join(', ')}`
      );
    }

    // -------------------------------------------------------------
    // Test 3: Registration Disabled Configuration Enforcement
    // -------------------------------------------------------------
    {
      // Save original value
      const orig = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'platform.registrationEnabled'`
      );
      const originalLiteral = orig.rows[0]?.current_value_literal ?? 'true';

      try {
        // Toggle registrationEnabled = false
        await pool.query(
          `UPDATE configuration SET current_value_literal = 'false' WHERE configuration_key = 'platform.registrationEnabled'`
        );

        let errorCaught = null;
        try {
          await registerUser({
            email: 'test_blocked@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'client',
          });
        } catch (err) {
          errorCaught = err;
        }

        const ok = errorCaught && (errorCaught.statusCode === 403 || errorCaught.status === 403) && errorCaught.message.includes('disabled');
        record(
          'Registration disabled toggle enforcement (platform.registrationEnabled = false)',
          ok,
          errorCaught ? `Expected error: "${errorCaught.message}" (statusCode ${errorCaught.statusCode})` : 'No error caught'
        );
      } finally {
        // Restore original value
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'platform.registrationEnabled'`,
          [originalLiteral]
        );
      }
    }

    // -------------------------------------------------------------
    // Test 4: Dynamic Admin IP Allowlist Enforcement
    // -------------------------------------------------------------
    {
      // Save original values
      const origEnabled = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'security.ipAllowlistEnabled'`
      );
      const origIps = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'security.allowedAdminIps'`
      );

      try {
        // Configure IP allowlist to only allow 192.168.1.50
        await pool.query(
          `UPDATE configuration SET current_value_literal = 'true' WHERE configuration_key = 'security.ipAllowlistEnabled'`
        );
        await pool.query(
          `UPDATE configuration SET current_value_literal = '["192.168.1.50"]' WHERE configuration_key = 'security.allowedAdminIps'`
        );

        // Case A: Disallowed IP (127.0.0.1)
        {
          const req = {
            session: { type: 'Staff', role: 'Admin' },
            ip: '127.0.0.1',
            headers: {},
            socket: { remoteAddress: '127.0.0.1' },
          };
          const res = mockRes();
          let nextCalled = false;
          await requireAdmin(req, res, () => {
            nextCalled = true;
          });

          const ok = res.statusCode === 403 && !nextCalled;
          record(
            'Admin IP allowlist blocks unauthorized IP (127.0.0.1)',
            ok,
            `HTTP ${res.statusCode}: ${res.data?.message}`
          );
        }

        // Case B: Allowed IP (192.168.1.50)
        {
          const req = {
            session: { type: 'Staff', role: 'Admin' },
            ip: '192.168.1.50',
            headers: {},
            socket: { remoteAddress: '192.168.1.50' },
          };
          const res = mockRes();
          let nextCalled = false;
          await requireAdmin(req, res, () => {
            nextCalled = true;
          });

          const ok = nextCalled && res.statusCode === 200;
          record(
            'Admin IP allowlist permits authorized IP (192.168.1.50)',
            ok,
            'next() was called successfully'
          );
        }
      } finally {
        // Restore original values
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'security.ipAllowlistEnabled'`,
          [origEnabled.rows[0]?.current_value_literal ?? 'false']
        );
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'security.allowedAdminIps'`,
          [origIps.rows[0]?.current_value_literal ?? '[]']
        );
      }
    }

    // -------------------------------------------------------------
    // Test 6: Dynamic Ticket Notifications Configuration Lookup
    // -------------------------------------------------------------
    {
      const notifSettings = await getSectionValue('notifications');
      const ok = typeof notifSettings?.notifyAssigneeOnTicket === 'boolean';
      record(
        'Dynamic notifications configuration (notifyAssigneeOnTicket)',
        ok,
        `notifyAssigneeOnTicket=${notifSettings?.notifyAssigneeOnTicket}`
      );
    }

    // -------------------------------------------------------------
    // Test 7: Dynamic Marketplace Transaction Fee
    // -------------------------------------------------------------
    {
      const { getMarketplaceTransactionFeePercent } = require('../lib/PlatformFeeSettings');
      const initialFee = await getMarketplaceTransactionFeePercent();

      const origFee = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'economy.marketplaceSettings.transactionFeePercent'`
      );
      const origLiteral = origFee.rows[0]?.current_value_literal ?? '15';

      try {
        await pool.query(
          `UPDATE configuration SET current_value_literal = '20' WHERE configuration_key = 'economy.marketplaceSettings.transactionFeePercent'`
        );
        const updatedFee = await getMarketplaceTransactionFeePercent();
        const ok = updatedFee === 20;

        record(
          'Dynamic marketplace transaction fee (economy.marketplaceSettings.transactionFeePercent)',
          ok,
          `Initial fee: ${initialFee}%, Updated fee: ${updatedFee}%`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'economy.marketplaceSettings.transactionFeePercent'`,
          [origLiteral]
        );
      }
    }

    // -------------------------------------------------------------
    // Test 8: Dynamic Session Expiration
    // -------------------------------------------------------------
    {
      const redisClient = require('../lib/Redis');
      const { createSessionId } = require('../services/UserServices');
      const origSession = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'platform.sessionTimeoutDays'`
      );
      const origLiteral = origSession.rows[0]?.current_value_literal ?? '30';

      try {
        await pool.query(
          `UPDATE configuration SET current_value_literal = '2' WHERE configuration_key = 'platform.sessionTimeoutDays'`
        );
        const testSessionId = await createSessionId({ username: 'test_session_user', role: 'client' });
        const ttl = await redisClient.ttl(`session:${testSessionId}`);
        await redisClient.del(`session:${testSessionId}`);

        const expectedSeconds = 2 * 86400;
        const ok = ttl > 0 && ttl <= expectedSeconds && ttl >= (expectedSeconds - 60);
        record(
          'Dynamic session timeout (platform.sessionTimeoutDays = 2d)',
          ok,
          `Redis session key TTL: ${ttl}s (expected ~${expectedSeconds}s)`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'platform.sessionTimeoutDays'`,
          [origLiteral]
        );
      }
    }

    // -------------------------------------------------------------
    // Test 9: Dynamic Marketplace Listing Fee Lookup
    // -------------------------------------------------------------
    {
      const { getMarketplaceListingFeeCredits } = require('../lib/PlatformFeeSettings');
      const origFee = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'economy.marketplaceSettings.listingFeeCredits'`
      );
      const origLiteral = origFee.rows[0]?.current_value_literal ?? '0';

      try {
        await pool.query(
          `UPDATE configuration SET current_value_literal = '50' WHERE configuration_key = 'economy.marketplaceSettings.listingFeeCredits'`
        );
        const fee = await getMarketplaceListingFeeCredits();
        const ok = fee === 50;
        record(
          'Dynamic marketplace listing fee (economy.marketplaceSettings.listingFeeCredits)',
          ok,
          `Resolved fee: ${fee} credits`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'economy.marketplaceSettings.listingFeeCredits'`,
          [origLiteral]
        );
      }
    }

    // -------------------------------------------------------------
    // Test 10: Dynamic Refund Window Days Lookup
    // -------------------------------------------------------------
    {
      const { getMarketplaceRefundWindowDays } = require('../lib/PlatformFeeSettings');
      const origWindow = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'economy.marketplaceSettings.refundWindowDays'`
      );
      const origLiteral = origWindow.rows[0]?.current_value_literal ?? '14';

      try {
        await pool.query(
          `UPDATE configuration SET current_value_literal = '30' WHERE configuration_key = 'economy.marketplaceSettings.refundWindowDays'`
        );
        const windowDays = await getMarketplaceRefundWindowDays();
        const ok = windowDays === 30;
        record(
          'Dynamic marketplace refund window (economy.marketplaceSettings.refundWindowDays)',
          ok,
          `Resolved refund window: ${windowDays} days`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'economy.marketplaceSettings.refundWindowDays'`,
          [origLiteral]
        );
      }
    }

    // -------------------------------------------------------------
    // Test 11: Dynamic Audit Log Retention Cleanup
    // -------------------------------------------------------------
    {
      const { purgeExpiredAuditLogsServices } = require('../lib/BackgroundJob');
      const cleanupResult = await purgeExpiredAuditLogsServices();
      const ok = typeof cleanupResult?.retentionDays === 'number' && typeof cleanupResult?.purged === 'number';
      record(
        'Dynamic audit log retention cleanup (security.auditLogRetentionDays)',
        ok,
        `Purged: ${cleanupResult.purged} records using retention window: ${cleanupResult.retentionDays} days`
      );
    }

    // -------------------------------------------------------------
    // Test 12: Dynamic Staff 2FA Requirement Lookup
    // -------------------------------------------------------------
    {
      const { getSecuritySettings } = require('../lib/ModerationPolicy');
      const orig2fa = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'security.requireStaff2fa'`
      );
      const origLiteral = orig2fa.rows[0]?.current_value_literal ?? 'false';

      try {
        await pool.query(
          `UPDATE configuration SET current_value_literal = 'true' WHERE configuration_key = 'security.requireStaff2fa'`
        );
        const sec = await getSecuritySettings();
        const ok = sec.requireStaff2fa === true;
        record(
          'Dynamic staff 2FA requirement (security.requireStaff2fa)',
          ok,
          `requireStaff2fa resolved to: ${sec.requireStaff2fa}`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'security.requireStaff2fa'`,
          [origLiteral]
        );
      }
    }

    // -------------------------------------------------------------
    // Test 13: Dynamic Platform Alerts (Slack & Staff Email Alerts)
    // -------------------------------------------------------------
    {
      const { dispatchPlatformNotification, getNotificationConfig } = require('../services/PlatformAlertServices');
      const config = await getNotificationConfig();
      const dispatchResult = await dispatchPlatformNotification('NEW_SIGNUP', {
        email: 'test_alert@ensemble.app',
        firstName: 'TestAlert',
      });
      const ok = dispatchResult.dispatched === true && typeof config.notifications === 'object';
      record(
        'Dynamic platform alert dispatcher (emailNewSignups & Slack webhook)',
        ok,
        `Dispatched NEW_SIGNUP alert successfully (slackEnabled: ${config.notifications.slackWebhookEnabled})`
      );
    }

    // -------------------------------------------------------------
    // Test 14: Dispute auto-assign removed from Automod settings
    // -------------------------------------------------------------
    {
      const { reconcileUnassignedDisputes } = require('../lib/ModerationPolicy');
      const result = await reconcileUnassignedDisputes();
      record(
        'Dispute auto-assign removed (reconcile is a no-op)',
        result?.assigned === 0,
        `assigned=${result?.assigned}`
      );
    }

    console.log('\n=== Test Suite Summary ===');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

    if (failed > 0) {
      console.error('\nSome tests failed.');
    } else {
      console.log('\nAll dynamic configuration tests passed successfully!');
    }
  } catch (error) {
    console.error('Fatal error during test run:', error);
  } finally {
    try {
      const redisClient = require('../lib/Redis');
      await redisClient.quit();
    } catch {}
    await pool.end();
    process.exit(0);
  }
}

runTests();
