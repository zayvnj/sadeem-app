'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getUserStories(userId: string) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await prisma.story.findMany({
      where: {
        userId: userId,
        createdAt: { gt: oneDayAgo }
      },
      include: {
        user: {
          select: { id: true, fullName: true, username: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedStories = stories.map(story => ({
      ...story,
      user_id: story.userId,
      media_url: story.mediaUrl,
      created_at: story.createdAt.toISOString(),
      users: {
        ...story.user,
        full_name: story.user.fullName || story.user.username,
        avatar_url: story.user.avatarUrl
      }
    }));

    return { success: true, data: formattedStories };
  } catch (error) {
    console.error('Error fetching user stories:', error);
    return { success: false, error: 'Failed to fetch user stories' };
  }
}
