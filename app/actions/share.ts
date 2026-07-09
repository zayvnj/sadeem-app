'use server';

import prisma from '@/lib/prisma';

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  isVerified: true,
} as const;

/**
 * Resolves shared content (post / reel / story) for rendering inside chats
 * and for the full-screen overlay when a shared item is tapped.
 */
export async function getSharedContent(type: 'POST' | 'REEL' | 'STORY', id: string) {
  try {
    if (type === 'POST') {
      const post = await prisma.post.findUnique({
        where: { id },
        include: { user: { select: userSelect } },
      });
      if (!post) return { success: false, error: 'Content not found' };
      return { success: true, data: { type, ...post } };
    }

    if (type === 'REEL') {
      const reel = await prisma.reel.findUnique({
        where: { id },
        include: { author: { select: userSelect } },
      });
      if (!reel) return { success: false, error: 'Content not found' };
      return { success: true, data: { type, ...reel, user: reel.author } };
    }

    if (type === 'STORY') {
      const story = await prisma.story.findUnique({
        where: { id },
        include: { user: { select: userSelect } },
      });
      if (!story) return { success: false, error: 'Content not found' };
      return {
        success: true,
        data: { type, ...story, expired: story.expiresAt < new Date() },
      };
    }

    return { success: false, error: 'Unknown content type' };
  } catch (error) {
    console.error('Error fetching shared content:', error);
    return { success: false, error: 'Failed to fetch shared content' };
  }
}
