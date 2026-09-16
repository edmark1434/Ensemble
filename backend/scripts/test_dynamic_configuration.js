const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
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
    // Test 5: Dynamic Default User Merit Score Configuration
    // -------------------------------------------------------------
    {
      const platformSettings = await getSectionValue('platform');
      const defaultMerit = Number(platformSettings?.defaultUserMerit);
      const ok = Number.isFinite(defaultMerit) && defaultMerit > 0;
      record(
        'Dynamic platform.defaultUserMerit configuration lookup',
        ok,
        `Configured defaultUserMerit is ${defaultMerit}`
      );
    }

    // -------------------------------------------------------------
    // Test 6: Dynamic Ticket Notifications Configuration Lookup
    // -------------------------------------------------------------
    {
      const notifSettings = await getSectionValue('notifications');
      const ok =
        typeof notifSettings?.notifyAssigneeOnTicket === 'boolean' &&
        typeof notifSettings?.notifyRequesterOnResolution === 'boolean';
      record(
        'Dynamic notifications configuration (notifyAssigneeOnTicket & notifyRequesterOnResolution)',
        ok,
        `notifyAssigneeOnTicket=${notifSettings?.notifyAssigneeOnTicket}, notifyRequesterOnResolution=${notifSettings?.notifyRequesterOnResolution}`
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
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'platform.sessionTimeoutMinutes'`
      );
      const origLiteral = origSession.rows[0]?.current_value_literal ?? '60';

      try {
        await pool.query(
          `UPDATE configuration SET current_value_literal = '45' WHERE configuration_key = 'platform.sessionTimeoutMinutes'`
        );
        const testSessionId = await createSessionId({ username: 'test_session_user', role: 'client' });
        const ttl = await redisClient.ttl(`session:${testSessionId}`);
        await redisClient.del(`session:${testSessionId}`);

        const ok = ttl > 0 && ttl <= 45 * 60 && ttl >= 44 * 60;
        record(
          'Dynamic session timeout (platform.sessionTimeoutMinutes = 45m)',
          ok,
          `Redis session key TTL: ${ttl}s (expected ~2700s)`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'platform.sessionTimeoutMinutes'`,
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
    // Test 14: Dynamic Dispute Auto-Assignment (moderation.disputeAutoAssign)
    // -------------------------------------------------------------
    {
      const { reconcileUnassignedDisputes, applyDisputeAutomations } = require('../lib/ModerationPolicy');
      
      const origConfig = await pool.query(
        `SELECT current_value_literal FROM configuration WHERE configuration_key = 'moderation.disputeAutoAssign'`
      );
      const origLiteral = origConfig.rows[0]?.current_value_literal ?? 'true';

      try {
        // First reset DIS-50001 to unassigned
        await pool.query(
          `UPDATE disputes SET handled_by_staff_id = NULL, status = 'pending_review' WHERE dispute_number = 'DIS-50001'`
        );

        // Turn OFF disputeAutoAssign
        await pool.query(
          `UPDATE configuration SET current_value_literal = 'false' WHERE configuration_key = 'moderation.disputeAutoAssign'`
        );
        const disabledResult = await reconcileUnassignedDisputes();
        const checkDisabled = await pool.query(
          `SELECT handled_by_staff_id FROM disputes WHERE dispute_number = 'DIS-50001'`
        );
        const remainedNull = checkDisabled.rows[0]?.handled_by_staff_id === null;

        // Turn ON disputeAutoAssign
        await pool.query(
          `UPDATE configuration SET current_value_literal = 'true' WHERE configuration_key = 'moderation.disputeAutoAssign'`
        );
        const enabledResult = await reconcileUnassignedDisputes();
        const checkEnabled = await pool.query(
          `SELECT handled_by_staff_id, status FROM disputes WHERE dispute_number = 'DIS-50001'`
        );
        const assignedStaffId = checkEnabled.rows[0]?.handled_by_staff_id;
        const assignedStatus = checkEnabled.rows[0]?.status;
        const successfullyAssigned = Boolean(assignedStaffId) && assignedStatus === 'under_review';

        record(
          'Dynamic dispute auto-assignment (moderation.disputeAutoAssign)',
          remainedNull && successfullyAssigned,
          `Disabled: retained unassigned (assigned: ${disabledResult.assigned}), Enabled: auto-assigned to staff ${assignedStaffId} with status ${assignedStatus}`
        );
      } finally {
        await pool.query(
          `UPDATE configuration SET current_value_literal = $1 WHERE configuration_key = 'moderation.disputeAutoAssign'`,
          [origLiteral]
        );
      }
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
