// server/app/config/constants.js
//
// Every enum-like string used across more than one domain lives here, once,
// instead of being redefined per-model. Domain-specific enums that only one
// model cares about are declared inline in that model instead (see
// models/restaurant.model.js `PLAN_TYPES`, kept local since only Restaurant
// and Subscription touch it and both import it from there).

/** B.8 User Management Foundation — future-ready roles (no fine-grained permission matrix yet). */
const USER_ROLES = Object.freeze({
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
});

/** B.7 Restaurant Management — lifecycle states. */
const RESTAURANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
});

/**
 * B.10 Subscription Foundation / C.5 Subscription Management.
 * GRACE_PERIOD sits between ACTIVE and EXPIRED: the plan has technically
 * lapsed but the restaurant is given a configurable extra window (see
 * subscription.service.js `GRACE_PERIOD_DAYS`) before features are cut off,
 * matching C.5's explicit "Grace Period" requirement.
 */
const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'trial',
  ACTIVE: 'active',
  GRACE_PERIOD: 'grace_period',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

/**
 * B.11 Feature Flag Foundation / C.6 Feature Flag Management — matches the
 * Android app's feature screens 1:1. C.6 additionally lists Menu and Bill
 * Settings, extending the original B.11 set.
 */
const FEATURE_KEYS = Object.freeze({
  COUNTER: 'counter',
  DASHBOARD: 'dashboard',
  MENU: 'menu',
  BILL_SETTINGS: 'billSettings',
  INTELLIGENCE: 'intelligence',
  PRINTING: 'printing',
  KOT: 'kot',
});

/**
 * H.15 Order Status -- "Future Kitchen Display isi ko use karega," so this
 * enum is shared, stable vocabulary from day one, not something Counter
 * invents locally and a future Kitchen Display module has to guess at.
 */
const ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  HOLD: 'hold',
  KOT_PRINTED: 'kot_printed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
});

/** H.6 Order Type -- "Future QR Ordering isi ko reuse karega." */
const ORDER_TYPE = Object.freeze({
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
});

/** H.9 Payment. */
const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  SPLIT: 'split',
});

/** H.7 Discounts. */
const DISCOUNT_TYPE = Object.freeze({
  PERCENTAGE: 'percentage',
  FLAT: 'flat',
});

/**
 * B.9 Device Management Foundation / C.8 Device Management.
 * PENDING is the state a newly-seen device starts in until a Super Admin
 * (or an auto-approve policy, not built in this phase) approves it —
 * C.8's "Approve" action moves PENDING -> ACTIVE.
 */
const DEVICE_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REMOVED: 'removed',
});

/**
 * B.12 API Foundation — stable machine-readable error codes returned in
 * `error.code`. Mirrors the Android app's `AppError` sealed-class categories
 * so the same failure means the same thing on both sides of the wire.
 */
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

/**
 * C.9 Activity Logs — closed set of recognized actions. Using a fixed enum
 * (rather than free-text strings) keeps the future Activity Logs UI's
 * filter-by-action-type dropdown accurate and keeps every writer of a log
 * entry consistent (no "RestaurantCreated" vs "restaurant_created" drift).
 */
const ACTIVITY_ACTIONS = Object.freeze({
  SUPER_ADMIN_LOGIN: 'SUPER_ADMIN_LOGIN',
  SUPER_ADMIN_LOGIN_FAILED: 'SUPER_ADMIN_LOGIN_FAILED',
  SUPER_ADMIN_PASSWORD_CHANGED: 'SUPER_ADMIN_PASSWORD_CHANGED',
  RESTAURANT_CREATED: 'RESTAURANT_CREATED',
  RESTAURANT_UPDATED: 'RESTAURANT_UPDATED',
  RESTAURANT_ACTIVATED: 'RESTAURANT_ACTIVATED',
  RESTAURANT_SUSPENDED: 'RESTAURANT_SUSPENDED',
  RESTAURANT_ARCHIVED: 'RESTAURANT_ARCHIVED',
  SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_SUSPENDED: 'SUBSCRIPTION_SUSPENDED',
  FEATURE_FLAG_UPDATED: 'FEATURE_FLAG_UPDATED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DISABLED: 'USER_DISABLED',
  USER_ENABLED: 'USER_ENABLED',
  DEVICE_REGISTERED: 'DEVICE_REGISTERED',
  DEVICE_APPROVED: 'DEVICE_APPROVED',
  DEVICE_DISABLED: 'DEVICE_DISABLED',
  DEVICE_REMOVED: 'DEVICE_REMOVED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SYNC_FAILED: 'SYNC_FAILED',
  // G.13 Activity Logs -- Menu Management
  CATEGORY_CREATED: 'CATEGORY_CREATED',
  CATEGORY_UPDATED: 'CATEGORY_UPDATED',
  CATEGORY_DELETED: 'CATEGORY_DELETED',
  MENU_ITEM_CREATED: 'MENU_ITEM_CREATED',
  MENU_ITEM_UPDATED: 'MENU_ITEM_UPDATED',
  MENU_ITEM_DELETED: 'MENU_ITEM_DELETED',
  // H.13 Activity Logs -- Billing
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_HELD: 'ORDER_HELD',
  ORDER_RESUMED: 'ORDER_RESUMED',
  ORDER_KOT_PRINTED: 'ORDER_KOT_PRINTED',
  ORDER_PAID: 'ORDER_PAID',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
});

module.exports = {
  USER_ROLES,
  RESTAURANT_STATUS,
  SUBSCRIPTION_STATUS,
  FEATURE_KEYS,
  ORDER_STATUS,
  ORDER_TYPE,
  PAYMENT_METHOD,
  DISCOUNT_TYPE,
  DEVICE_STATUS,
  ERROR_CODES,
  ACTIVITY_ACTIONS,
};
