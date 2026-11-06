# His & Her Mart — Manual Supplier & Order Operations

This guide reflects the current setup: ShopBase BD and DropshippingBD are connected manually because no supplier API access is available. Do not assume live supplier stock, prices or order status are synced.

## 1. Before publishing a product

For every product, verify all of the following directly with the supplier or from your own stock:

- Product name, exact variant/size/colour and supplier item code.
- Current supplier price and your selling price.
- Available quantity today; keep the website stock conservative.
- Clear product photos and permission to use them.
- Product condition, specifications and any warranty/expiry details that apply.
- Supplier delivery/dispatch capability for the customer's area.
- Your margin after supplier cost, delivery, packaging, COD collection and expected returns.

In Admin → Products, set the fulfilment source to Own stock, ShopBase BD or DropshippingBD. For supplier items, save the supplier product code and product-page URL. Publish only after the details are verified. Recheck supplier stock and price before accepting each order.

## 2. Process each new order

1. Open `/admin`, sign in, and refresh the order dashboard.
2. Open each new Pending order. Check the customer's name, mobile number, district, area and full address.
3. Check every line item and its fulfilment source. Open the saved supplier item link where available.
4. Manually confirm the exact variant, stock, supplier price and dispatch availability with the supplier.
5. The customer selects **Inside Dhaka (৳80)** or **Outside Dhaka (৳150)** at checkout. The checkout server saves the matching delivery charge and updates the order total automatically. Use **Save delivery charge and update total** only if an exceptional correction is required.
6. Add a private admin note with the supplier confirmation/reference and any fulfilment detail needed by the store. Do not put passwords, payment credentials or unnecessary sensitive customer data in notes.
7. Only after stock, delivery fee and fulfilment are confirmed, update the order status to **Confirmed**.
8. Place the supplier order manually. The supplier / dropshipping partner handles parcel dispatch and courier coordination under its fulfilment process. When the supplier confirms dispatch, update the status to **Shipped**. Update it to **Delivered** only after delivery is confirmed.
9. If an item is unavailable or the supplier price changed, contact the customer and agree on the next step before dispatch. Do not silently substitute products or change the agreed amount.

## 3. Keep stock accurate

- The checkout function validates and reduces the website stock when an order is placed.
- Supplier stock does not sync automatically. Recheck it manually and update the product stock in Admin → Products after supplier changes or cancellations.
- Do not publish a supplier quantity you have not verified.
- Hide a product when its availability or price cannot be confirmed.

## 4. Daily operating checklist

- Review all Pending orders.
- Reconfirm supplier stock and prices for new orders.
- Confirm delivery charges before dispatch.
- Check that order status reflects the real fulfilment stage.
- Update product stock after supplier changes, returns or cancellations.
- Keep customer contact and address details private; share only what the supplier/courier needs to fulfil that order.

## 5. Current limitations

- Supplier orders, prices and inventory are manual; there is no ShopBase BD or DropshippingBD API sync.
- Checkout currently accepts Cash on Delivery only.
- SMS/email notifications and courier tracking-code integration are not active.
- Delivery charges are ৳80 inside Dhaka and ৳150 outside Dhaka. Customers choose the correct zone at checkout; exceptional corrections can be saved by an admin.
- Exchange policy: customers must inspect the product while the delivery person is present. A defect found before the delivery person leaves is replaced at the store's cost. If an exchange is requested after the delivery person leaves, the customer pays a new delivery charge.
- Supplier-fulfilled orders use the supplier / dropshipping partner's courier fulfilment process; no separate store courier booking is part of this workflow.
- Do not accept commercial orders on the current Vercel Hobby hosting until the hosting terms allow commercial use. The current deployment is suitable for demo and preparation only.
