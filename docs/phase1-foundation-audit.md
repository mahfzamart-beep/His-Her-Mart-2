# Phase 1 Foundation Audit

Date: 2026-11-08
Repository: mahfzamart-beep/His-Her-Mart-2
Branch: phase1-foundation-audit
Scope: read-only baseline review; no production changes.

## Connected project inventory

- GitHub repository: `mahfzamart-beep/His-Her-Mart-2` (default branch: `main`).
- Vercel project: `his-and-her-mart` (Next.js; latest observed deployment READY).
- Supabase project: `his-her-mart` (`gcbtsnwthmluodxjxoew`, region `ap-south-1`, status ACTIVE_HEALTHY).

## Existing application capabilities (README)

- Responsive storefront, product discovery, filters, quick view, comparison, wishlist, recently viewed items.
- Product details, gallery/zoom, size and colour selection, stock/delivery information.
- Persistent browser-local cart and wishlist.
- Guest COD checkout through `create-guest-order`; server-side price/stock validation, row locking, inventory reduction and phone throttling.
- Guest order tracking through `track-guest-order`.
- Protected `/admin` dashboard using Supabase Auth and `profiles.role = 'admin'`.
- Admin order management, product/category management, image uploads and CSV product import.
- Manual fulfilment mapping for own stock, ShopBase BD and DropshippingBD.
- Help/FAQ, PWA assets, sitemap, robots, canonical metadata and structured data.

## Documented limitations

- Cart and wishlist are browser-local and do not sync across devices/accounts.
- Guest checkout is COD only.
- Supplier stock and orders are not automatically synchronized; supplier assignment is manual.
- Customer accounts/cross-device sync, SMS/email notifications, verified reviews, coupon redemption, full returns/refunds workflow and automated WhatsApp messaging are not implemented.
- Commercial launch prerequisites include verified supplier catalogue/stock/pricing, published business policies, payment onboarding if required, transactional messaging, custom domain, and commercial hosting compatible with the provider's terms.
- README flags the current Vercel Hobby deployment as development/demo only for commercial use.

## Supabase baseline

Observed public tables: profiles, categories, products, customer_addresses, orders, order_items, wishlists, suppliers, operating_expenses, admin_activity_log. Private tables include guest_order_attempts and guest_tracking_attempts. RLS was reported enabled on these tables.

Security advisor findings:
- Informational: `private.guest_tracking_attempts` has RLS enabled but no policies. Confirm intended private-schema access and service-role/function usage before changing.
- Warning: leaked-password protection is disabled (plan capability may limit enabling).

Performance advisor findings:
- Three unindexed foreign keys: admin_activity_log.actor_id, operating_expenses.created_by, products.supplier_id.
- Several indexes reported unused. Do not remove without workload review.

## Detailed review findings (2026-11-08)

### Admin Control Center
- Existing modules are Overview, Orders & delivery, Inventory, Suppliers, Customers, Finance and Activity log. Avoid duplicating these modules; improve the existing workspace.
- The control centre loads at most 500 newest orders, 1,000 products, 500 expenses and 100 activity rows. Customer counts/spend and period totals therefore represent the loaded window, not necessarily lifetime totals.
- The legacy admin page also loads orders/products/categories separately. Review whether both data-loading paths are needed before adding more dashboard requests.
- Supplier and order actions are initiated manually from the admin interface. Preserve an explicit human approval step before any supplier submission.

### Database and function access
- Read-only policy inspection shows public product/category reads are limited to active records; admin writes use `private.is_admin()`. Customer order/address/wishlist reads are scoped to the signed-in customer or admin.
- Product-image Storage policies allow public reads from the `product-images` bucket and admin-only uploads, updates and deletes.
- `create_guest_order` and `track_guest_order` are SECURITY DEFINER RPCs. Privilege inspection confirms neither `anon` nor `authenticated` can execute them directly; the service role can. Their Edge Functions currently have JWT verification disabled, but both validate HTTP method, allowed origin, request shape, phone/order format and use server-side RPC calls. Continue reviewing abuse/rate-limit behaviour and deployment parity.
- `private.guest_tracking_attempts` has RLS enabled with no direct policies. The tracking RPC is SECURITY DEFINER and the RPC grants are restricted; do not add broad table policies. Confirm intended private-schema grants before any change.
- `private.is_admin()` is SECURITY DEFINER and checks `profiles.role = 'admin'`. Keep its execution grants and search-path behaviour under review; do not move admin checks into user-editable metadata.

### Deployment and release
- Latest Vercel deployment observed: READY with target `production`, built from `main`. Project metadata currently reports `live: false`; treat that as a provider project flag, not proof that the deployment URL is unreachable.
- Vercel Preview SSO protection is enabled. Any branch preview may require an authorized Vercel session to inspect.
- No source-code, database, Storage, Edge Function or production deployment changes were made during this audit. No live checkout or customer-data tests were executed.

### Prioritized follow-up
1. Confirm branch preview build and run browser QA without real order submission.
2. Review admin query limits and separate “loaded-window” metrics from lifetime metrics; add clear data coverage labels.
3. Inspect and test status transitions, bulk updates, supplier fulfilment updates, expense recording, CSV exports and image upload restrictions.
4. Check Edge Function deployed source/version against GitHub source and validate rate limiting without creating real orders.
5. Only after review, propose small reversible changes with a preview URL and test evidence.

## Phase 1 implementation sequence

1. Complete route/component and Edge Function review; preserve current storefront, images, customer/order data and visual design.
2. Establish preview-only QA baseline for storefront, product detail, cart, COD checkout, order tracking, admin login/authorization, product CRUD/import, image upload and order status changes.
3. Review Supabase RLS/policies, Storage policies, Edge Function authorization, secrets exposure and logs. No customer PII in reports.
4. Review current AdminControlCenter and order/product data model before proposing additions.
5. Prepare minimal, isolated improvements on this branch; do not deploy to production until preview QA and owner approval.
6. Keep supplier submission manual and approval-gated until an authorized supplier API/integration is verified.

## Safety constraints

- No production deployment, database schema mutation, data deletion, customer-data export, payment changes, or supplier order submission during this baseline audit.
- No new paid services or API usage; initial budget is zero.
- Any future database change must include a reviewed migration, RLS review, test query and advisor check.
- Keep all changes additive and reversible; never replace existing product imagery or customer data.
