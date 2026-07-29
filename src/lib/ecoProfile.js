import { supabase } from '@/api/supabaseClient';

export async function getOrCreateProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: existing } = await supabase
    .from('eco_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return { user, profile: existing };

  const { data: profile } = await supabase
    .from('eco_profiles')
    .insert({
      user_id: user.id,
      display_name: user.user_metadata?.full_name || 'Eco Hero',
      email: user.email,
      xp: 0,
      eco_points: 0,
      items_recycled: 0,
      plastic_saved_kg: 0,
      co2_reduced_kg: 0,
      streak_days: 1,
      badges: [],
      redeemed_rewards: [],
      favourite_centres: [],
    })
    .select()
    .single();

  return { user, profile };
}
