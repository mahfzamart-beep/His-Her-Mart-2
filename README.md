# His & Her Mart

A premium minimalist Bangladesh shopping-store starter built with Next.js.

## Run locally
1. Install Node.js 20 or newer.
2. In this folder run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

## Implemented features
- Responsive storefront with product categories, search, cart and wishlist
- Product catalogue loaded from Supabase
- Guest Cash on Delivery checkout through a Supabase Edge Function
- Server-side product price and stock validation, stock reduction and basic phone order throttling
- Order confirmation with a unique order number and unboxing-video notice
- Protected admin order dashboard with order status updates, private notes and delivery-fee editing
- Admin product catalogue: create and edit product names, categories, descriptions, prices, compare-at prices, stock, image URLs, and publish/featured status
- Supplier fulfilment assignment for own stock, ShopBase BD or DropshippingBD, with supplier product codes and links saved as an order-time snapshot
- Admin-controlled product eligibility for the selected-product free-shipping offer
- Server-side free-shipping calculation: 3 or more quantity units from selected eligible products qualify; all products are excluded by default unless an admin enables them

## Not ready for public commercial launch
- Customer SMS/email order notifications
- Product image uploads to store storage (the current editor accepts externally hosted image URLs)
- Automated supplier order placement and stock sync; supplier API documentation and partner credentials have not yet been confirmed. Current supplier assignment supports manual portal fulfilment
- Live bKash/Nagad payment processing (requires approved merchant credentials)
- A fixed delivery-price policy for orders that do not qualify for free shipping; the store must confirm that charge before dispatch for now
- Real final product photography, verified supplier pricing and stock, and custom domain
- Commercial hosting plan review and approval


## Admin dashboard setup

The protected order dashboard is available at `/admin`. It uses Supabase Auth and checks the signed-in user's `public.profiles.role` value. A normal customer account cannot read or update store orders.

### Create the first store administrator

1. In the Supabase Dashboard, open **Authentication → Users** and create an account using the store owner's email address. Use a strong, unique password and keep it private.
2. After the account is created, open **SQL Editor** and run the following query, replacing the email with the exact email used in step 1:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
);
```

3. Confirm that exactly one profile was updated. If zero rows were updated, confirm the Auth user exists and that the profile row was created.
4. Visit `/admin` on the deployed store and sign in with that account.

Do not place a Supabase service-role key in browser code, GitHub, or a public environment variable. Do not share the administrator password in chat.

### Dashboard scope

The current dashboard lists the latest 200 orders, filters by order status, searches by order number/customer/phone, shows order and item details, lets an authorised administrator update order status and internal notes, and set delivery charges for non-free-shipping orders. Product create/edit, stock updates, visibility, featured status, supplier mapping and free-shipping eligibility are available. Customer SMS/email notifications, staff roles, returns workflow, image-file uploads to store storage, and audit history are not yet implemented. Categories can be created, edited, ordered, and hidden from the admin dashboard.
