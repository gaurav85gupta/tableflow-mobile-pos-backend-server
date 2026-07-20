// server/app/services/sync.service.js
//
// E.4 Upload Sync / E.5 Download Sync -- server-side counterpart to the
// Android app's SyncQueueProcessor/DownloadSyncService (Phase E). Fulfills
// the endpoints Phase E's SyncApiService was built against but that had no
// server implementation yet.

const syncEntityHandlers = require('../sync/syncEntityHandlers');
const activityLogService = require('./activityLog.service');
const { ACTIVITY_ACTIONS } = require('../config/constants');
const logger = require('../config/logger');

const log = logger.category(logger.CATEGORIES.SYNC);

/** E.4 -- processes a batch of upload changes, one at a time, each fully isolated so one bad change doesn't fail the whole batch (matches the Android client's own per-entry error isolation in SyncQueueProcessor). */
async function processUploadBatch(restaurantId, changes, actor) {
  const results = [];

  for (const change of changes) {
    const handler = syncEntityHandlers.handlerFor(change.entityType);
    if (!handler) {
      log.warn('Upload rejected: no handler for entityType', { entityType: change.entityType, queueEntryId: change.queueEntryId });
      results.push({ queueEntryId: change.queueEntryId, status: 'REJECTED', errorMessage: `Unknown entity type: ${change.entityType}` });
      continue;
    }

    try {
      const outcome = await handler.push(restaurantId, change, actor);
      log.info('Upload processed', { queueEntryId: change.queueEntryId, entityType: change.entityType, status: outcome.status });
      results.push({ queueEntryId: change.queueEntryId, ...outcome });
    } catch (err) {
      log.error('Upload failed unexpectedly', { queueEntryId: change.queueEntryId, entityType: change.entityType, error: err.message });
      await activityLogService.record({
        action: ACTIVITY_ACTIONS.SYNC_FAILED,
        actorType: 'system',
        restaurantId,
        details: { queueEntryId: change.queueEntryId, entityType: change.entityType, error: err.message },
      });
      results.push({ queueEntryId: change.queueEntryId, status: 'REJECTED', errorMessage: 'An unexpected error occurred.' });
    }
  }

  return results;
}

/** E.5/E.6 -- pulls changes for every requested entity type, only those changed after `since`. */
async function processDownload(restaurantId, entityTypes, since) {
  const changes = [];

  for (const entityType of entityTypes) {
    const handler = syncEntityHandlers.handlerFor(entityType);
    if (!handler) {
      log.warn('Download requested for unknown entityType', { entityType });
      continue;
    }
    const entityChanges = await handler.pull(restaurantId, since);
    entityChanges.forEach((c) => changes.push({ entityType, ...c }));
  }

  log.info('Download processed', { restaurantId, entityTypes, changeCount: changes.length });

  return { changes, serverTimestamp: Date.now() };
}

module.exports = { processUploadBatch, processDownload };
