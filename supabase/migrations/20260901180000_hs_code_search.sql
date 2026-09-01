-- ============================================================
-- GTİP/HS kodu araması
--
-- Kod veritabanında "4819.10" gibi noktalı saklanıyor ama alıcı
-- "481910" da yazabiliyor. İki biçimi de yakalamak için normalize
-- edilmiş (yalnızca rakam) türetilmiş kolon üzerinden arıyoruz.
-- ============================================================

alter table products
  add column if not exists hs_code_digits text
    generated always as (
      nullif(regexp_replace(coalesce(hs_code, ''), '[^0-9]', '', 'g'), '')
    ) stored;

create index if not exists products_hs_digits_idx
  on products (hs_code_digits text_pattern_ops);
