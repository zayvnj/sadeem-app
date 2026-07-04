"use client"

import { useEffect, useState } from "react"
import { Bell, Heart, MessageCircle, UserPlus, Loader2 } from "lucide-react"
import { getNotifications } from "@/app/actions/user"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

export function NotificationsView() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await getNotifications();
        if (res.success && res.data) {
          setNotifications(res.data);
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadNotifications();
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return Heart;
      case 'COMMENT': return MessageCircle;
      case 'FOLLOW': return UserPlus;
      default: return Bell;
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'LIKE': return 'text-red-500';
      case 'COMMENT': return 'text-blue-500';
      case 'FOLLOW': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }

  return (
    <div className="flex flex-col h-full bg-background pb-20">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold mb-4">الإشعارات</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 [scrollbar-width:none]">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Bell className="size-10 mb-2 opacity-50" />
            <p>لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = getIcon(notif.type)
            return (
              <div key={notif.id} className={`flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm ${!notif.isRead ? 'bg-secondary/20' : ''}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary ${getColor(notif.type)}`}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{notif.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
