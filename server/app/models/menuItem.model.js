// server/app/models/menuItem.model.js
//
// G.3 Menu Items / G.14 Future Expansion Hooks.
//
// STABLE IDENTITY (per the phase brief's strong recommendation): this
// document's `_id` is that stable identifier. It is generated once at
// creation and NEVER regenerated -- renaming an item or moving it to a
// different category is always an `update`, never a delete+recreate (see
// services/menuItem.service.js -- there is no function that removes and
// re-inserts a document for an edit). This is what lets G.16's future
// Reports and Inventory mapping join on menuItemId permanently, and what
// lets the Android client's sync engine treat a rename as an ordinary
// UPDATE sync operation rather than a DELETE+CREATE pair that would lose
// any local reference to the old id.
//
// Fields split deliberately into "G.3 basic" (required for this phase's
// UI) and "G.14 future-ready" (schema exists now so a later phase's
// migration is additive-only -- no schema migration needed when Variants/
// Add-ons/Combos/Inventory/Time-based Availability actually get built,
// since the columns are already here, just unused).

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },

    // --- G.3 Basic Fields ---
    name: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 5, min: 0, max: 100 },

    /** G.5 Availability -- "Available" | "Unavailable". Distinct from isArchived: an item can be temporarily 86'd (out of a specific ingredient today) without being removed from the menu structure at all. */
    isAvailable: { type: Boolean, default: true },

    /** G.9 Ordering, scoped within the item's own category. */
    displayOrder: { type: Number, default: 0 },

    /** G.12 "Delete Restriction" -- soft delete, same pattern as Category. */
    isArchived: { type: Boolean, default: false },

    // --- G.3 Future-ready fields (schema now, no UI yet) ---
    itemCode: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },
    foodType: { type: String, enum: ['veg', 'non_veg', 'egg', null], default: null },
    barcode: { type: String, trim: true, default: null },
    imageUrl: { type: String, trim: true, default: null },
    preparationTimeMinutes: { type: Number, default: null },
    trackInventory: { type: Boolean, default: false },
    baseCost: { type: Number, default: null, min: 0 },

    // --- G.14 Future Expansion Hooks (schema placeholders only) ---
    // Kept as loosely-typed Mixed/empty-default fields rather than fully
    // designed sub-schemas -- the actual shape of Variants/Add-ons/Combos
    // is a future phase's design decision, not this one's. Reserving the
    // field NAMES now is what makes that future migration additive-only.
    variants: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    addOns: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    comboItems: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    happyHourPricing: { type: mongoose.Schema.Types.Mixed, default: undefined },
    availabilitySchedule: { type: mongoose.Schema.Types.Mixed, default: undefined },
    translations: { type: mongoose.Schema.Types.Mixed, default: undefined },

    /** E.7 Conflict Resolution (Android sync engine) -- same purpose as Category.version. */
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// G.8 Validation -- "Duplicate item names... policy ke hisaab se handle
// karo (same category mein allow ya disallow -- ye business rule pehle
// define karo)."
//
// POLICY (defined here, once): duplicate names are DISALLOWED within the
// same category, but ALLOWED across different categories. Rationale: two
// categories legitimately having, say, a "Chicken Roll" in both "Starters"
// and "Rolls" is a normal menu structure a restaurant might want; but two
// "Chicken Roll" entries in the SAME category is virtually always a data
// entry mistake (duplicate creation, or a rename that collided) and a
// cashier at Counter would have no way to tell them apart. Enforced the
// same way Category's duplicate-name rule is: a partial unique index that
// excludes archived items, scoped to (restaurantId, categoryId, name).
menuItemSchema.index(
  { restaurantId: 1, categoryId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isArchived: false } },
);

// G.4 Search / G.11 Performance -- text index on name (+ itemCode once
// populated) so search stays fast past 1000+ items without a full collection scan.
menuItemSchema.index({ name: 'text', itemCode: 'text' });

// G.11 Performance -- the single most common Counter-facing query is
// "active, available items for this restaurant, sorted for display" --
// this compound index serves that query directly instead of relying on
// the standalone restaurantId index plus an in-memory sort.
menuItemSchema.index({ restaurantId: 1, isArchived: 1, isAvailable: 1, categoryId: 1, displayOrder: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
