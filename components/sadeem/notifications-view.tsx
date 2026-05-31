"use client"

import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react"

export function NotificationsView() {
  const notifications = [
    { id: 1, type: "like", user: "أحمد", text: "أعجب بمنشورك", time: "منذ ساعتين", icon: Heart, color: "text-red-500" },
    { id: 2, type: "comment", user: "سارة", text: "علقت على صورتك: روعة!", time: "منذ 4 ساعات", icon: MessageCircle, color: "text-blue-500" },
    { id: 3, type: "follow", user: "علي", text: "بدأ بمتابعتك", time: "منذ يوم", icon: UserPlus, color: "text-green-500" },
    { id: 4, type: "like", user: "نور", text: "أعجبت بالريلز الخاص بك", time: "منذ يومين", icon: Heart, color: "text-red-500" },
  ]

  return (
    <div className="flex flex-col h-full bg-background pb-20">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold mb-4">الإشعارات</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 [scrollbar-width:none]">
        {notifications.map((notif) => (
          <div key={notif.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className={`flex size-10 items-center justify-center rounded-full bg-secondary ${notif.color}`}>
              <notif.icon className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold">{notif.user}</span> {notif.text}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
