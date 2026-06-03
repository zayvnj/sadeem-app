'use server'

import { admin } from '@/lib/firebase-admin';
import { supabaseServer } from '@/lib/supabase-server';

async function verifyUser(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getUserContextAction(token?: string) {
  try {
    if (!token) return { success: true, data: { followedIds: [], user: null } };

    const uid = await verifyUser(token);
    if (!uid) return { success: false, error: 'Invalid authentication token' };

    const { data: followsData, error: followsError } = await supabaseServer
      .from('follows')
      .select('following_id')
      .eq('follower_id', uid);

    if (followsError) {
      console.error("Error fetching follows for user context:", followsError);
      return { success: false, error: followsError.message };
    }

    const followedIds = followsData ? followsData.map(f => f.following_id) : [];
    followedIds.push(uid);

    return { success: true, data: { followedIds, user: { uid } } };
  } catch (error: any) {
    console.error('getUserContextAction error:', error);
    return { success: false, error: error.message };
  }
}

export async function getStoriesAction(token?: string) {
  try {
    let uid = null;
    let targetIds: string[] = [];

    if (token) {
      uid = await verifyUser(token);
      if (uid) {
        const { data: followsData } = await supabaseServer
          .from('follows')
          .select('following_id')
          .eq('follower_id', uid);
        targetIds = followsData ? followsData.map(f => f.following_id) : [];
        targetIds.push(uid);
      }
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    let storiesQuery = supabaseServer
      .from('stories')
      .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
      .gt('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: true });

    if (uid && targetIds.length > 0) {
      storiesQuery = storiesQuery.in('user_id', targetIds);
    }

    const { data, error } = await storiesQuery;

    if (error && error.code !== '42P01') {
      console.error('Stories fetch error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getReelsAction(token?: string) {
  try {
    let uid = null;
    let targetIds: string[] = [];

    if (token) {
      uid = await verifyUser(token);
      if (uid) {
        const { data: followsData } = await supabaseServer
          .from('follows')
          .select('following_id')
          .eq('follower_id', uid);
        targetIds = followsData ? followsData.map(f => f.following_id) : [];
        targetIds.push(uid);
      }
    }

    let reelsQuery = supabaseServer
      .from('posts')
      .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
      .eq('type', 'reel')
      .order('created_at', { ascending: false })
      .limit(15);

    if (uid && targetIds.length > 0) {
      reelsQuery = reelsQuery.in('user_id', targetIds);
    }

    const { data, error } = await reelsQuery;

    if (error && error.code !== '42P01') {
      console.error('Reels fetch error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPostsPageAction(token: string | undefined, pageParam: number, limit: number = 10) {
  try {
    let uid = null;
    let targetIds: string[] = [];

    if (token) {
      uid = await verifyUser(token);
      if (uid) {
        const { data: followsData } = await supabaseServer
          .from('follows')
          .select('following_id')
          .eq('follower_id', uid);
        targetIds = followsData ? followsData.map(f => f.following_id) : [];
        targetIds.push(uid);
      }
    }

    let postsQuery = supabaseServer
      .from('posts')
      .select('*, users:user_id(id, full_name, username, avatar_url, is_verified), post_likes(user_id)')
      .eq('type', 'post')
      .order('created_at', { ascending: false })
      .range(pageParam, pageParam + limit - 1);

    if (uid && targetIds.length > 0) {
      postsQuery = postsQuery.in('user_id', targetIds);
    }

    const { data, error } = await postsQuery;

    if (error && error.code !== '42P01') {
      console.error('Posts fetch error:', error);
      return { success: false, error: error.message };
    }

    const formattedPosts = (data || []).map((post: any) => {
      const likesCount = post.post_likes ? post.post_likes.length : 0;
      const isLiked = uid ? post.post_likes?.some((like: any) => like.user_id === uid) : false;
      return { ...post, likes_count: likesCount, isLiked };
    });

    return {
      success: true,
      data: formattedPosts,
      nextCursor: data?.length === limit ? pageParam + limit : null
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
