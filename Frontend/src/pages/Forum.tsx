import { useState, useEffect, useCallback } from "react";
import { applyIndonesianVoice } from "@/lib/voice";
import { MessageSquare, ThumbsUp, Reply, Send, ChevronDown, ChevronUp, Volume2 } from "lucide-react"; // Added Volume2 icon
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext"; // Import Settings Context
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

type Comment = {
  id: string;
  author: string;
  avatar: string;
  avatarUrl: string | null;
  content: string;
  time: string;
};

type Post = {
  id: string;
  author: string;
  avatar: string;
  avatarUrl: string | null;
  content: string;
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
  time: string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "?";

const relativeTime = (iso: string) =>
  formatDistanceToNow(new Date(iso), { addSuffix: true, locale: idLocale });

export default function Forum() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // --- SETTINGS INTEGRATION ---
  const { highContrast, volume, speakingRate } = useSettings();
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- AMBIL POSTINGAN DARI DATABASE ---
  const loadPosts = useCallback(async (currentUserId: string) => {
    const { data: postRows, error } = await supabase
      .from("forum_posts")
      .select("id, author_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Gagal memuat forum:", error);
      toast({ title: "Gagal memuat forum", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const postIds = postRows.map((post) => post.id);
    const [commentsRes, likesRes] = await Promise.all([
      supabase
        .from("forum_comments")
        .select("id, post_id, author_id, content, created_at")
        .in("post_id", postIds)
        .order("created_at"),
      supabase.from("forum_post_likes").select("post_id, user_id").in("post_id", postIds),
    ]);
    const commentRows = commentsRes.data ?? [];
    const likeRows = likesRes.data ?? [];

    const authorIds = [
      ...new Set([
        ...postRows.map((post) => post.author_id),
        ...commentRows.map((comment) => comment.author_id),
      ]),
    ];
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", authorIds);
    const profiles = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));

    const authorOf = (authorId: string) => {
      const profile = profiles.get(authorId);
      const name = authorId === currentUserId ? "Anda" : profile?.full_name || "Pengguna";
      return {
        author: name,
        avatar: initials(profile?.full_name || name),
        avatarUrl: profile?.avatar_url ?? null,
      };
    };

    setPosts(
      postRows.map((post) => ({
        id: post.id,
        ...authorOf(post.author_id),
        content: post.content,
        likes: likeRows.filter((like) => like.post_id === post.id).length,
        likedByMe: likeRows.some(
          (like) => like.post_id === post.id && like.user_id === currentUserId
        ),
        comments: commentRows
          .filter((comment) => comment.post_id === post.id)
          .map((comment) => ({
            id: comment.id,
            ...authorOf(comment.author_id),
            content: comment.content,
            time: relativeTime(comment.created_at),
          })),
        time: relativeTime(post.created_at),
      }))
    );
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUserId(user.id);
      loadPosts(user.id);
    });
  }, [loadPosts]);

  // --- FUNGSI AKSESIBILITAS ---
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      applyIndonesianVoice(utterance);
      
      // Terapkan Setting
      utterance.volume = volume / 100;
      if (speakingRate === 'slow') utterance.rate = 0.8;
      else if (speakingRate === 'fast') utterance.rate = 1.2;
      else utterance.rate = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Maaf", description: "Browser tidak mendukung suara.", variant: "destructive" });
    }
  };

  const handleCreatePost = async () => {
    const content = newPost.trim();
    if (!content || !userId || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("forum_posts")
      .insert({ author_id: userId, content });
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Gagal memposting", description: error.message, variant: "destructive" });
      return;
    }

    setNewPost("");
    await loadPosts(userId);
  };

  // Satu pengguna satu suka per postingan; menekan lagi membatalkan suka
  const handleLike = async (postId: string) => {
    if (!userId) return;
    const target = posts.find((post) => post.id === postId);
    if (!target) return;
    const liked = target.likedByMe;

    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, likedByMe: !liked, likes: post.likes + (liked ? -1 : 1) }
        : post
    ));

    const { error } = liked
      ? await supabase
          .from("forum_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
      : await supabase
          .from("forum_post_likes")
          .insert({ post_id: postId, user_id: userId });

    if (error) {
      toast({ title: "Gagal menyimpan suka", description: error.message, variant: "destructive" });
      await loadPosts(userId);
    }
  };

  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const handleReply = async (postId: string) => {
    const content = replyContent.trim();
    if (!content || !userId || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("forum_comments")
      .insert({ post_id: postId, author_id: userId, content });
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Gagal mengirim komentar", description: error.message, variant: "destructive" });
      return;
    }

    setReplyContent("");
    setReplyingTo(null);
    await loadPosts(userId);
    
    // Auto-expand comments after reply
    const newExpanded = new Set(expandedPosts);
    newExpanded.add(postId);
    setExpandedPosts(newExpanded);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 pb-20 md:pb-8 transition-colors duration-300 ${highContrast ? 'bg-black text-yellow-400' : ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">EchoForum</h1>
          <p className={highContrast ? 'text-yellow-200' : 'text-muted-foreground text-base md:text-lg'}>
            Terhubung, berdiskusi, dan belajar bersama
          </p>
        </div>

        {/* Create Post */}
        <Card className={`p-6 mb-6 ${highContrast ? 'bg-gray-900 border-yellow-400' : ''}`}>
          <h2 className="font-bold text-lg mb-4">Buat Postingan</h2>
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Bagikan pikiran Anda, ajukan pertanyaan, atau mulai diskusi..."
            aria-label="Isi postingan baru"
            className={`mb-4 min-h-[100px] text-base md:text-lg ${highContrast ? 'bg-black text-yellow-400 border-yellow-600 placeholder:text-yellow-700' : ''}`}
          />
          <Button onClick={handleCreatePost} disabled={isSubmitting || !newPost.trim()} className="bg-primary">
            <Send className="w-4 h-4 mr-2" />
            Posting
          </Button>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          {isLoading && (
            <p className={highContrast ? 'text-yellow-200' : 'text-muted-foreground'} role="status">
              Memuat postingan...
            </p>
          )}
          {!isLoading && posts.length === 0 && (
            <Card className={`p-6 text-center ${highContrast ? 'bg-gray-900 border-yellow-400' : ''}`}>
              <p className={highContrast ? 'text-yellow-200' : 'text-muted-foreground'}>
                Belum ada postingan. Jadilah yang pertama memulai diskusi!
              </p>
            </Card>
          )}
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 card-hover ${highContrast ? 'bg-gray-900 border-yellow-400 hover:border-yellow-200' : ''}`}>
                <div className="flex gap-4">
                  <Avatar className="w-10 h-10 md:w-12 md:h-12">
                    {post.avatarUrl && <AvatarImage src={post.avatarUrl} alt="" />}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {post.avatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{post.author}</h3>
                        <span className={`text-sm ${highContrast ? 'text-yellow-200' : 'text-muted-foreground'}`}>• {post.time}</span>
                      </div>
                      
                      {/* Tombol Audio untuk Postingan */}
                      <Button variant="ghost" size="icon" onClick={() => speakText(post.content)} title="Bacakan Postingan" aria-label="Bacakan postingan">
                         <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-base md:text-lg mb-4 leading-relaxed">{post.content}</p>

                    <div className="flex gap-4 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        aria-pressed={post.likedByMe}
                        className={highContrast ? 'text-yellow-400 hover:text-white hover:bg-gray-800' : post.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
                      >
                        <ThumbsUp className={`w-4 h-4 mr-2 ${post.likedByMe ? 'fill-current' : ''}`} />
                        {post.likes} Suka
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComments(post.id)}
                        aria-expanded={expandedPosts.has(post.id)}
                        className={highContrast ? 'text-yellow-400 hover:text-white hover:bg-gray-800' : 'text-muted-foreground hover:text-secondary'}
                      >
                        {expandedPosts.has(post.id) ? (
                          <ChevronUp className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        )}
                        {post.comments.length} Komentar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                        className={highContrast ? 'text-yellow-400 hover:text-white hover:bg-gray-800' : 'text-muted-foreground hover:text-accent'}
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Balas
                      </Button>
                    </div>

                    {/* Reply Input */}
                    <AnimatePresence>
                      {replyingTo === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4"
                        >
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Tulis komentar Anda..."
                            aria-label={`Komentar untuk postingan ${post.author}`}
                            className={`mb-2 min-h-[80px] ${highContrast ? 'bg-black text-yellow-400 border-yellow-600' : ''}`}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReply(post.id)}
                              disabled={isSubmitting || !replyContent.trim()}
                              size="sm"
                              className="bg-secondary"
                            >
                              <Send className="w-3 h-3 mr-2" />
                              Kirim Komentar
                            </Button>
                            <Button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent("");
                              }}
                              size="sm"
                              variant="outline"
                              className={highContrast ? 'border-yellow-600 text-yellow-400 hover:bg-gray-800' : ''}
                            >
                              Batal
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {expandedPosts.has(post.id) && post.comments.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`mt-4 space-y-3 border-l-2 pl-4 ${highContrast ? 'border-yellow-600' : 'border-muted'}`}
                        >
                          {post.comments.map((comment) => (
                            <motion.div
                              key={comment.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex gap-3 items-start"
                            >
                              <Avatar className="w-8 h-8 mt-1">
                                {comment.avatarUrl && <AvatarImage src={comment.avatarUrl} alt="" />}
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                  {comment.avatar}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                   <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-sm">{comment.author}</h4>
                                      <span className={`text-xs ${highContrast ? 'text-yellow-200' : 'text-muted-foreground'}`}>• {comment.time}</span>
                                   </div>
                                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => speakText(comment.content)} aria-label="Bacakan komentar">
                                      <Volume2 className="w-3 h-3" />
                                   </Button>
                                </div>
                                <p className="text-sm leading-relaxed">{comment.content}</p>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Accessibility Notice */}
        <Card className={`p-6 mt-6 ${highContrast ? 'bg-gray-800 border-yellow-500' : 'bg-accent/10 border-accent/30'}`}>
          <div className="flex gap-3">
            <MessageSquare className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-2">Fitur Forum yang Aksesibel</h3>
              <ul className={`text-sm space-y-1 ${highContrast ? 'text-yellow-100' : 'text-muted-foreground'}`}>
                <li>• Dukungan teks besar untuk keterbacaan yang lebih baik</li>
                <li>• Catatan suara untuk respon audio</li>
                <li>• Pembuatan subtitle otomatis</li>
                <li>• Kompatibel dengan pembaca layar</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}