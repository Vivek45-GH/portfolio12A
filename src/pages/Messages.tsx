import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, updateDoc, setDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/Auth';
import { Student, ChatRoom, DirectMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Send, Shield, Lock, User as UserIcon, 
  MoreVertical, AtSign, Settings, Plus, Ghost, 
  Paperclip, Image as ImageIcon, Mic, X, 
  FileText, Play, Pause, Download, Check, CheckCheck,
  ArrowLeft, SearchIcon, Loader2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { useNavigate, useLocation } from 'react-router-dom';

export function Messages() {
  const { user, studentProfile, privateKey } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse target student from URL if coming from profile
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get('to');
    if (targetId && students.length > 0) {
      const target = students.find(s => s.uid === targetId);
      if (target) startChat(target);
    }
  }, [location.search, students]);

  // Fetch all students
  useEffect(() => {
    const q = query(collection(db, 'students'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student).filter(s => s.uid !== user?.uid));
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch user's chat rooms
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chatRooms'), where('participants', 'array-contains', user.uid), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom)));
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch messages for active room
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, 'chatRooms', activeRoom.id, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
      setMessages(msgs);
      
      // Mark as read
      msgs.forEach(msg => {
        if (msg.receiverId === user?.uid && !msg.read) {
          updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', msg.id), { read: true });
        }
      });
    });
    return () => unsubscribe();
  }, [activeRoom, user]);

  // Decrypt messages
  useEffect(() => {
    const decryptAll = async () => {
      if (!privateKey) return;
      const newDecrypted: Record<string, string> = { ...decryptedMessages };
      let changed = false;

      for (const msg of messages) {
        if (!newDecrypted[msg.id]) {
          const keyToUse = msg.senderId === user?.uid ? msg.encryptedKeyForSender : msg.encryptedKeyForReceiver;
          const decrypted = await decryptMessage(msg.encryptedContent, keyToUse, privateKey, msg.iv);
          newDecrypted[msg.id] = decrypted;
          changed = true;
        }
      }

      if (changed) setDecryptedMessages(newDecrypted);
    };
    decryptAll();
  }, [messages, privateKey, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, decryptedMessages]);

  const startChat = async (targetStudent: Student) => {
    if (!user) return;
    const participants = [user.uid, targetStudent.uid].sort();
    const roomId = participants.join('_');

    const roomRef = doc(db, 'chatRooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      await setDoc(roomRef, {
        participants,
        updatedAt: serverTimestamp(),
      });
    }
    
    setActiveRoom({ id: roomId, participants, updatedAt: new Date() });
    setSearchQuery('');
  };

  const handleSendMessage = async (content: string, type: DirectMessage['type'] = 'text', fileData?: { name: string, size: number }) => {
    if (!activeRoom || !user || !studentProfile || isSending) return;

    const recipientId = activeRoom.participants.find(id => id !== user.uid);
    if (!recipientId) return;

    setIsSending(true);
    try {
      const recipientSnap = await getDoc(doc(db, 'students', recipientId));
      const recipientData = recipientSnap.data() as Student;
      
      if (!recipientData.publicKey || !studentProfile.publicKey) {
        toast.error("Recipient hasn't set up E2EE keys yet.");
        return;
      }

      const encrypted = await encryptMessage(content, recipientData.publicKey, studentProfile.publicKey);

      const msgData = {
        senderId: user.uid,
        receiverId: recipientId,
        ...encrypted,
        createdAt: serverTimestamp(),
        read: false,
        type,
        ...(fileData && { fileName: fileData.name, fileSize: fileData.size })
      };

      await addDoc(collection(db, 'chatRooms', activeRoom.id, 'messages'), msgData);
      await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
        lastMessage: type === 'text' ? "[Encrypted Message]" : `[Encrypted ${type}]`,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error("Send failed:", error);
      toast.error("Failed to send encrypted message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeRoom) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chats/${activeRoom.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const type: DirectMessage['type'] = file.type.startsWith('image/') ? 'image' : 'file';
      await handleSendMessage(url, type, { name: file.name, size: file.size });
      toast.success("File sent!");
    } catch (error) {
      toast.error("File upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], "voice_note.webm", { type: 'audio/webm' });
        
        setIsUploading(true);
        try {
          const storageRef = ref(storage, `chats/${activeRoom?.id}/${Date.now()}_voice.webm`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          await handleSendMessage(url, 'audio');
        } catch (error) {
          toast.error("Voice note failed.");
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecipient = (room: ChatRoom) => {
    const recipientId = room.participants.find(id => id !== user?.uid);
    return students.find(s => s.uid === recipientId);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar - Ultra Clean */}
      <div className="w-80 border-r bg-card/30 backdrop-blur-xl flex flex-col">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tighter">MESSAGES</h1>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search classmates..." 
              className="pl-10 rounded-2xl bg-muted/50 border-none h-11 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1 pb-6">
            {searchQuery ? (
              <>
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Found Students</p>
                {filteredStudents.map(s => (
                  <button
                    key={s.uid}
                    onClick={() => startChat(s)}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-all group"
                  >
                    <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary/20 transition-all">
                      <AvatarImage src={s.photoURL} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{s.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">Click to start chat</p>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent Chats</p>
                {chatRooms.map(room => {
                  const recipient = getRecipient(room);
                  if (!recipient) return null;
                  const isActive = activeRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoom(room)}
                      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all group ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/5'}`}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary/20 transition-all">
                          <AvatarImage src={recipient.photoURL} />
                          <AvatarFallback className={`${isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'} font-bold`}>{recipient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 ${isActive ? 'border-primary' : 'border-background'} rounded-full shadow-sm`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className="font-bold text-sm truncate">{recipient.name}</p>
                          <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {room.updatedAt?.toDate ? room.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {room.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area - Ultra Aesthetic */}
      <div className="flex-1 flex flex-col bg-card/10 relative">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="h-20 border-b bg-background/50 backdrop-blur-xl flex items-center justify-between px-8 z-20">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveRoom(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                  <Avatar className="h-11 w-11 border-2 border-primary/10">
                    <AvatarImage src={getRecipient(activeRoom)?.photoURL} />
                    <AvatarFallback className="font-bold">{getRecipient(activeRoom)?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <div>
                  <h2 className="font-black text-lg tracking-tight">{getRecipient(activeRoom)?.name}</h2>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest">
                    <Shield className="h-3 w-3" />
                    End-to-End Encrypted
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10"><Lock className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10"><MoreVertical className="h-5 w-5" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-8" ref={scrollRef}>
              <div className="flex flex-col gap-6 py-10 max-w-4xl mx-auto">
                <div className="text-center space-y-4 mb-10">
                  <Avatar className="h-24 w-24 mx-auto border-4 border-primary/5 shadow-2xl">
                    <AvatarImage src={getRecipient(activeRoom)?.photoURL} />
                    <AvatarFallback className="text-3xl font-bold">{getRecipient(activeRoom)?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter">Chat with {getRecipient(activeRoom)?.name}</h3>
                    <p className="text-muted-foreground text-sm mt-2">This is the start of your private, encrypted conversation.</p>
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {messages.map((msg, index) => {
                    const isOwn = msg.senderId === user?.uid;
                    const decrypted = decryptedMessages[msg.id] || "...";
                    const showAvatar = index === 0 || messages[index-1].senderId !== msg.senderId;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`relative group p-4 rounded-3xl shadow-sm transition-all ${
                            isOwn 
                              ? 'bg-primary text-primary-foreground rounded-tr-none' 
                              : 'bg-card border border-primary/5 text-foreground rounded-tl-none'
                          }`}>
                            {msg.type === 'text' && <p className="text-sm leading-relaxed">{decrypted}</p>}
                            
                            {msg.type === 'image' && (
                              <div className="space-y-2">
                                <img src={decrypted} className="rounded-2xl max-h-80 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" alt="Sent" referrerPolicy="no-referrer" />
                                {msg.fileName && <p className="text-[10px] opacity-70 italic">{msg.fileName}</p>}
                              </div>
                            )}

                            {msg.type === 'file' && (
                              <a href={decrypted} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl ${isOwn ? 'bg-white/10' : 'bg-muted'} hover:opacity-80 transition-opacity`}>
                                <div className="p-2 bg-background/20 rounded-lg"><FileText className="h-5 w-5" /></div>
                                <div className="text-left">
                                  <p className="text-xs font-bold truncate max-w-[150px]">{msg.fileName || "Document"}</p>
                                  <p className="text-[10px] opacity-70">{(msg.fileSize ? (msg.fileSize / 1024).toFixed(1) : 0)} KB • Click to view</p>
                                </div>
                                <Download className="h-4 w-4 ml-2" />
                              </a>
                            )}

                            {msg.type === 'audio' && (
                              <div className={`flex items-center gap-3 p-2 rounded-xl ${isOwn ? 'bg-white/10' : 'bg-muted'}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/20">
                                  <Play className="h-4 w-4 fill-current" />
                                </Button>
                                <div className="w-32 h-1 bg-background/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-current w-1/3" />
                                </div>
                                <span className="text-[10px] font-bold">0:15</span>
                                <audio src={decrypted} className="hidden" />
                              </div>
                            )}

                            <div className={`absolute bottom-1 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                              </span>
                            </div>
                          </div>
                          
                          {isOwn && (
                            <div className="mt-1 flex items-center gap-1">
                              {msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">{msg.read ? 'Read' : 'Sent'}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Input - Ultra Clean */}
            <div className="p-8 bg-gradient-to-t from-background via-background to-transparent">
              <div className="max-w-4xl mx-auto">
                {isRecording ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-500 text-white rounded-3xl p-4 flex items-center justify-between shadow-xl shadow-red-500/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
                      <span className="font-black tracking-tighter text-lg">RECORDING {formatDuration(recordingDuration)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/20" onClick={() => setIsRecording(false)}>
                        <X className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="lg" className="rounded-full font-bold px-8 text-red-500 bg-white hover:bg-white/90" onClick={stopRecording}>
                        SEND VOICE
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
                    <div className="relative bg-card border border-primary/10 rounded-[2rem] p-2 flex items-center gap-2 shadow-2xl">
                      <div className="flex items-center gap-1 px-2">
                        <label className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer relative">
                          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary" onClick={startRecording}>
                          <Mic className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      <Input 
                        placeholder={`Write a message to ${getRecipient(activeRoom)?.name}...`}
                        className="bg-transparent border-none focus-visible:ring-0 text-base h-12"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage)}
                        disabled={isSending}
                      />
                      
                      <Button 
                        size="icon" 
                        className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                        disabled={!newMessage.trim() || isSending}
                        onClick={() => handleSendMessage(newMessage)}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-[0.2em] opacity-50">
                  End-to-End Encrypted Session • 2026-2027
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative w-40 h-40 bg-card border-2 border-primary/10 rounded-[3rem] flex items-center justify-center rotate-12 shadow-2xl">
                <MessageSquare className="h-20 w-20 text-primary/40 -rotate-12" />
              </div>
            </div>
            <h2 className="text-5xl font-black tracking-tighter mb-4">SECURE CHAT</h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Select a classmate from the sidebar to start a private, 
              end-to-end encrypted conversation.
            </p>
            <div className="mt-12 flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 rounded-2xl bg-primary/5 text-primary"><Shield className="h-6 w-6" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 rounded-2xl bg-primary/5 text-primary"><Lock className="h-6 w-6" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Private</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 rounded-2xl bg-primary/5 text-primary"><Ghost className="h-6 w-6" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Secure</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
