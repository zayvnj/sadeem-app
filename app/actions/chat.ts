'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function findOrCreateChat(otherUserId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    // Look for existing chat between these two users
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: userId } } },
          { participants: { some: { id: otherUserId } } }
        ]
      }
    });

    if (existingChat) {
      return { success: true, data: { chatId: existingChat.id } };
    }

    // Create new chat
    const newChat = await prisma.chat.create({
      data: {
        participants: {
          connect: [{ id: userId }, { id: otherUserId }]
        }
      }
    });

    return { success: true, data: { chatId: newChat.id } };
  } catch (error) {
    console.error('Error finding or creating chat:', error);
    return { success: false, error: 'Failed to initiate chat' };
  }
}

export async function getChats() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        participants: { some: { id: userId } }
      },
      include: {
        participants: {
          where: { id: { not: userId } },
          select: { id: true, username: true, avatarUrl: true, fullName: true, isOnline: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: userId }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const result = chats.map(chat => {
      const otherUser = chat.participants[0];
      return {
        id: chat.id,
        user: otherUser,
        lastMessage: chat.messages[0] || null,
        unreadCount: chat._count.messages
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching chats:', error);
    return { success: false, error: 'Failed to fetch chats' };
  }
}

export async function getMessages(chatId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    // Verify user is part of chat
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: { some: { id: userId } }
      }
    });

    if (!chat) return { success: false, error: 'Chat not found' };

    const messages = await prisma.message.findMany({
      where: { chat_id: chatId },
      orderBy: { createdAt: 'asc' }
    });

    // Mark received messages as read
    const unreadIds = messages
      .filter(m => m.senderId !== userId && !m.isRead)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { isRead: true }
      });
    }

    return { success: true, data: messages };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

export async function sendMessage(chatId: string, text?: string, mediaUrl?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    if (!text && !mediaUrl) {
      return { success: false, error: 'Message cannot be empty' };
    }

    const newMessage = await prisma.message.create({
      data: {
        text,
        mediaUrl,
        senderId: session.user.id,
        chat_id: chatId
      }
    });

    // Update chat updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return { success: true, data: newMessage };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'Failed to send message' };
  }
}
