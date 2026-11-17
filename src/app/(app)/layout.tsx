import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/AppShell';
import { PosDataProvider } from '@/components/providers/PosDataProvider';
import type { ShopProfile } from '@/types/database';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Safe upsert fallback in case trigger was added after account creation
  let { data: profile } = await supabase
    .from('shop_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    const { data: inserted } = await supabase
      .from('shop_profiles')
      .upsert(
        {
          user_id: user.id,
          shop_name:
            (user.user_metadata?.shop_name as string | undefined)?.trim() ||
            'Tạp Hóa Mẹ',
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .maybeSingle();
    profile = inserted;
  }

  const typedProfile = (profile as ShopProfile | null) ?? null;

  return (
    <PosDataProvider initialProfile={typedProfile}>
      <AppShell
        shopName={typedProfile?.shop_name || 'Tạp Hóa Mẹ'}
        userEmail={user.email || ''}
      >
        {children}
      </AppShell>
    </PosDataProvider>
  );
}
