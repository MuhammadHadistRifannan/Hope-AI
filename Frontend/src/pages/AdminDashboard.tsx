import { useState, useEffect } from "react";
import { 
  Users, BookOpen, MessageSquare, Settings, BarChart3, 
  TrendingUp, Eye, Shield, Database, Activity 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statsData = [
  { label: "Total Pengguna", value: "1,234", icon: Users, change: "+12%" },
  { label: "Pelajaran Aktif", value: "56", icon: BookOpen, change: "+5%" },
  { label: "Forum Posts", value: "892", icon: MessageSquare, change: "+23%" },
  { label: "Tingkat Aktivitas", value: "78%", icon: Activity, change: "+8%" },
];

const recentUsers = [
  { id: 1, name: "Ahmad Rizki", email: "ahmad@email.com", status: "Aktif", joined: "2024-01-15" },
  { id: 2, name: "Siti Nurhaliza", email: "siti@email.com", status: "Aktif", joined: "2024-01-14" },
  { id: 3, name: "Budi Santoso", email: "budi@email.com", status: "Nonaktif", joined: "2024-01-13" },
  { id: 4, name: "Dewi Lestari", email: "dewi@email.com", status: "Aktif", joined: "2024-01-12" },
  { id: 5, name: "Eko Prasetyo", email: "eko@email.com", status: "Aktif", joined: "2024-01-11" },
];

export default function AdminDashboard() {
  const [appSettings, setAppSettings] = useState({
    maintenanceMode: false,
    registrationOpen: true,
    emailNotifications: true,
    forumEnabled: true,
    maxUploadSize: "10",
  });
  const { toast } = useToast();

  const handleSettingChange = (key: string, value: boolean | string) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Pengaturan Diperbarui",
      description: `${key} telah diubah`,
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Admin Dashboard</h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Kelola aplikasi Hope.Ai
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-lg">
            <Shield className="w-5 h-5 text-accent" />
            <span className="font-medium">Admin</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="w-8 h-8 text-primary" />
                  <span className="text-sm text-green-500 font-medium">{stat.change}</span>
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Pengguna</span>
            </TabsTrigger>
            <TabsTrigger value="content">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Konten</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Pengaturan</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Aktivitas Terbaru
                </h3>
                <div className="space-y-4">
                  {[
                    { action: "Pengguna baru mendaftar", time: "5 menit lalu", type: "user" },
                    { action: "Post forum baru dibuat", time: "15 menit lalu", type: "forum" },
                    { action: "Pelajaran EyeRead diakses", time: "30 menit lalu", type: "lesson" },
                    { action: "Quiz diselesaikan", time: "1 jam lalu", type: "quiz" },
                    { action: "Profil diperbarui", time: "2 jam lalu", type: "profile" },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{activity.action}</span>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Fitur Populer
                </h3>
                <div className="space-y-4">
                  {[
                    { name: "EyeRead", usage: 85 },
                    { name: "NeoTutor", usage: 72 },
                    { name: "Flexa", usage: 68 },
                    { name: "Forum", usage: 54 },
                    { name: "Pathly", usage: 45 },
                  ].map((feature) => (
                    <div key={feature.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{feature.name}</span>
                        <span className="text-muted-foreground">{feature.usage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${feature.usage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Daftar Pengguna</h3>
                <Input placeholder="Cari pengguna..." className="max-w-xs" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bergabung</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === "Aktif" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          }`}>
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell>{user.joined}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">Detail</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Manajemen Pelajaran
                </h3>
                <div className="space-y-4">
                  {["EyeRead", "NeoTutor", "Flexa", "Pathly"].map((lesson) => (
                    <div key={lesson} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">{lesson}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Statistik</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Moderasi Forum
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="font-medium text-yellow-800">3 Post Menunggu Review</div>
                    <p className="text-sm text-yellow-600 mt-1">Post baru memerlukan persetujuan moderator</p>
                    <Button variant="outline" size="sm" className="mt-2">Review Sekarang</Button>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="font-medium">Total Post: 892</div>
                    <div className="text-sm text-muted-foreground mt-1">Komentar: 2,341</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Pengaturan Aplikasi
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Mode Maintenance</div>
                    <p className="text-sm text-muted-foreground">Nonaktifkan aplikasi untuk maintenance</p>
                  </div>
                  <Switch 
                    checked={appSettings.maintenanceMode}
                    onCheckedChange={(checked) => handleSettingChange("maintenanceMode", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Pendaftaran Terbuka</div>
                    <p className="text-sm text-muted-foreground">Izinkan pengguna baru mendaftar</p>
                  </div>
                  <Switch 
                    checked={appSettings.registrationOpen}
                    onCheckedChange={(checked) => handleSettingChange("registrationOpen", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Notifikasi Email</div>
                    <p className="text-sm text-muted-foreground">Kirim notifikasi via email</p>
                  </div>
                  <Switch 
                    checked={appSettings.emailNotifications}
                    onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Forum Aktif</div>
                    <p className="text-sm text-muted-foreground">Aktifkan fitur forum diskusi</p>
                  </div>
                  <Switch 
                    checked={appSettings.forumEnabled}
                    onCheckedChange={(checked) => handleSettingChange("forumEnabled", checked)}
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <Label htmlFor="maxUpload" className="font-medium">Ukuran Upload Maksimum (MB)</Label>
                  <Input 
                    id="maxUpload"
                    type="number"
                    value={appSettings.maxUploadSize}
                    onChange={(e) => handleSettingChange("maxUploadSize", e.target.value)}
                    className="mt-2 max-w-xs"
                  />
                </div>

                <div className="flex gap-3">
                  <Button className="bg-primary">Simpan Pengaturan</Button>
                  <Button variant="outline">Reset ke Default</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
