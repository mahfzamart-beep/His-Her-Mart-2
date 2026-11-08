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
