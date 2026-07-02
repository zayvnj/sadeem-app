'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function getChats() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    // Get all messages where the user is sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true, fullName: true, isOnline: true } },
        receiver: { select: { id: true, username: true, avatarUrl: true, fullName: true, isOnline: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by conversation
    const conversationsMap = new Map();

    messages.forEach(msg => {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          id: otherUser.id, // Using other user's ID as conversation ID for simplicity
          user: otherUser,
          lastMessage: msg,
          unreadCount: (msg.receiverId === userId && !msg.isRead) ? 1 : 0
        });
      } else if (msg.receiverId === userId && !msg.isRead) {
         const conv = conversationsMap.get(otherUser.id);
         conv.unreadCount += 1;
      }
    });

    const result = Array.from(conversationsMap.values());

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching chats:', error);
    return { success: false, error: 'Failed to fetch chats' };
  }
}

export async function getMessages(otherUserId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark received messages as read
    const unreadIds = messages
      .filter(m => m.receiverId === userId && !m.isRead)
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

export async function sendMessage(receiverId: string, text?: string, mediaUrl?: string) {
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
        receiverId
      }
    });

    return { success: true, data: newMessage };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'Failed to send message' };
  }
}
