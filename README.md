# His & Hers Mart

A premium minimalist shopping storefront for Bangladesh, built with Next.js and Supabase.

## Current application features

- Responsive storefront with product categories, search, product cards and BDT prices.
- Product detail pages with inventory availability, descriptions and product-specific SEO metadata.
- Persistent cart and browser-local wishlist.
- Guest Cash on Delivery checkout through the `create-guest-order` Supabase Edge Function.
- Server-side price and stock validation, row locking, inventory reduction and phone-based order throttling.
- Order confirmation with a unique order number and the unboxing-video notice.
- Guest order tracking through the `track-guest-order` Edge Function.
- Protected admin dashboard at `/admin`, using Supabase Auth and the `profiles.role = 'admin'` check.
- Admin order management: order search, status updates, delivery-charge editing, private order notes and filtered CSV export of the latest 200 orders.
- Product management: add/edit products, SKU, price, compare-at price, description, stock, category, image URL, publish/featured status and supplier mapping.
- Product image uploads to the `product-images` Supabase Storage bucket (JPG, PNG and WebP; up to 5 MB).
- CSV bulk product import (up to 500 rows).
- Category management: create, edit, sort and hide categories.
- Manual fulfilment mapping for own stock, ShopBase BD and DropshippingBD. Supplier orders and stock are not automatically synced.
- Selected-product free shipping: at least 3 quantity units from products explicitly marked eligible qualify.
- Customer Help & FAQs page for ordering, COD, selected-product free shipping, delivery charges, order tracking and browser-saved items.
- Store icon, sitemap, robots.txt, canonical product URLs, Open Graph metadata and noindex rules for private/customer utility pages.

## Important implementation notes

- Cart and wishlist are saved in the current browser's local storage. They do not sync across devices or signed-in customer accounts.
- The newsletter form is a visual preview and does not save email subscriptions yet.
- The admin CSV export contains the currently loaded latest 200 orders and respects the active status/search filters.
- Guest checkout currently supports Cash on Delivery only.
- Checkout calculates and stores delivery charges atomically with order creation: ৳80 inside Dhaka and ৳150 outside Dhaka. Selected products can qualify for free shipping when at least 3 quantity units are marked eligible.
- The catalogue currently contains 8 sample products and 8 categories. Replace them with real, verified product descriptions, photos, prices and stock before selling.
- Supplier assignment is manual because API access has not been provided by the suppliers.
- SMS/email order notifications, customer registration and account/order-history screens, reviews, coupons, return/refund workflow, and a WhatsApp support integration are not implemented.

## Store operations

See [Manual Supplier & Order Operations](docs/manual-supplier-and-order-operations.md) for the step-by-step workflow to verify ShopBase BD/DropshippingBD stock, confirm delivery charges, process orders and keep inventory accurate without API integrations.

## Local development

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Configure the public Supabase project URL and anon/publishable key in the local environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

Never place the Supabase service-role or secret key in a `NEXT_PUBLIC_*` variable, browser code, or GitHub.

## Admin setup

The protected dashboard is available at `/admin`. It uses Supabase Auth and checks the signed-in user's `public.profiles.role` value. A normal customer account must not be able to manage orders or products.

To create an administrator on a fresh project:

1. In Supabase Dashboard, create the Auth user with the store owner's email.
2. In SQL Editor, set that user's profile role to `admin` (replace the email below):
   
   ```sql
   update public.profiles
   set role = 'admin', updated_at = now()
   where id = (
     select id from auth.users
     where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
   );
   ```

3. Confirm that exactly one profile row was updated.
4. Open `/admin` and sign in.

Do not share administrator passwords in chat. Use the store's password-reset page if the administrator needs to set a new password.

## Before commercial launch

The code and current production build are deployed, but the store is not ready for full commercial operation until these owner/business items are completed:

- Replace the sample catalogue with real supplier products and verified stock, images and pricing.
- Delivery charges are configured as ৳80 inside Dhaka and ৳150 outside Dhaka; confirm these remain the final business rates.
- Decide and publish return, exchange, refund, privacy and terms policies.
- Complete approved bKash/Nagad merchant onboarding and gateway integration if those payment methods are required. Do not display them as active payment options before credentials and testing are complete.
- Configure transactional email/SMS and a verified store contact channel.
- Register and connect a store domain.
- Hosting note: the current Vercel Hobby deployment is for development/demo use only because Vercel restricts Hobby to personal, non-commercial use. Before commercial sales, move to a free host whose terms permit commercial use or choose a suitable business plan.
- The November 6, 2026 Production build uses Next.js 15.5.29 and reported 0 npm audit vulnerabilities. Keep dependencies updated as new security advisories are released.
- Supabase Free currently reports leaked-password protection as unavailable on this plan; enable it only if/when the project is upgraded to a plan that supports it.
- Run browser-based checkout, tracking, admin, upload and mobile-device tests before accepting real customer orders.

## Production routes

- Storefront: `/`
- Admin: `/admin`
- Admin password reset: `/admin/reset-password`
- Order tracking: `/track-order`
- Help & FAQs: `/faq`
- Wishlist: `/wishlist`
- Product details: `/products/[slug]`
- Sitemap: `/sitemap.xml`
- Robots rules: `/robots.txt`
