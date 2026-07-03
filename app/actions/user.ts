'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        _count: {
          select: { followers: true, following: true }
        }
      }
    });

    if (!user) return { success: false, error: 'User not found' };

    return {
      success: true,
      data: {
        ...user,
        followersCount: user._count.followers,
        followingCount: user._count.following,
      }
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { success: false, error: 'Failed to fetch user profile' };
  }
}

export async function updateUserProfile(data: { fullName?: string, username?: string, bio?: string, avatarUrl?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data
    });

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

export async function checkFollowStatus(followingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId
        }
      }
    });

    return { success: true, data: { isFollowing: !!follow } };
  } catch (error) {
    console.error('Error checking follow status:', error);
    return { success: false, error: 'Failed to check follow status' };
  }
}

export async function toggleFollow(followingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const followerId = session.user.id;

    if (followerId === followingId) {
      return { success: false, error: 'You cannot follow yourself' };
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId }
      }
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      });
      return { success: true, data: { isFollowing: false } };
    } else {
      await prisma.follow.create({
        data: { followerId, followingId }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: followingId,
          type: 'FOLLOW',
          content: `${session.user.name || (session.user as any).username} started following you`
        }
      });

      return { success: true, data: { isFollowing: true } };
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return { success: false, error: 'Failed to toggle follow' };
  }
}

export async function deleteUserAccount() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    await prisma.user.delete({
      where: { id: session.user.id }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: 'Failed to delete account' };
  }
}

export async function getUserPosts(userId: string) {
  try {
    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    const formattedPosts = posts.map(post => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      media_url: post.mediaUrl,
    }));

    return { success: true, data: formattedPosts };
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return { success: false, error: 'Failed to fetch user posts' };
  }
}

export async function getSavedPosts(cursor?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;
    const limit = 20;

    const savedPosts = await prisma.savedPost.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, fullName: true } },
            _count: { select: { likes: true, comments: true } },
            likes: { where: { userId } },
            savedBy: { where: { userId } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      // SavedPost has an Int id, so cursor should be Int if we use it properly,
      // but let's just do skip for simple pagination or assume we pass Int cursor.
      // Assuming we'll pass cursor as the stringified Int ID or use standard offset for now.
    });

    // Fallback simple implementation without cursor for SavedPosts initially
    // Since cursor type differs

    return {
      success: true,
      data: savedPosts.map(sp => ({
        ...sp.post,
        isLiked: sp.post.likes.length > 0,
        isSaved: sp.post.savedBy.length > 0,
        likesCount: sp.post._count.likes,
        commentsCount: sp.post._count.comments,
        media_url: sp.post.mediaUrl
      }))
    };
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    return { success: false, error: 'Failed to fetch saved posts' };
  }
}
