import { useEffect, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Info, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Notification = {
  id: string;
  type: "success" | "info" | "warning" | "achievement";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const getIcon = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    case "warning":
      return <AlertCircle className="w-6 h-6 text-orange-500" />;
    case "achievement":
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    default:
      return <Info className="w-6 h-6 text-blue-500" />;
  }
};

const getBgColor = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return "bg-green-500/10 border-green-500/30";
    case "warning":
      return "bg-orange-500/10 border-orange-500/30";
    case "achievement":
      return "bg-yellow-500/10 border-yellow-500/30";
    default:
      return "bg-blue-500/10 border-blue-500/30";
  }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Gagal memuat notifikasi:", error);
        toast({ title: "Gagal memuat notifikasi", description: error.message, variant: "destructive" });
      } else {
        setNotifications(
          data.map((row) => ({
            id: row.id,
            type: row.type as Notification["type"],
            title: row.title,
            message: row.message,
            time: formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: idLocale }),
            read: row.is_read,
          }))
        );
      }
      setIsLoading(false);
    };

    loadNotifications();
  }, [toast]);

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      toast({ title: "Gagal memperbarui notifikasi", description: error.message, variant: "destructive" });
      return;
    }

    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Notifikasi</h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Tetap update dengan kemajuan belajar Anda
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full w-fit">
                <Bell className="w-5 h-5" />
                <span className="font-bold">{unreadCount} Baru</span>
              </div>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="mb-6">
            <Button variant="outline" className="w-full" onClick={markAllAsRead}>
              Tandai Semua Sudah Dibaca
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`p-6 card-hover border-2 ${
                  !notification.read
                    ? getBgColor(notification.type)
                    : 'border-transparent'
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-bold text-base md:text-lg">{notification.title}</h3>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-muted-foreground mb-2 text-sm md:text-base">{notification.message}</p>
                    <span className="text-xs md:text-sm text-muted-foreground">{notification.time}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {isLoading && (
          <p className="text-muted-foreground" role="status">Memuat notifikasi...</p>
        )}

        {!isLoading && notifications.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <Bell className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-bold mb-2">Tidak ada notifikasi</h3>
              <p className="text-muted-foreground">
                Anda sudah mengikuti semuanya! Periksa lagi nanti untuk pembaruan.
              </p>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
