'use server'

import { admin } from '@/lib/firebase-admin';
import { supabaseServer } from '@/lib/supabase-server';

export async function toggleFollowAction(token: string, followingId: string, isFollowing: boolean) {
  try {
    // 1. Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const followerId = decodedToken.uid;

    if (!followerId) {
      return { success: false, error: 'Invalid authentication token' };
    }

    // 2. Perform DB operation with Service Role Key
    if (isFollowing) {
      // Unfollow request
      const { error } = await supabaseServer
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);

      if (error) {
        console.error('Supabase unfollow error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data: false }; // false indicates no longer following
    } else {
      // Follow request
      const { error } = await supabaseServer
        .from("follows")
        .insert({ follower_id: followerId, following_id: followingId });

      if (error) {
        console.error('Supabase follow error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data: true }; // true indicates now following
    }
  } catch (error: any) {
    console.error('toggleFollowAction error:', error);
    return { success: false, error: error.message || 'Server error processing follow toggle' };
  }
}
