// server/app/models/restaurantConfig.model.js
//
// C.4 Restaurant Configuration -- "Ye Android app ke first sync mein
// download hoga." One document per restaurant, created alongside the
// restaurant itself (see restaurant.service.js createRestaurant), holding
// the initial defaults the Android app pulls down on its very first login
// sync. This is intentionally a single flexible document rather than N
// tables, since Phase C doesn't yet know the full shape every future
// module (menu, KOT, printer) will need -- it only needs to prove the
// concept: a restaurant has config, and the app can fetch it.

const mongoose = require('mongoose');

const restaurantConfigSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true, index: true },

    businessType: { type: String, default: 'restaurant' }, // e.g. restaurant, cafe, cloud_kitchen, bar

    defaultTax: {
      label: { type: String, default: 'GST' },
      percentage: { type: Number, default: 5, min: 0, max: 100 },
      inclusive: { type: Boolean, default: false },
    },

    billSettings: {
      invoicePrefix: { type: String, default: 'INV' },
      roundOffTotal: { type: Boolean, default: true },
      showTaxBreakdown: { type: Boolean, default: true },
    },

    printerConfig: {
      paperWidthMm: { type: Number, default: 58 },
      printLogo: { type: Boolean, default: false },
      kotCopies: { type: Number, default: 1, min: 1, max: 5 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('RestaurantConfig', restaurantConfigSchema);
