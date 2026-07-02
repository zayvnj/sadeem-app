'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

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
        }
      },
      orderBy: { createdAt: 'asc' } // Oldest first within a user's group
    });

    // Group stories by user
    const groupedStories = activeStories.reduce((acc: any, story) => {
      if (!acc[story.userId]) {
        acc[story.userId] = {
          id: story.userId, // Group ID is user ID
          user: story.user,
          stories: [],
          hasUnseen: true // Simplified: Assume true for now unless we implement seen tracking
        };
      }
      acc[story.userId].stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt
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
