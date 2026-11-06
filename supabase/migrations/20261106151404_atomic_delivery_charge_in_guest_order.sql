CREATE OR REPLACE FUNCTION public.create_guest_order(p_customer_name text, p_customer_phone text, p_customer_email text, p_shipping_address jsonb, p_items jsonb, p_accept_unboxing_policy boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[[:space:]()-]', '', 'g');
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_delivery_charge numeric(12,2) := 0;
  v_item jsonb;
  v_line jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_recent_count integer;
  v_eligible_quantity integer := 0;
  v_free_shipping_applied boolean := false;
  v_lines jsonb := '[]'::jsonb;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Please enter a valid customer name.' using errcode = '22023';
  end if;

  if v_phone !~ '^(?:\+?88)?01[3-9][0-9]{8}$' then
    raise exception 'Please enter a valid Bangladesh mobile number.' using errcode = '22023';
  end if;

  if p_customer_email is not null and char_length(p_customer_email) > 254 then
    raise exception 'Email address is too long.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_shipping_address) is distinct from 'object'
     or char_length(btrim(coalesce(p_shipping_address->>'district',''))) < 2
     or char_length(btrim(coalesce(p_shipping_address->>'address_line',''))) < 5 then
    raise exception 'Please provide a district and complete delivery address.' using errcode = '22023';
  end if;

  if coalesce(p_shipping_address->>'delivery_zone','') not in ('inside_dhaka','outside_dhaka') then
    raise exception 'Please select a valid delivery area.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 15 then
    raise exception 'Your cart is empty or contains too many different products.' using errcode = '22023';
  end if;

  if p_accept_unboxing_policy is distinct from true then
    raise exception 'Please read and accept the unboxing video notice.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value)
  loop
    if coalesce(v_item->>'product_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or coalesce(v_item->>'quantity','') !~ '^[0-9]+$' then
      raise exception 'The cart contains an invalid product.' using errcode = '22023';
    end if;

    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'A product quantity must be between 1 and 10.' using errcode = '22023';
    end if;

    select * into v_product
      from public.products
      where id = (v_item->>'product_id')::uuid
        and is_active = true
      for update;

    if not found then
      raise exception 'One of the selected products is no longer available.' using errcode = 'P0002';
    end if;

    if v_product.stock_quantity < v_quantity then
      raise exception 'Not enough stock for %.', v_product.name using errcode = 'P0001';
    end if;

    if v_product.free_shipping_eligible then
      v_eligible_quantity := v_eligible_quantity + v_quantity;
    end if;

    update public.products
      set stock_quantity = stock_quantity - v_quantity,
          updated_at = now()
      where id = v_product.id;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_sku', v_product.sku,
      'unit_price', v_product.price,
      'quantity', v_quantity,
      'line_total', v_product.price * v_quantity,
      'fulfillment_source', v_product.fulfillment_source,
      'supplier_product_code', v_product.supplier_product_code,
      'supplier_product_url', v_product.supplier_product_url
    ));
  end loop;

  v_free_shipping_applied := v_eligible_quantity >= 3;
  v_delivery_charge := case
    when v_free_shipping_applied then 0
    when p_shipping_address->>'delivery_zone' = 'inside_dhaka' then 80
    else 150
  end;

  perform pg_advisory_xact_lock(hashtextextended(v_phone, 0));
  delete from private.guest_order_attempts
    where created_at < now() - interval '24 hours';
  select count(*) into v_recent_count
    from private.guest_order_attempts
    where phone = v_phone and created_at > now() - interval '15 minutes';
  if v_recent_count >= 3 then
    raise exception 'Too many orders from this phone number. Please try again in 15 minutes.' using errcode = 'P0001';
  end if;
  insert into private.guest_order_attempts (phone) values (v_phone);

  v_order_number := 'HHM-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (
    order_number, customer_id, customer_name, customer_phone, customer_email,
    shipping_address, subtotal, delivery_charge, discount, total,
    payment_method, payment_status, order_status, customer_note,
    unboxing_policy_version, unboxing_notice_accepted_at,
    free_shipping_applied, free_shipping_eligible_quantity
  ) values (
    v_order_number, null, v_name, v_phone, nullif(btrim(coalesce(p_customer_email,'')), ''),
    p_shipping_address, v_subtotal, v_delivery_charge, 0, v_subtotal + v_delivery_charge,
    'cod', 'pending', 'pending',
    case when v_free_shipping_applied
      then 'Free shipping applied: 3 or more units from selected eligible products.'
      when p_shipping_address->>'delivery_zone' = 'inside_dhaka'
      then 'Inside Dhaka delivery charge: BDT 80.'
      else 'Outside Dhaka delivery charge: BDT 150.'
    end,
    'unboxing-video-v1', now(),
    v_free_shipping_applied, v_eligible_quantity
  )
  returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(v_lines) as lines(value)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, product_sku,
      unit_price, quantity, line_total,
      fulfillment_source, supplier_product_code, supplier_product_url
    ) values (
      v_order_id,
      (v_line->>'product_id')::uuid,
      v_line->>'product_name',
      v_line->>'product_sku',
      (v_line->>'unit_price')::numeric,
      (v_line->>'quantity')::integer,
      (v_line->>'line_total')::numeric,
      coalesce(v_line->>'fulfillment_source','own_stock'),
      v_line->>'supplier_product_code',
      v_line->>'supplier_product_url'
    );
  end loop;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_charge', v_delivery_charge,
    'total', v_subtotal + v_delivery_charge,
    'order_status', 'pending',
    'payment_method', 'cod',
    'free_shipping_applied', v_free_shipping_applied,
    'free_shipping_eligible_quantity', v_eligible_quantity,
    'delivery_charge_note', case when v_free_shipping_applied
      then 'Free shipping applied.'
      when p_shipping_address->>'delivery_zone' = 'inside_dhaka'
      then 'Inside Dhaka delivery charge: BDT 80.'
      else 'Outside Dhaka delivery charge: BDT 150.'
    end
  );
end;
$function$
