select setval(
  pg_get_serial_sequence('public.public_property_name', 'id'),
  (select coalesce(max(id), 0) + 1 from public.public_property_name),
  false
);

select setval(
  pg_get_serial_sequence('public.public_property_value', 'id'),
  (select coalesce(max(id), 0) + 1 from public.public_property_value),
  false
);
