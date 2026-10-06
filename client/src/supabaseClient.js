import { createClient } from "@supabase/supabase-js";

// Essas duas variáveis vêm do build (Vite as injeta em tempo de build a
// partir das variáveis de ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// A "anon key" é pública por design do Supabase -- pode ficar exposta no
// navegador. NUNCA coloque aqui a "service_role key" (essa é só do backend).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Extrai nome/e-mail/foto de uma sessão do Supabase Auth. Prioriza
// identities[].identity_data (o perfil cru que o Google devolveu no OAuth)
// porque às vezes é mais completo do que o user_metadata já processado.
export function googleProfileFromUser(user) {
  if (!user) return null;
  const identity = (user.identities || []).find(i => i.provider === "google");
  const idData = identity?.identity_data || {};
  const meta = user.user_metadata || {};
  return {
    name: idData.full_name || idData.name || meta.full_name || meta.name || "",
    email: user.email || idData.email || "",
    avatarUrl: idData.avatar_url || idData.picture || meta.avatar_url || meta.picture || "",
  };
}
