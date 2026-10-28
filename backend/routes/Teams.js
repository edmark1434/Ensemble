const r = require('express').Router(),
  c = require('../controllers/TeamsControllers'),
  tasks = require('../controllers/TeamTaskControllers'),
  check = require('../middleware/CheckSession'),
  optionalSession = require('../middleware/OptionalSession'),
  auth = require('../middleware/RequireAuth');

// 1. Static public routes
r.get('/invite/:code', optionalSession, c.invitePreview);
r.get('/', optionalSession, c.list);

// 2. Static authenticated routes (must precede /:teamId to prevent routing collision)
r.get('/marketplace-actors', check, auth, c.marketplaceActors);
r.get('/creation-eligibility', check, auth, c.creationEligibility);
r.post('/join-by-code', check, auth, c.joinCode);
r.post('/', check, auth, c.create);

// 3. Parameterized public routes
r.get('/:teamId', optionalSession, c.detail);
r.get('/:teamId/members', optionalSession, c.members);
r.get('/:teamId/reviews', optionalSession, c.reviews);

// 4. Authenticated parameterized routes
r.use(check, auth);
r.get('/:teamId/member-limit', c.memberLimit);
r.post('/:teamId/chat', c.chat);
r.get('/:teamId/tasks', c.tasks);
r.post('/:teamId/tasks', c.createTask);
r.patch('/:teamId/tasks/:taskId', c.updateTask);
r.delete('/:teamId/tasks/:taskId', c.deleteTask);
r.get('/:teamId/video-projects', c.videoProjects);
r.post('/:teamId/video-projects', c.createVideoProject);
r.delete('/:teamId/video-projects/:projectId', c.deleteVideoProject);
r.get('/:teamId/marketplace-posts', c.marketplacePosts);
r.get('/:teamId/task-workspaces', tasks.list);
r.get('/:teamId/task-workspaces/:contractId', tasks.detail);
r.post('/:teamId/task-workspaces/:contractId/members', tasks.addMembers);
r.delete('/:teamId/task-workspaces/:contractId/members/:memberAccountId', tasks.removeMember);
r.post('/:teamId/task-workspaces/:contractId/tasks', tasks.createTask);
r.patch('/:teamId/task-workspaces/:contractId/tasks/:taskId', tasks.updateTask);
r.delete('/:teamId/task-workspaces/:contractId/tasks/:taskId', tasks.deleteTask);
r.post('/:teamId/task-workspaces/:contractId/distributions', tasks.distributeFunds);
r.patch('/:teamId/task-workspaces/:contractId/project-lead', tasks.updateProjectLead);
r.patch('/:teamId', c.update);
r.delete('/:teamId', c.remove);
r.get('/:teamId/requests', c.requests);
r.post('/:teamId/join', c.join);
r.post('/:teamId/leave', c.leave);
r.post('/:teamId/invitations', c.invite);
r.patch('/:teamId/invitations/accept', c.acceptInvite);
r.patch('/:teamId/invitations/decline', c.declineInvite);
r.patch('/:teamId/requests/:memberAccountId/approve', c.manage('approve'));
r.patch('/:teamId/requests/:memberAccountId/deny', c.manage('deny'));
r.patch('/:teamId/members/:memberAccountId/role', c.manage('role'));
r.patch('/:teamId/members/:memberAccountId/suspend', c.manage('suspend'));
r.patch('/:teamId/members/:memberAccountId/restore', c.manage('restore'));
r.delete('/:teamId/members/:memberAccountId', c.manage('remove'));
r.patch('/:teamId/transfer-ownership', c.transfer);
r.get('/:teamId/wallet', c.wallet);
r.get('/:teamId/transactions', c.transactions);
r.post('/:teamId/wallet/distributions', c.distributeFunds);
r.post('/:teamId/wallet/funds', c.addFunds);
r.post('/:teamId/reviews', c.review);
r.post('/:teamId/reports', c.report);

module.exports = r;
