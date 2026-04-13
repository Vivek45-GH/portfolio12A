import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/Auth';
import { Announcement } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Trash2, Send, ArrowLeft, Megaphone, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function Announcements() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        content: newContent,
        author: 'Admin',
        createdAt: serverTimestamp(),
        source: 'web'
      });
      setNewContent('');
      toast.success("Announcement posted!");
    } catch (error) {
      toast.error("Failed to post.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success("Deleted.");
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8 gap-2 hover:bg-primary/10 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-block p-3 rounded-2xl bg-primary/10 text-primary mb-2">
              <Megaphone className="h-8 w-8" />
            </div>
            <h1 className="text-5xl font-black tracking-tight">Announcements</h1>
            <p className="text-muted-foreground text-lg">Stay updated with the latest from the class</p>
          </div>

          {isAdmin && (
            <Card className="glass border-primary/20 overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Post New Announcement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea 
                  placeholder="What's the update today?"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="glass min-h-[120px] text-lg"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Tip: You can also sync this with WhatsApp using a webhook.
                  </p>
                  <Button 
                    onClick={handlePost} 
                    disabled={isPosting || !newContent.trim()}
                    className="gap-2 px-8 rounded-full"
                  >
                    {isPosting ? "Posting..." : "Post Update"}
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {announcements.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`glass border-primary/10 hover:border-primary/30 transition-all ${item.source === 'whatsapp' ? 'border-l-4 border-l-green-500' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${item.source === 'whatsapp' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                              {item.source === 'whatsapp' ? <MessageSquare className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                            </div>
                            <span className="font-bold text-sm uppercase tracking-wider">
                              {item.source === 'whatsapp' ? 'WhatsApp Sync' : 'Official Update'}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {item.createdAt?.toDate().toLocaleString() || 'Just now'}
                            </span>
                          </div>
                          <p className="text-lg leading-relaxed whitespace-pre-wrap">
                            {item.content}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {announcements.length === 0 && (
              <div className="text-center py-20 glass rounded-3xl border-dashed border-2 border-muted">
                <p className="text-muted-foreground">No announcements yet. Silence is golden!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
