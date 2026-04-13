import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/Auth';
import { GalleryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Image as ImageIcon, Loader2, Plus, Trash2, X, Sparkles, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

export function Gallery() {
  const { user, studentProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ imageURL: '', caption: '', aspectRatio: 'square' as 'portrait' | 'landscape' | 'square' });

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }

    try {
      setIsUploading(true);
      const storageRef = ref(storage, `gallery/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      // Determine aspect ratio based on image dimensions
      const img = new Image();
      img.src = url;
      img.onload = () => {
        let ratio: 'portrait' | 'landscape' | 'square' = 'square';
        if (img.width > img.height * 1.2) ratio = 'landscape';
        else if (img.height > img.width * 1.2) ratio = 'portrait';
        setNewPhoto(prev => ({ ...prev, imageURL: url, aspectRatio: ratio }));
      };
      
      toast.success("Photo uploaded! Add a caption.");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!user || !studentProfile || !newPhoto.imageURL) return;
    try {
      await addDoc(collection(db, 'gallery'), {
        ...newPhoto,
        uploadedBy: user.uid,
        uploaderName: studentProfile.name,
        createdAt: serverTimestamp()
      });
      setNewPhoto({ imageURL: '', caption: '', aspectRatio: 'square' });
      setIsModalOpen(false);
      toast.success("Added to gallery!");
    } catch (error) {
      console.error("Error adding photo:", error);
      toast.error("Failed to add photo.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this memory?")) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
      toast.success("Memory deleted.");
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="min-h-screen bg-background py-20 px-4 overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="container mx-auto relative z-10">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8 gap-2 hover:bg-primary/10 rounded-full"
        >
          <Camera className="h-4 w-4 rotate-180" /> Back to Home
        </Button>

        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
              CLASS GALLERY
            </h1>
            <p className="text-muted-foreground text-xl mt-4 font-medium flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Capturing the best moments of 2026-2027
            </p>
          </motion.div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger render={
              <Button size="lg" className="rounded-full h-16 px-8 text-lg font-bold gap-3 shadow-2xl shadow-primary/20 hover:scale-105 transition-transform">
                <Plus className="h-6 w-6" /> Share a Memory
              </Button>
            } />
            <DialogContent className="glass border-primary/20 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Upload Memory</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center bg-primary/5 group">
                  {newPhoto.imageURL ? (
                    <img src={newPhoto.imageURL} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-8">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm font-medium">Click to upload from device</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <Input 
                  placeholder="What's happening in this photo?" 
                  value={newPhoto.caption}
                  onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })}
                  className="glass h-12"
                />
                <Button 
                  onClick={handleAddPhoto} 
                  className="w-full h-12 text-lg font-bold"
                  disabled={!newPhoto.imageURL || isUploading}
                >
                  Post to Gallery
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="relative group break-inside-avoid"
              >
                <div className="relative overflow-hidden rounded-3xl glass border-primary/10 group-hover:border-primary/30 transition-all duration-500">
                  <img 
                    src={item.imageURL} 
                    alt={item.caption}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-white font-bold text-lg mb-2">{item.caption}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-white text-xs font-bold border border-white/20">
                            {item.uploaderName.charAt(0)}
                          </div>
                          <span className="text-white/80 text-sm font-medium">{item.uploaderName}</span>
                        </div>
                        
                        {(user?.uid === item.uploadedBy || isAdmin) && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-red-500/20 hover:bg-red-500/40 border-none"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aesthetic Badge */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full">
                      <Heart className="h-4 w-4 text-white hover:fill-red-500 hover:text-red-500 transition-colors cursor-pointer" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {items.length === 0 && (
          <div className="text-center py-40">
            <div className="inline-block p-12 rounded-[3rem] glass border-dashed border-2 border-primary/20">
              <ImageIcon className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
              <h2 className="text-2xl font-bold text-muted-foreground">The gallery is empty...</h2>
              <p className="text-muted-foreground/60 mt-2">Be the first to share a memory!</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
