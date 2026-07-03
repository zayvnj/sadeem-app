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
        },
        savedBy: {
          where: { userId } // Check if current user saved it
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const formattedPosts = posts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      isSaved: post.savedBy.length > 0,
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
        likes: userId ? { where: { userId } } : false,
        savedBy: userId ? { where: { userId } } : false
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const formattedReels = reels.map(reel => ({
      ...reel,
      isLiked: userId ? reel.likes.length > 0 : false,
      isSaved: userId ? reel.savedBy.length > 0 : false,
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

export async function toggleSave(postId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const existingSave = await prisma.savedPost.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    });

    if (existingSave) {
      await prisma.savedPost.delete({
        where: { id: existingSave.id }
      });
      return { success: true, data: { isSaved: false } };
    } else {
      await prisma.savedPost.create({
        data: { userId, postId }
      });

      return { success: true, data: { isSaved: true } };
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    return { success: false, error: 'Failed to toggle save' };
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

export async function getLikes(postId: string, cursor?: number) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const limit = 20;

    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    });

    let nextCursor: number | null = null;
    if (likes.length > limit) {
      const nextItem = likes.pop();
      nextCursor = nextItem?.id || null;
    }

    // We also need to check follow status if logged in
    let results = likes.map(like => ({ ...like.user, isFollowing: false }));

    if (userId) {
      const followings = await prisma.follow.findMany({
        where: {
          followerId: userId,
          followingId: { in: results.map(u => u.id) }
        }
      });
      const followingIds = new Set(followings.map(f => f.followingId));
      results = results.map(u => ({
        ...u,
        isFollowing: followingIds.has(u.id)
      }));
    }

    return { success: true, data: { users: results, nextCursor } };
  } catch (error) {
    console.error('Error fetching likes:', error);
    return { success: false, error: 'Failed to fetch likes' };
  }
}

export async function getComments(postId: string, cursor?: string) {
  try {
    const session = await auth();
    const limit = 20;

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    });

    let nextCursor: string | null = null;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id || null;
    }

    return { success: true, data: { comments, nextCursor } };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { success: false, error: 'Failed to fetch comments' };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userId: true } } }
    });

    if (!comment) return { success: false, error: 'Comment not found' };

    // Allow if user is comment author OR post owner
    if (comment.userId !== userId && comment.post.userId !== userId) {
      return { success: false, error: 'Unauthorized to delete this comment' };
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
}

export async function deletePost(postId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true }
    });

    if (!post) return { success: false, error: 'Post not found' };

    if (post.userId !== userId) {
      return { success: false, error: 'Unauthorized to delete this post' };
    }

    await prisma.post.delete({ where: { id: postId } });

    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: 'Failed to delete post' };
  }
}
