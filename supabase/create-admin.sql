-- ============================================================
-- ÜRETİMDE İLK YÖNETİCİ HESABI
--
-- Supabase Dashboard > SQL Editor'e yapıştırın.
-- Aşağıdaki İKİ SATIRI kendi bilgilerinizle değiştirin.
--
-- Neden SQL: e-posta doğrulaması açıkken ve Site URL ayarlı değilken
-- normal kayıt akışı kırık. Bu betik hesabı doğrulanmış olarak
-- doğrudan oluşturur, böylece hemen giriş yapabilirsiniz.
--
-- Tekrar çalıştırmak güvenlidir: aynı e-posta varsa yalnızca şifreyi
-- ve rolü günceller.
-- ============================================================

do $$
declare
  -- ↓↓↓ DEĞİŞTİRİN ↓↓↓
  v_email    text := 'ionbretonweb@gmail.com';
  v_password text := 'DegistirBunu123!';
  v_name     text := 'Supsto Yönetici';
  -- ↑↑↑ DEĞİŞTİRİN ↑↑↑
  v_id uuid;
begin
  select id into v_id from auth.users where email = lower(v_email);

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- GoTrue bu kolonları Go'da `string` okur; NULL bırakılırsa
      -- girişte "converting NULL to string is unsupported" hatası verir.
      confirmation_token, recovery_token, email_change_token_new,
      email_change_token_current, email_change, phone_change,
      phone_change_token, reauthentication_token
    ) values (
      v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      lower(v_email), extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', v_name, 'role', 'admin'),
      now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', lower(v_email), 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict (provider_id, provider) do nothing;

    raise notice 'Yeni yönetici oluşturuldu: %', v_email;
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           confirmation_token = coalesce(confirmation_token, ''),
           recovery_token = coalesce(recovery_token, ''),
           email_change_token_new = coalesce(email_change_token_new, ''),
           email_change_token_current = coalesce(email_change_token_current, ''),
           email_change = coalesce(email_change, ''),
           phone_change = coalesce(phone_change, ''),
           phone_change_token = coalesce(phone_change_token, ''),
           reauthentication_token = coalesce(reauthentication_token, ''),
           updated_at = now()
     where id = v_id;
    raise notice 'Mevcut hesabın şifresi güncellendi: %', v_email;
  end if;

  -- Profil (handle_new_user tetikleyicisi açmış olabilir) ve admin rolü.
  insert into public.profiles (id, full_name, role)
  values (v_id, v_name, 'admin')
  on conflict (id) do update set role = 'admin', full_name = excluded.full_name;
end $$;

select u.email, p.role, u.email_confirmed_at is not null as onayli
  from auth.users u join public.profiles p on p.id = u.id
 where p.role = 'admin';
