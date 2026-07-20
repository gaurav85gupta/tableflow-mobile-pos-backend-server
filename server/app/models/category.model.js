// server/app/models/category.model.js
//
// G.2 Categories. restaurantId-scoped (B.6 multi-tenant), soft-delete only
// (see repositories/category.repository.js -- no hard delete function
// exists) so that G.14's future Menu Items referencing a category, and any
// historical Reports mapping (G.16), never dangle on a deleted category.

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },

    name: { type: String, required: true, trim: true },

    /** G.9 Ordering -- lower sorts first. Ties broken by createdAt so a fresh category doesn't jump ahead of existing ones by accident. */
    displayOrder: { type: Number, default: 0 },

    /** G.2 "Enable/Disable" -- distinct from a physical delete; a disabled category and its items simply stop appearing to Counter (G.5's item-level availability is the same pattern, one level up). */
    isEnabled: { type: Boolean, default: true },

    /** G.12 "Delete Restriction" -- soft delete; a category with existing menu items cannot be hard-removed, only archived. See services/category.service.js. */
    isArchived: { type: Boolean, default: false },

    /** E.7 Conflict Resolution (Android sync engine) -- bumped on every update; the Android client sends the version it last synced from, and a mismatch signals a conflict rather than a silent overwrite. */
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// G.8 Validation -- "Duplicate Category" (G.12's error case) is enforced at
// the schema level: a restaurant cannot have two ACTIVE categories with the
// same name. Archived categories are excluded from this constraint via a
// partial index, so a restaurant can re-create "Beverages" after archiving
// an old one without a false duplicate-name conflict.
categorySchema.index(
  { restaurantId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isArchived: false } },
);

module.exports = mongoose.model('Category', categorySchema);
