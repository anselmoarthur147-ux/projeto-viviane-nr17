import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@/integrations/supabase/types';
import 'dotenv/config';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env variables');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1️⃣ Sign up/auth user (will create if not exists)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'loginvivianedash@gmail.com',
    password: 'dashviviane01',
    options: { emailRedirectTo: 'https://your-app-url.com/login' },
  });
  if (signUpError && signUpError.message?.includes('User already registered')) {
    console.log('User already exists, proceeding to insertion of admin record');
  } else if (signUpError) {
    throw signUpError;
  }

  // 2️⃣ Insert admin profile
  const adminRecord = {
    id: uuidv4(),
    nome: 'Viviane Admin',
    email: 'loginvivianedash@gmail.com',
    setor: 'Diretoria',
    secao: 'Operações',
    cargo: 'Administrador',
    ativo: true,
  };

  const { error: insertError } = await supabase.from('admin').upsert(adminRecord as any, { onConflict: 'email' });
  if (insertError) throw insertError;

  console.log('✅ Usuário admin inicial criado/atualizado com sucesso');
}

main().catch((e) => {
  console.error('❌ Erro ao criar admin inicial:', e);
  process.exit(1);
});
