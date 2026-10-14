# ReconOS v1 spec (working name)

**Promise:** Find the money your courier and payment gateway owe you, and claim it before the deadline.

**For:** Indian D2C founders selling on Shopify, shipping with Shiprocket, collecting prepaid payments through Razorpay, roughly 300 to 30,000 orders a month, with no finance team.

**Trust rule:** Files are read and checked inside the founder's browser. Nothing is uploaded or stored on a server.

## Files v1 accepts (CSV or Excel)

| File | Required? | Unlocks |
|---|---|---|
| Shopify orders export | Yes | Everything (the list of what was sold, COD or prepaid, refunds) |
| Shiprocket shipments / billing report | Recommended | Delivery status, shipping overcharges |
| Shiprocket COD remittance report | Recommended | Unpaid and short-paid COD |
| Shiprocket weight discrepancy report | Optional | Weight charges to dispute, with deadlines |
| Razorpay settlement report | Recommended | Missing settlements, fee and GST overcharges, refund mismatches |
| Bank statement | Optional | Payouts that never reached the bank |

Each file is recognised from its column names. If a column can't be found, the founder maps it once by hand.

## Checks (founder-language buckets)

1. **COD money the courier hasn't paid you**: delivered COD orders with no remittance after the grace period; remittances smaller than the COD amount.
2. **Courier payouts that didn't reach your bank**: remittance batches with no matching bank credit.
3. **Shipping overcharges**: the same charge twice on one AWB; COD fee on a prepaid order; RTO charge on a delivered order.
4. **Weight charges you can still dispute**: open weight discrepancies, with days left in the 7-working-day window.
5. **Payment gateway shortfalls**: prepaid orders never settled; fee above plan rate; GST not 18% of the fee; refunds larger than issued in Shopify.
6. **Gateway payouts that didn't reach your bank**: settlement UTRs with no matching bank credit.

Every finding is either **Claim** (certain, money owed) or **Check** (needs a human look). The engine never guesses a match; uncertain records go to Check.

## Screens

1. Home: promise, trust line, upload, "Try with sample data".
2. Files: what was recognised, what each missing file would unlock, column mapping if needed.
3. Results: "You can claim ₹X", buckets, cash view (sold vs reached your bank).
4. Bucket detail: order list with reason, amount, deadline.
5. Claims: ready-to-send email per Shiprocket / Razorpay / bank, copy or download; CSV export.

## Free vs paid (to test later)

Free: full audit summary and bucket totals. Paid: order-level lists, claim drafts and exports (one-time audit or monthly).

## Settings (defaults)

Audit date = latest date in the files. Razorpay plan fee 2% of amount, GST 18% on fee. COD remittance grace 10 days after delivery. Gateway settlement grace 3 days. Rupee tolerance ₹1.
