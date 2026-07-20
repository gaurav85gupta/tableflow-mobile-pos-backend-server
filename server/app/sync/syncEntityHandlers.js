// server/app/sync/syncEntityHandlers.js
//
// E.18 Future Expansion (server-side mirror of the Android client's
// SyncEntityHandler/DownloadSyncHandler registry pattern, Phase E). Each
// syncable entity type registers ONE handler object here describing how to
// push/pull it -- this is what fulfills Phase E's flagged gap ("no backend
// entity exists yet to sync") for Category and MenuItem, the first two
// real entries in this registry, in a way the NEXT entity (Orders, etc.)
// can extend by adding one more entry, not by modifying sync.controller.js.

const categoryService = require('../services/category.service');
const categoryRepository = require('../repositories/category.repository');
const menuItemService = require('../services/menuItem.service');
const menuItemRepository = require('../repositories/menuItem.repository');
const orderService = require('../services/order.service');
const orderRepository = require('../repositories/order.repository');
const AppError = require('../utils/AppError');

/**
 * Each handler implements:
 *   - push(restaurantId, change, actor) -> { status: 'SYNCED'|'CONFLICT'|'REJECTED', serverId?, newVersion?, errorMessage? }
 *   - pull(restaurantId, since) -> array of { serverId, version, operation: 'UPSERT'|'DELETE', payload }
 */
const handlers = {
  category: {
    async push(restaurantId, change, actor) {
      const payload = JSON.parse(change.payload);
      try {
        if (change.operation === 'CREATE') {
          const created = await categoryService.createCategory(restaurantId, payload, actor);
          return { status: 'SYNCED', serverId: String(created._id), newVersion: created.version };
        }
        if (change.operation === 'UPDATE') {
          const existing = await categoryRepository.findById(restaurantId, payload.serverId);
          if (existing && existing.version !== change.baseVersion) {
            return { status: 'CONFLICT', errorMessage: 'Category was modified elsewhere since your last sync.' };
          }
          const updated = await categoryService.updateCategory(restaurantId, payload.serverId, payload, actor);
          return { status: 'SYNCED', serverId: String(updated._id), newVersion: updated.version };
        }
        if (change.operation === 'DELETE') {
          await categoryService.archiveCategory(restaurantId, payload.serverId, actor);
          return { status: 'SYNCED' };
        }
        return { status: 'REJECTED', errorMessage: `Unknown operation: ${change.operation}` };
      } catch (err) {
        if (err instanceof AppError && err.code === 'CONFLICT') {
          return { status: 'CONFLICT', errorMessage: err.message };
        }
        return { status: 'REJECTED', errorMessage: err.message };
      }
    },

    async pull(restaurantId, since) {
      const categories = await categoryRepository.findChangedSince(restaurantId, since);
      return categories.map((c) => ({
        serverId: String(c._id),
        version: c.version,
        operation: c.isArchived ? 'DELETE' : 'UPSERT',
        payload: JSON.stringify({
          name: c.name,
          displayOrder: c.displayOrder,
          isEnabled: c.isEnabled,
        }),
      }));
    },
  },

  menu_item: {
    async push(restaurantId, change, actor) {
      const payload = JSON.parse(change.payload);
      try {
        if (change.operation === 'CREATE') {
          const created = await menuItemService.createMenuItem(restaurantId, payload, actor);
          return { status: 'SYNCED', serverId: String(created._id), newVersion: created.version };
        }
        if (change.operation === 'UPDATE') {
          const existing = await menuItemRepository.findById(restaurantId, payload.serverId);
          if (existing && existing.version !== change.baseVersion) {
            return { status: 'CONFLICT', errorMessage: 'Menu item was modified elsewhere since your last sync.' };
          }
          const updated = await menuItemService.updateMenuItem(restaurantId, payload.serverId, payload, actor);
          return { status: 'SYNCED', serverId: String(updated._id), newVersion: updated.version };
        }
        if (change.operation === 'DELETE') {
          await menuItemService.archiveMenuItem(restaurantId, payload.serverId, actor);
          return { status: 'SYNCED' };
        }
        return { status: 'REJECTED', errorMessage: `Unknown operation: ${change.operation}` };
      } catch (err) {
        if (err instanceof AppError && err.code === 'CONFLICT') {
          return { status: 'CONFLICT', errorMessage: err.message };
        }
        return { status: 'REJECTED', errorMessage: err.message };
      }
    },

    async pull(restaurantId, since) {
      const items = await menuItemRepository.findChangedSince(restaurantId, since);
      return items.map((i) => ({
        serverId: String(i._id),
        version: i.version,
        operation: i.isArchived ? 'DELETE' : 'UPSERT',
        payload: JSON.stringify({
          categoryId: String(i.categoryId),
          name: i.name,
          sellingPrice: i.sellingPrice,
          gstPercentage: i.gstPercentage,
          isAvailable: i.isAvailable,
          displayOrder: i.displayOrder,
        }),
      }));
    },
  },

  order: {
    /**
     * H.14 Sync Integration -- "Order create hote hi... Background
     * Upload." An order's push is CREATE-only in practice for this phase
     * (a device creates a bill locally, then syncs it up) -- status
     * transitions (hold/resume/KOT/payment) triggered directly against
     * the live API when online are the normal path; the offline case
     * (H.14's whole point) is captured by this CREATE upload once
     * connectivity returns. UPDATE is still handled for completeness
     * (e.g. a bill edited while offline, then synced), reusing the same
     * order.service.js functions the live API routes call.
     */
    async push(restaurantId, change, actor) {
      const payload = JSON.parse(change.payload);
      try {
        if (change.operation === 'CREATE') {
          const created = await orderService.createOrder(restaurantId, payload, actor);
          return { status: 'SYNCED', serverId: String(created._id), newVersion: created.version };
        }
        if (change.operation === 'UPDATE') {
          const existing = await orderRepository.findById(restaurantId, payload.serverId);
          if (existing && existing.version !== change.baseVersion) {
            return { status: 'CONFLICT', errorMessage: 'Order was modified elsewhere since your last sync.' };
          }
          const updated = await orderService.updateOrderItems(restaurantId, payload.serverId, payload, actor);
          return { status: 'SYNCED', serverId: String(updated._id), newVersion: updated.version };
        }
        // H.15 -- an order is never hard-deleted; "DELETE" from the sync
        // queue's generic vocabulary doesn't apply to Orders at all (a
        // completed/cancelled order is a status transition, not a
        // deletion) -- rejected rather than silently ignored, so a bug
        // that somehow queues one is visible instead of silently swallowed.
        return { status: 'REJECTED', errorMessage: `Orders do not support the ${change.operation} operation.` };
      } catch (err) {
        if (err instanceof AppError && err.code === 'CONFLICT') {
          return { status: 'CONFLICT', errorMessage: err.message };
        }
        return { status: 'REJECTED', errorMessage: err.message };
      }
    },

    /**
     * H.13 Dashboard Integration -- orders sync DOWN too (e.g. a manager's
     * tablet showing today's order list, or a future Kitchen Display
     * module), same incremental-since-watermark pattern as Category/MenuItem.
     */
    async pull(restaurantId, since) {
      const orders = await orderRepository.findChangedSince(restaurantId, since);
      return orders.map((o) => ({
        serverId: String(o._id),
        version: o.version,
        operation: 'UPSERT', // orders are never hard-deleted -- see push()'s note above
        payload: JSON.stringify({
          displayNumber: o.displayNumber,
          status: o.status,
          orderType: o.orderType,
          items: o.items,
          payments: o.payments,
          customerName: o.customerName,
          customerMobile: o.customerMobile,
          subtotal: o.subtotal,
          totalDiscount: o.totalDiscount,
          totalTax: o.totalTax,
          grandTotal: o.grandTotal,
        }),
      }));
    },
  },
};

function handlerFor(entityType) {
  return handlers[entityType] || null;
}

function allRegisteredEntityTypes() {
  return Object.keys(handlers);
}

module.exports = { handlerFor, allRegisteredEntityTypes };
