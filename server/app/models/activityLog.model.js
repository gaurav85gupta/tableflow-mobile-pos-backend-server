// server/app/models/activityLog.model.js
//
// C.9 Activity Logs — "Logs immutable hone chahiye."
// Enforced structurally: no repository function in
// `activityLog.repository.js` ever updates or deletes a row (only
// `create` and read queries exist). There is no `PUT`/`DELETE` route for
// activity logs anywhere in the API. Mongo itself doesn't enforce
// immutability, so this is enforced by never writing the code path that
// would mutate one — the same "don't build the door" approach used
// elsewhere in this codebase (e.g. no destructive Room migration on Android).

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    // restaurantId is nullable: some events are platform-level (e.g. a
    // Super Admin logging in) and don't belong to any single restaurant.
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },

    action: { type: String, required: true, index: true }, // e.g. "RESTAURANT_CREATED", "SUBSCRIPTION_CHANGED"
    actorType: { type: String, enum: ['super_admin', 'user', 'system'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actorLabel: { type: String, trim: true }, // denormalized display name, so the log reads fine even if the actor is later deleted

    details: { type: mongoose.Schema.Types.Mixed, default: {} },

    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }, // no updatedAt — reinforces immutability intent
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
