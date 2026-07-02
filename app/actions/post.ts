'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getFeedPosts() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    // Get IDs of users the current user is following
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);

    // Fetch posts from following users + own posts
    const posts = await prisma.post.findMany({
      where: {
        userId: {
          in: [...followingIds, userId]
        },
        mediaType: 'IMAGE' // Only images for main feed
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, fullName: true }
        },
        _count: {
          select: { likes: true, comments: true }
        },
        likes: {
          where: { userId } // Check if current user liked it
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const formattedPosts = posts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      user_id: post.userId, // For backwards compatibility with client code
      media_url: post.mediaUrl,
      created_at: post.createdAt,
    }));

    return { success: true, data: formattedPosts };
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    return { success: false, error: 'Failed to fetch feed posts' };
  }
}

export async function getReels() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const reels = await prisma.post.findMany({
      where: { mediaType: 'REEL' },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, fullName: true }
        },
        _count: {
          select: { likes: true, comments: true }
        },
        likes: userId ? { where: { userId } } : false
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const formattedReels = reels.map(reel => ({
      ...reel,
      isLiked: userId ? reel.likes.length > 0 : false,
      likesCount: reel._count.likes,
      commentsCount: reel._count.comments,
      user_id: reel.userId,
      media_url: reel.mediaUrl,
      created_at: reel.createdAt,
    }));

    return { success: true, data: formattedReels };
  } catch (error) {
    console.error('Error fetching reels:', error);
    return { success: false, error: 'Failed to fetch reels' };
  }
}

export async function createPost(data: { caption: string, mediaUrl: string, mediaType: 'IMAGE' | 'VIDEO' | 'REEL' }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const newPost = await prisma.post.create({
      data: {
        caption: data.caption,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        userId: session.user.id
      }
    });

    return { success: true, data: newPost };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: 'Failed to create post' };
  }
}

export async function toggleLike(postId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      return { success: true, data: { isLiked: false } };
    } else {
      await prisma.like.create({
        data: { userId, postId }
      });

      // Optional: create notification for post owner
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
      if (post && post.userId !== userId) {
         await prisma.notification.create({
           data: {
             userId: post.userId,
             type: 'LIKE',
             content: `${session.user.name || (session.user as any).username} liked your post.`
           }
         });
      }

      return { success: true, data: { isLiked: true } };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return { success: false, error: 'Failed to toggle like' };
  }
}

export async function addComment(postId: string, text: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const comment = await prisma.comment.create({
      data: {
        text,
        postId,
        userId: session.user.id
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true }
        }
      }
    });

    return { success: true, data: comment };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: 'Failed to add comment' };
  }
}
