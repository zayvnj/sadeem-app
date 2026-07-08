'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/session';

export async function searchUsers(query: string) {
  try {
    if (!query.trim()) return { success: true, data: [] };

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isVerified: true
      },
      take: 20
    });

    // Make sure we return plain objects without any potentially non-serializable properties
    const serializedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified
    }));

    return { success: true, data: serializedUsers };
  } catch (error) {
    console.error('Error searching users:', error);
    return { success: false, error: 'Failed to search users' };
  }
}

export async function updateLastActive() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActive: new Date() }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating last active:', error);
    return { success: false, error: 'Failed to update last active' };
  }
}

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
        isVerified: true,
        isProfessional: true,
        professionalCategory: true,
        lastActive: true,
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

export async function toggleVerification(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: 'User not found' };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: !user.isVerified }
    });

    return { success: true, data: { isVerified: updatedUser.isVerified } };
  } catch (error) {
    console.error('Error toggling verification:', error);
    return { success: false, error: 'Failed to toggle verification' };
  }
}

export async function updateUserProfile(data: { fullName?: string, username?: string, bio?: string, avatarUrl?: string, coverUrl?: string, isProfessional?: boolean, professionalCategory?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    if (data.username !== undefined) {
      const isAdmin = session.user.role === 'ADMIN';
      if (!isAdmin) {
        if (data.username.length < 4 || data.username.length > 14) {
          return { success: false, error: 'يجب أن يكون طول اسم المستخدم بين 4 و 14 حرفاً' };
        }
      }
    }

    const updateData: any = { ...data };
    // Maintain compatibility with coverImage field if present in UI mapping
    if (data.coverUrl) {
      updateData.coverImage = data.coverUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });

    return { success: true, data: updatedUser };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    if (error?.code === 'P2002' && error?.meta?.target?.includes('username')) {
      return { success: false, error: 'اسم المستخدم هذا محجوز مسبقاً، يرجى اختيار اسم آخر' };
    }
    // Return detailed error message for UI feedback instead of generic string
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
    return { success: false, error: errorMessage || 'Failed to update profile' };
  }
}

export async function checkFollowStatus(followingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const currentUserId = session.user.id;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId
        }
      }
    });

    const followedBy = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followingId,
          followingId: currentUserId
        }
      }
    });

    return { success: true, data: { isFollowing: !!follow, isFollowedBy: !!followedBy } };
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

export async function getNotifications() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: 'Failed to fetch notifications' };
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
