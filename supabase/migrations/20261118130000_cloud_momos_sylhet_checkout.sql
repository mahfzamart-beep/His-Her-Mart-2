-- Cloud Momos: server-authoritative Sylhet-area checkout.
CREATE OR REPLACE FUNCTION public.create_guest_order(
 p_customer_name text,p_customer_phone text,p_customer_email text,
 p_shipping_address jsonb,p_items jsonb,p_accept_unboxing_policy boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
declare
 v_name text:=btrim(coalesce(p_customer_name,''));
 v_phone text:=regexp_replace(coalesce(p_customer_phone,''),'[[:space:]()-]','','g');
 v_order_id uuid; v_order_number text; v_subtotal numeric(12,2):=0;
 v_delivery_charge numeric(12,2); v_area_id uuid; v_area_name text;
 v_item jsonb; v_line jsonb; v_product public.products%rowtype;
 v_quantity integer; v_recent_count integer; v_lines jsonb:='[]'::jsonb;
begin
 if char_length(v_name)<2 or char_length(v_name)>100 then raise exception 'Please enter a valid customer name.' using errcode='22023'; end if;
 if v_phone !~ '^(?:\+?88)?01[3-9][0-9]{8}$' then raise exception 'Please enter a valid Bangladesh mobile number.' using errcode='22023'; end if;
 if p_customer_email is not null and (char_length(p_customer_email)>254 or p_customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Please enter a valid customer email.' using errcode='22023'; end if;
 if jsonb_typeof(p_shipping_address) is distinct from 'object' or char_length(btrim(coalesce(p_shipping_address->>'address_line','')))<5 then raise exception 'Please provide your complete delivery address.' using errcode='22023'; end if;
 if coalesce(p_shipping_address->>'delivery_area_id','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Please select a valid Sylhet delivery area.' using errcode='22023'; end if;
 v_area_id:=(p_shipping_address->>'delivery_area_id')::uuid;
 select name,delivery_charge into v_area_name,v_delivery_charge from public.delivery_areas where id=v_area_id and city='Sylhet' and is_active=true for share;
 if not found then raise exception 'This delivery area is not currently available.' using errcode='22023'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>15 then raise exception 'Your box is empty or contains too many products.' using errcode='22023'; end if;
 if p_accept_unboxing_policy is distinct from true then raise exception 'Please accept the unboxing video notice.' using errcode='22023'; end if;
 for v_item in select value from jsonb_array_elements(p_items) as items(value) loop
  if coalesce(v_item->>'product_id','') !~ '^[0-9a-fA-F-]{36}$' or coalesce(v_item->>'quantity','') !~ '^[0-9]+$' then raise exception 'The box contains an invalid product.' using errcode='22023'; end if;
  v_quantity:=(v_item->>'quantity')::integer;
  if v_quantity<1 or v_quantity>10 then raise exception 'A product quantity must be between 1 and 10 boxes.' using errcode='22023'; end if;
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid and is_active=true for update;
  if not found then raise exception 'One of the selected products is no longer available.' using errcode='P0002'; end if;
  if v_product.price<=0 then raise exception 'A selected product does not have a confirmed price yet.' using errcode='22023'; end if;
  if v_product.stock_quantity<v_quantity then raise exception 'Not enough stock for %.',v_product.name using errcode='P0001'; end if;
  update public.products set stock_quantity=stock_quantity-v_quantity,updated_at=now() where id=v_product.id;
  v_subtotal:=v_subtotal+(v_product.price*v_quantity);
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object('product_id',v_product.id,'product_name',v_product.name,'product_sku',v_product.sku,'unit_price',v_product.price,'quantity',v_quantity,'line_total',v_product.price*v_quantity,'fulfillment_source','own_stock'));
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(v_phone,0));
 delete from private.guest_order_attempts where created_at<now()-interval '24 hours';
 select count(*) into v_recent_count from private.guest_order_attempts where phone=v_phone and created_at>now()-interval '15 minutes';
 if v_recent_count>=3 then raise exception 'Too many orders from this phone number. Please try again in 15 minutes.' using errcode='P0001'; end if;
 insert into private.guest_order_attempts(phone) values(v_phone);
 v_order_number:='CM-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 insert into public.orders(order_number,customer_id,customer_name,customer_phone,customer_email,shipping_address,subtotal,delivery_charge,discount,total,payment_method,payment_status,order_status,customer_note,unboxing_policy_version,unboxing_notice_accepted_at,free_shipping_applied,free_shipping_eligible_quantity)
 values(v_order_number,null,v_name,v_phone,nullif(btrim(coalesce(p_customer_email,'')),''),jsonb_build_object('city','Sylhet','delivery_area_id',v_area_id,'delivery_area_name',v_area_name,'address_line',btrim(p_shipping_address->>'address_line')),v_subtotal,v_delivery_charge,0,v_subtotal+v_delivery_charge,'cod','pending','pending','Delivery area: '||v_area_name||'. Delivery charge: BDT '||v_delivery_charge||'.','cloud-momos-unboxing-v1',now(),false,0)
 returning id into v_order_id;
 for v_line in select value from jsonb_array_elements(v_lines) as lines(value) loop
  insert into public.order_items(order_id,product_id,product_name,product_sku,unit_price,quantity,line_total,fulfillment_source)
  values(v_order_id,(v_line->>'product_id')::uuid,v_line->>'product_name',v_line->>'product_sku',(v_line->>'unit_price')::numeric,(v_line->>'quantity')::integer,(v_line->>'line_total')::numeric,'own_stock');
 end loop;
 return jsonb_build_object('order_number',v_order_number,'subtotal',v_subtotal,'delivery_charge',v_delivery_charge,'total',v_subtotal+v_delivery_charge,'order_status','pending','payment_method','cod','delivery_area',v_area_name);
end;
$function$;
REVOKE ALL ON FUNCTION public.create_guest_order(text,text,text,jsonb,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(text,text,text,jsonb,jsonb,boolean) TO service_role;