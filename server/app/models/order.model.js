// server/app/models/order.model.js
//
// H.1-H.15 Counter & Billing Engine -- the server-side mirror of a Counter
// bill. This is the first genuinely TRANSACTIONAL entity in this codebase
// (D.12/H.4's "Bill + Items + Payments ek transaction mein commit hon"
// requirement, carried over from the Android client's own
// TransactionRunner) -- order items and payments are embedded
// sub-documents, not separate collections, specifically so a single
// Mongoose `save()` is atomic across the whole bill by construction
// (MongoDB guarantees single-document write atomicity), rather than
// needing a multi-collection transaction for something this
// tightly-coupled.
//
// STABLE IDENTITY (the same principle Phase G's menuItem.model.js
// documents): `_id` is generated once and never regenerated. A bill's
// items/discounts/payment can all change while it's still a DRAFT/HOLD,
// but it's always an `update`, never delete+recreate -- this is what lets
// H.15's future Kitchen Display module track one order through its whole
// lifecycle by a single stable id.

const mongoose = require('mongoose');
const { ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD, DISCOUNT_TYPE } = require('../config/constants');

/** H.3/H.4 -- one line in the cart. Snapshots the item's name/price at
 * order time (NOT a live reference-and-lookup into MenuItem) so a later
 * menu price change never silently alters a historical bill. */
const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, required: true, min: 0, max: 100 },
    quantity: { type: Number, required: true, min: 1 },

    /** H.7 Item Discount. */
    discountType: { type: String, enum: Object.values(DISCOUNT_TYPE), default: null },
    discountValue: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

/** H.9 Payment -- an order can have more than one payment row once Split Payment (future-ready) is real. */
const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    referenceNumber: { type: String, trim: true, default: null }, // UPI/card transaction ref, optional
  },
  { _id: true },
);

const orderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /** H.1/H.17 -- a short, human-friendly sequence number (e.g. "#0042") for calling out orders verbally at a counter; NOT the identity used anywhere internally (that's always _id). Scoped per-restaurant, reset is a future/manual operation, not automatic. */
    displayNumber: { type: Number, required: true },

    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.DRAFT, index: true },
    orderType: { type: String, enum: Object.values(ORDER_TYPE), default: ORDER_TYPE.DINE_IN },

    items: { type: [orderItemSchema], default: [] },
    payments: { type: [paymentSchema], default: [] },

    // H.5 Customer Information -- optional.
    customerName: { type: String, trim: true, default: null },
    customerMobile: { type: String, trim: true, default: null },

    // H.7 Bill Discount (separate from each item's own discount).
    billDiscountType: { type: String, enum: Object.values(DISCOUNT_TYPE), default: null },
    billDiscountValue: { type: Number, default: 0, min: 0 },

    // H.8 Bill Summary -- computed server-side too (never trusted purely
    // from the client) via services/billCalculation.service.js, the exact
    // same centralized-logic principle H.8 requires on the Android side.
    subtotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, required: true, min: 0, default: 0 },
    totalTax: { type: Number, required: true, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    kotPrintedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    /** E.7 Conflict Resolution (Android sync engine) -- same purpose as Category/MenuItem's version field. */
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, displayNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);
