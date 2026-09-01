import { createClient } from '@/lib/supabase/server'

export interface ConversationRow {
  id: string
  buyer_id: string
  company_id: string
  product_id: string | null
  rfq_id: string | null
  last_message_at: string
  company: { id: string; name: string; slug: string; logo_url: string | null } | null
  product: { id: string; title: string; slug: string } | null
  buyer: { id: string; full_name: string | null } | null
  messages: { body: string; created_at: string; sender_id: string; read_at: string | null }[]
}

/**
 * Kullanıcının görüşmeleri. RLS gereği yalnızca taraf olduğu kayıtlar
 * döner; alıcı ve tedarikçi aynı sorguyu kullanır.
 */
export async function getConversations() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('conversations')
    .select(
      `id, buyer_id, company_id, product_id, rfq_id, last_message_at,
       company:companies ( id, name, slug, logo_url ),
       product:products ( id, title, slug ),
       buyer:profiles ( id, full_name ),
       messages ( body, created_at, sender_id, read_at )`
    )
    .order('last_message_at', { ascending: false })

  return ((data ?? []) as unknown as ConversationRow[]).map((c) => ({
    ...c,
    // Son mesajı önizleme için ayır.
    messages: [...c.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }))
}

export async function getConversation(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('conversations')
    .select(
      `id, buyer_id, company_id, product_id, rfq_id, last_message_at,
       company:companies ( id, name, slug, logo_url, verified ),
       product:products ( id, title, slug, images ),
       buyer:profiles ( id, full_name )`
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) return null

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return { conversation: data, messages: messages ?? [] }
}
