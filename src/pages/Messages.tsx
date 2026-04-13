import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, updateDoc, setDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/Auth';
import { Student, ChatRoom, DirectMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, MessageSquare, Shield, Lock, User as UserIcon, MoreVertical, Hash, AtSign, Settings, Plus, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { encryptMessage, decryptMessage } from '@/lib/crypto';

export function Messages() {
  const { user, studentProfile, privateKey } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all students for search
  useEffect(() => {
    const q = query(collection(db, 'students'), limit(50));
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
    });
    return () => unsubscribe();
  }, [activeRoom]);

  // Decrypt messages when they arrive
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

  // Scroll to bottom on new messages
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !user || !studentProfile || isSending) return;

    const recipientId = activeRoom.participants.find(id => id !== user.uid);
    if (!recipientId) return;

    setIsSending(true);
    try {
      // 1. Get recipient's public key
      const recipientSnap = await getDoc(doc(db, 'students', recipientId));
      const recipientData = recipientSnap.data() as Student;
      
      if (!recipientData.publicKey || !studentProfile.publicKey) {
        toast.error("Recipient hasn't set up E2EE keys yet.");
        return;
      }

      // 2. Encrypt message
      const encrypted = await encryptMessage(newMessage, recipientData.publicKey, studentProfile.publicKey);

      // 3. Send to Firestore
      const msgData = {
        senderId: user.uid,
        receiverId: recipientId,
        ...encrypted,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'chatRooms', activeRoom.id, 'messages'), msgData);
      await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
        lastMessage: "[Encrypted Message]",
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

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRecipient = (room: ChatRoom) => {
    const recipientId = room.participants.find(id => id !== user?.uid);
    return students.find(s => s.uid === recipientId);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#313338] text-[#dbdee1] overflow-hidden font-sans">
      {/* Sidebar - Server List Style */}
      <div className="w-16 bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-black/20">
        <div className="w-12 h-12 bg-[#313338] rounded-2xl flex items-center justify-center text-primary hover:rounded-xl transition-all cursor-pointer group">
          <AtSign className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </div>
        <div className="w-8 h-[2px] bg-[#35363c] rounded-full" />
        <div className="w-12 h-12 bg-[#313338] rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:rounded-xl transition-all cursor-pointer">
          <Plus className="h-6 w-6" />
        </div>
      </div>

      {/* Sidebar - DM List */}
      <div className="w-64 bg-[#2b2d31] flex flex-col">
        <div className="p-3 shadow-sm border-b border-black/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Find or start a conversation" 
              className="h-7 bg-[#1e1f22] border-none text-xs pl-8 focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          {searchQuery ? (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-bold uppercase text-muted-foreground mb-2">Search Results</p>
              {filteredStudents.map(s => (
                <button
                  key={s.uid}
                  onClick={() => startChat(s)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[#35373c] hover:text-[#f2f3f5] transition-colors group"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={s.photoURL} />
                    <AvatarFallback className="bg-primary/20 text-xs">{s.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{s.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-2 group cursor-pointer">
                <p className="text-[10px] font-bold uppercase text-muted-foreground group-hover:text-[#f2f3f5]">Direct Messages</p>
                <Plus className="h-3 w-3 text-muted-foreground group-hover:text-[#f2f3f5]" />
              </div>
              {chatRooms.map(room => {
                const recipient = getRecipient(room);
                if (!recipient) return null;
                return (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room)}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors group ${activeRoom?.id === room.id ? 'bg-[#3f4147] text-white' : 'hover:bg-[#35373c] hover:text-[#f2f3f5]'}`}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={recipient.photoURL} />
                        <AvatarFallback className="bg-primary/20 text-xs">{recipient.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#2b2d31] rounded-full" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{recipient.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {room.lastMessage || "Start chatting..."}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* User Profile Footer */}
        <div className="p-2 bg-[#232428] flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={studentProfile?.photoURL} />
            <AvatarFallback>{studentProfile?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{studentProfile?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">Online</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#35373c]"><Settings className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="h-12 border-b border-black/20 flex items-center justify-between px-4 shadow-sm">
              <div className="flex items-center gap-3">
                <AtSign className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-bold text-white">{getRecipient(activeRoom)?.name}</h2>
                <div className="w-[1px] h-6 bg-[#3f4147] mx-2" />
                <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                  <Shield className="h-3 w-3" />
                  End-to-End Encrypted
                </div>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <Lock className="h-5 w-5 hover:text-[#f2f3f5] cursor-pointer" />
                <MoreVertical className="h-5 w-5 hover:text-[#f2f3f5] cursor-pointer" />
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="flex flex-col gap-6 pb-4">
                {/* Welcome Message */}
                <div className="mt-8 mb-4 px-4">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={getRecipient(activeRoom)?.photoURL} />
                    <AvatarFallback className="text-2xl">{getRecipient(activeRoom)?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-3xl font-black text-white mb-1">{getRecipient(activeRoom)?.name}</h3>
                  <p className="text-muted-foreground">This is the beginning of your direct message history with @{getRecipient(activeRoom)?.name}.</p>
                </div>

                <div className="w-full h-[1px] bg-[#3f4147] relative">
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#313338] px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Secure History</span>
                </div>

                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.uid;
                    const decrypted = decryptedMessages[msg.id] || "Decrypting...";
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex gap-4 group hover:bg-[#2e3035] -mx-4 px-4 py-1 transition-colors ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-10 w-10 mt-1 shrink-0">
                          <AvatarImage src={isOwn ? studentProfile?.photoURL : getRecipient(activeRoom)?.photoURL} />
                          <AvatarFallback>{isOwn ? 'Me' : '??'}</AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-white hover:underline cursor-pointer">
                              {isOwn ? studentProfile?.name : getRecipient(activeRoom)?.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`px-3 py-2 rounded-2xl max-w-md break-words text-sm ${isOwn ? 'bg-primary text-white rounded-tr-none' : 'bg-[#383a40] text-[#dbdee1] rounded-tl-none'}`}>
                            {decrypted}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4">
              <form 
                onSubmit={handleSendMessage}
                className="bg-[#383a40] rounded-lg flex items-center px-4 py-2 gap-4 focus-within:ring-1 ring-primary/50"
              >
                <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center text-muted-foreground hover:text-white cursor-pointer">
                  <Plus className="h-4 w-4" />
                </div>
                <Input 
                  placeholder={`Message @${getRecipient(activeRoom)?.name}`}
                  className="bg-transparent border-none focus-visible:ring-0 text-sm p-0 h-10"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost" 
                  disabled={!newMessage.trim() || isSending}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                Your messages are end-to-end encrypted. No one outside of this chat, not even admins, can read them.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-48 h-48 bg-primary/5 rounded-full flex items-center justify-center mb-8 animate-pulse">
              <Ghost className="h-24 w-24 text-primary/20" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Select a friend to start chatting</h2>
            <p className="text-muted-foreground max-w-sm">
              Connect with your classmates in a secure, private environment. 
              All conversations are protected with military-grade encryption.
            </p>
            <Button 
              className="mt-8 rounded-full px-8 h-12 font-bold gap-2"
              onClick={() => {
                const searchInput = document.querySelector('input[placeholder="Find or start a conversation"]') as HTMLInputElement;
                searchInput?.focus();
              }}
            >
              <Search className="h-5 w-5" />
              Find Classmates
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
