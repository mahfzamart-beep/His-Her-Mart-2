# Cloud Momos implementation plan

## Confirmed business rules
- Brand: Cloud Momos.
- Food-only online momo store; service area is Sylhet only.
- Delivery areas are added and enabled gradually by an administrator.
- Each active area has its own delivery charge, configured by an administrator.
- Customers may select only active delivery areas.
- Ready to Eat products are cooked before delivery.
- Frozen Momos are raw and frozen when packed.
- Every product box contains 6 pieces.
- Catalogue: 8 Ready to Eat products and 4 Frozen Momos products.
- Product prices remain unpublished placeholders until the owner sets real prices.
- Homepage keeps the supplied forest-green, cream and warm-orange visual direction, including the original mascot and food-brand tone.
- Homepage includes promotions/advertisements targeted to selected delivery areas.

## Delivery area data model
- `delivery_areas`: Sylhet area name, per-area charge, active flag and display order.
- Public checkout reads active areas only.
- Admin can create, edit, activate/deactivate and delete areas.
- The server-side order creation routine must validate the selected active area and calculate the delivery charge from the database. The client must never be trusted to submit a charge.
- The order must store the selected area and charge snapshot so later admin price changes do not rewrite existing orders.

## Advertisement data model
- `advertisements`: image, title, copy, CTA, optional product link, schedule and publish status.
- `advertisement_delivery_areas`: many-to-many targeting between an advertisement and one or more delivery areas.
- Public homepage shows only currently published advertisements that target at least one currently active area.
- Admin controls upload, edit, scheduling, targeting, ordering, pause and publish.

## Safety and rollout
- Work is being done on the `cloud-momos-foundation` branch, not directly on `main`.
- The initial database migration is additive and does not delete or rewrite legacy customer/order/product records.
- Do not switch production traffic or deploy the new storefront until checkout, server-side order validation, admin permissions, mobile layouts and Supabase RLS are tested.
- The original project currently contains His & Hers Mart-specific catalogue and fixed Dhaka delivery logic; these must be replaced deliberately, not left visible in the Cloud Momos storefront.
- Existing Supabase project contains customer/order/product data. Preserve it; only create backups before any later data transformation.
