const ContractRepositories = require('../repositories/ContractRepositories');
const { createNotificationServices } = require('./NotificationServices');
const { getIo } = require('../lib/WebSocket');

class ContractSubcontractError extends Error {
  constructor(message, statusCode = 400, code = 'CONTRACT_SUBCONTRACT_ERROR') {
    super(message);
    this.name = 'ContractSubcontractError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function getContractTeamServices(contractId, affiliatedIds) {
  if (!contractId) throw new ContractSubcontractError('Contract ID is required', 400, 'MISSING_CONTRACT_ID');

  const ids = Array.isArray(affiliatedIds) ? affiliatedIds.map(String) : [String(affiliatedIds)];

  const teamData = await ContractRepositories.getContractSubcontractTeam(contractId);
  if (!teamData) throw new ContractSubcontractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');

  const contract = teamData.contract;
  const isClient = ids.includes(String(contract.client_account_id));
  const isFreelancer = ids.includes(String(contract.freelancer_account_id));
  const isMember = teamData.members.some((m) => ids.includes(String(m.account_id)));

  if (!isClient && !isFreelancer && !isMember) {
    throw new ContractSubcontractError('You are not authorized to view this contract team', 403, 'FORBIDDEN');
  }

  return {
    ...teamData,
    permissions: {
      can_manage_team: isFreelancer,
      can_distribute_funds: isFreelancer,
      is_client: isClient,
      is_freelancer: isFreelancer,
    },
  };
}

async function addContractSubcontractorServices(contractId, actorAccountId, { accountId, roleTitle, agreedCredits, notes }) {
  if (!contractId) throw new ContractSubcontractError('Contract ID is required', 400, 'MISSING_CONTRACT_ID');
  if (!accountId) throw new ContractSubcontractError('Account ID of the editor is required', 422, 'MISSING_MEMBER_ACCOUNT_ID');

  const contract = await ContractRepositories.getContractWithParties(contractId);
  if (!contract) throw new ContractSubcontractError('Contract not found', 404, 'CONTRACT_NOT_FOUND');

  if (String(contract.freelancer_account_id) !== String(actorAccountId)) {
    throw new ContractSubcontractError('Only the assigned contractor / freelancer can add team members to this contract', 403, 'UNAUTHORIZED');
  }

  if (String(accountId) === String(contract.freelancer_account_id)) {
    throw new ContractSubcontractError('You cannot add yourself as a subcontractor', 422, 'CANNOT_ADD_SELF');
  }

  if (String(accountId) === String(contract.client_account_id)) {
    throw new ContractSubcontractError('The contract client cannot be added as a subcontractor', 422, 'CANNOT_ADD_CLIENT');
  }

  const member = await ContractRepositories.addContractSubcontractor({
    contractId,
    accountId,
    roleTitle: roleTitle || 'Video Editor',
    agreedCredits: agreedCredits ? parseInt(agreedCredits, 10) : null,
    notes: notes || null,
  });

  const io = getIo();
  try {
    const notif = await createNotificationServices({
      message: `You were added as a team member (${member.role_title}) on contract "${contract.contract_title}".`,
      is_read: false,
      reference_table: 'contracts',
      reference_prefix: 'CONTRACT_TEAM_ADDED',
      reference_path: `/contracts/${contractId}`,
      reference_id: contractId,
      account_id: accountId,
    });
    if (io) {
      io.to(String(accountId)).emit('notification', notif);
      io.to(String(contractId)).emit('contractTeamUpdated', { contractId, action: 'member_added' });
    }
  } catch (err) {
    console.error('Failed to notify added subcontractor:', err.message);
  }

  return member;
}

async function removeContractSubcontractorServices(contractId, actorAccountId, memberAccountId) {
  if (!contractId || !memberAccountId) throw new ContractSubcontractError('Contract ID and member account ID are required', 400);

  const contract = await ContractRepositories.getContractWithParties(contractId);
  if (!contract) throw new ContractSubcontractError('Contract not found', 404);

  if (String(contract.freelancer_account_id) !== String(actorAccountId)) {
    throw new ContractSubcontractError('Only the assigned contractor can remove team members from this contract', 403);
  }

  const removed = await ContractRepositories.removeContractSubcontractor(contractId, memberAccountId);

  const io = getIo();
  if (io) {
    io.to(String(contractId)).emit('contractTeamUpdated', { contractId, action: 'member_removed' });
  }

  return removed;
}

async function distributeContractFundsServices(contractId, actorAccountId, { recipients, notes }) {
  if (!contractId) throw new ContractSubcontractError('Contract ID is required', 400);

  const contract = await ContractRepositories.getContractWithParties(contractId);
  if (!contract) throw new ContractSubcontractError('Contract not found', 404);

  if (String(contract.freelancer_account_id) !== String(actorAccountId)) {
    throw new ContractSubcontractError('Only the assigned contractor can distribute contract funds to team members', 403);
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new ContractSubcontractError('Select at least one team member to distribute funds to', 422);
  }

  const seen = new Set();
  const normalizedRecipients = recipients.map((r) => {
    const accId = String(r?.account_id || '').trim();
    const amount = Number(r?.amount_credits);
    if (!accId) throw new ContractSubcontractError('Recipient account ID is required', 422);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ContractSubcontractError('Each allocation must be a positive whole credit amount', 422);
    }
    if (seen.has(accId)) {
      throw new ContractSubcontractError('A team member can only be included once per distribution', 422);
    }
    seen.add(accId);
    return {
      account_id: accId,
      amount_credits: amount,
      notes: r?.notes || null,
    };
  });

  const result = await ContractRepositories.distributeContractSubcontractFunds({
    contractId,
    distributorAccountId: actorAccountId,
    recipients: normalizedRecipients,
    notes,
  });

  const io = getIo();
  for (const dist of result.distributions) {
    try {
      const recipientNotification = await createNotificationServices({
        message: `You received ${dist.amount_credits.toLocaleString()} credits from @${result.distributor.handle} for your work on contract "${contract.contract_title}".`,
        is_read: false,
        reference_table: 'credit_transactions',
        reference_prefix: 'CONTRACT_PAYOUT_RECEIVED',
        reference_path: `/contracts/${contractId}`,
        reference_id: dist.credit_transaction_id,
        account_id: dist.recipient_account_id,
      });

      if (io) {
        io.to(String(dist.recipient_account_id)).emit('notification', recipientNotification);
        io.to(String(dist.recipient_account_id)).emit('walletBalanceUpdated', {
          type: 'CREDIT_RECEIVED',
          amount: dist.amount_credits,
        });
      }
    } catch (err) {
      console.error('Failed to notify distribution recipient:', err.message);
    }
  }

  if (io) {
    io.to(String(actorAccountId)).emit('walletBalanceUpdated', {
      type: 'CREDIT_SENT',
      amount: result.total_distributed,
    });
    io.to(String(contractId)).emit('contractTeamUpdated', { contractId, action: 'funds_distributed' });
  }

  return result;
}

module.exports = {
  ContractSubcontractError,
  getContractTeamServices,
  addContractSubcontractorServices,
  removeContractSubcontractorServices,
  distributeContractFundsServices,
};
