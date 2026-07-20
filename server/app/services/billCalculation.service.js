// server/app/services/billCalculation.service.js
//
// H.8 Tax Calculation -- "Calculation logic centralized honi chahiye."
// This is the ONE place bill math happens server-side; order.service.js
// calls this rather than computing totals inline, and this exact
// arithmetic is mirrored (not just "similar," but the same operation
// order) in the Android client's own BillCalculator.kt so a bill never
// displays one total on the device and a different one after syncing.
//
// Calculation order (fixed, documented, never reordered):
//   1. Per-item discount applied to that item's line total.
//   2. Subtotal = sum of all (discounted) item line totals.
//   3. Bill-level discount applied to the subtotal.
//   4. GST computed on the POST-bill-discount amount, per item's own GST%
//      (since different items can have different GST rates -- a flat
//      single bill-level tax rate would be wrong the moment two GST
//      percentages appear on the same bill).
//   5. Grand total = post-discount subtotal + total tax.

function applyDiscount(amount, discountType, discountValue) {
  if (!discountType || !discountValue) return amount;
  if (discountType === 'percentage') {
    return Math.max(0, amount - (amount * discountValue) / 100);
  }
  // flat
  return Math.max(0, amount - discountValue);
}

/**
 * @param items - array of { unitPrice, quantity, gstPercentage, discountType, discountValue }
 * @param billDiscountType, billDiscountValue - H.7 Bill Discount
 * @returns { subtotal, totalDiscount, totalTax, grandTotal, lineItems: [{ ...item, lineSubtotal, lineDiscount, lineTotal }] }
 */
function calculateBill(items, { billDiscountType = null, billDiscountValue = 0 } = {}) {
  let rawSubtotal = 0;
  let itemDiscountTotal = 0;

  const lineItems = items.map((item) => {
    const lineSubtotal = item.unitPrice * item.quantity;
    const lineAfterItemDiscount = applyDiscount(lineSubtotal, item.discountType, item.discountValue);
    const lineDiscount = lineSubtotal - lineAfterItemDiscount;

    rawSubtotal += lineSubtotal;
    itemDiscountTotal += lineDiscount;

    return { ...item, lineSubtotal, lineDiscount, lineAfterItemDiscount };
  });

  const subtotalAfterItemDiscounts = rawSubtotal - itemDiscountTotal;
  const subtotalAfterBillDiscount = applyDiscount(subtotalAfterItemDiscounts, billDiscountType, billDiscountValue);
  const billDiscountAmount = subtotalAfterItemDiscounts - subtotalAfterBillDiscount;

  // Distribute the bill-level discount proportionally across line items
  // before computing tax, so each line's effective tax base reflects its
  // fair share of the bill discount too -- otherwise a 100% bill discount
  // would still leave tax computed on the pre-discount amount, which is wrong.
  const billDiscountRatio = subtotalAfterItemDiscounts > 0 ? subtotalAfterBillDiscount / subtotalAfterItemDiscounts : 0;

  let totalTax = 0;
  const finalLineItems = lineItems.map((line) => {
    const taxableAmount = line.lineAfterItemDiscount * billDiscountRatio;
    const lineTax = (taxableAmount * line.gstPercentage) / 100;
    totalTax += lineTax;
    return { ...line, taxableAmount, lineTax };
  });

  const totalDiscount = itemDiscountTotal + billDiscountAmount;
  const grandTotal = subtotalAfterBillDiscount + totalTax;

  return {
    subtotal: round2(rawSubtotal),
    totalDiscount: round2(totalDiscount),
    totalTax: round2(totalTax),
    grandTotal: round2(grandTotal),
    lineItems: finalLineItems,
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

module.exports = { calculateBill };
