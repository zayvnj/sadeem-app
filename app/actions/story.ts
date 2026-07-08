'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/session';

export async function getStories() {
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
    const targetIds = [...followingIds, userId];

    // Get active stories (not expired)
    const activeStories = await prisma.story.findMany({
      where: {
        userId: { in: targetIds },
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, fullName: true }
        },
        _count: {
          select: { likes: true }
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first within a user's group
    });

    // Fetch views for these stories by the current user
    const storyIds = activeStories.map(s => s.id);
    const viewedStories = await prisma.storyView.findMany({
      where: {
        userId: userId,
        storyId: { in: storyIds }
      }
    });
    const viewedStoryIds = new Set(viewedStories.map(v => v.storyId));

    // Fetch likes for these stories by the current user
    const likedStories = await prisma.like.findMany({
      where: {
        userId: userId,
        storyId: { in: storyIds }
      }
    });
    const likedStoryIds = new Set(likedStories.map(l => l.storyId));

    // Group stories by user
    const groupedStories = activeStories.reduce((acc: any, story) => {
      if (!acc[story.userId]) {
        acc[story.userId] = {
          id: story.userId, // Group ID is user ID
          user: story.user,
          stories: [],
          hasUnseen: false // Will be determined by individual stories
        };
      }

      const isViewed = viewedStoryIds.has(story.id);
      if (!isViewed) {
        acc[story.userId].hasUnseen = true;
      }

      acc[story.userId].stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        isViewed: isViewed,
        isLiked: likedStoryIds.has(story.id),
        likesCount: story._count.likes
      });
      return acc;
    }, {});

    const result = Object.values(groupedStories);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching stories:', error);
    return { success: false, error: 'Failed to fetch stories' };
  }
}

export async function createStory(mediaUrl: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    const newStory = await prisma.story.create({
      data: {
        mediaUrl,
        expiresAt,
        userId: session.user.id
      }
    });

    return { success: true, data: newStory };
  } catch (error) {
    console.error('Error creating story:', error);
    return { success: false, error: 'Failed to create story' };
  }
}

export async function markStoryAsViewed(storyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    await prisma.storyView.upsert({
      where: {
        userId_storyId: {
          userId: session.user.id,
          storyId
        }
      },
      update: {},
      create: {
        userId: session.user.id,
        storyId
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    return { success: false, error: 'Failed to mark story as viewed' };
  }
}

export async function toggleStoryLike(storyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_storyId: { userId, storyId }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      return { success: true, data: { isLiked: false } };
    } else {
      await prisma.like.create({
        data: { userId, storyId }
      });

      // Optional: create notification for story owner
      const story = await prisma.story.findUnique({ where: { id: storyId }, select: { userId: true } });
      if (story && story.userId !== userId) {
         await prisma.notification.create({
           data: {
             userId: story.userId,
             type: 'LIKE',
             content: `${session.user.name || (session.user as any).username} أعجب بقصتك.`
           }
         });
      }

      return { success: true, data: { isLiked: true } };
    }
  } catch (error) {
    console.error('Error toggling story like:', error);
    return { success: false, error: 'Failed to toggle like' };
  }
}

export async function getStoryViewers(storyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const views = await prisma.storyView.findMany({
      where: { storyId },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: views };
  } catch (error) {
    console.error('Error fetching story viewers:', error);
    return { success: false, error: 'Failed to fetch viewers' };
  }
}

export async function getStoryArchive(cursor?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;
    const limit = 30;

    // Fetch ALL of the current user's stories, including expired ones (archive)
    const stories = await prisma.story.findMany({
      where: { userId },
      include: {
        _count: { select: { likes: true, views: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    });

    let nextCursor: string | null = null;
    if (stories.length > limit) {
      const nextItem = stories.pop();
      nextCursor = nextItem?.id || null;
    }

    const now = new Date();
    const formatted = stories.map(story => ({
      id: story.id,
      mediaUrl: story.mediaUrl,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      isExpired: story.expiresAt < now,
      likesCount: story._count.likes,
      viewsCount: story._count.views
    }));

    return { success: true, data: formatted, nextCursor };
  } catch (error) {
    console.error('Error fetching story archive:', error);
    return { success: false, error: 'Failed to fetch story archive' };
  }
}

export async function deleteStory(storyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) return { success: false, error: 'Story not found' };
    if (story.userId !== session.user.id) return { success: false, error: 'Unauthorized to delete this story' };

    await prisma.story.delete({
      where: { id: storyId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting story:', error);
    return { success: false, error: 'Failed to delete story' };
  }
}
