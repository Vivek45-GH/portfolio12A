export interface Student {
  uid: string;
  name: string;
  bio?: string;
  photoURL?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    snapchat?: string;
    discord?: string;
    youtube?: string;
    spotify?: string;
  };
  tags?: string[];
  role?: 'student' | 'admin';
  canEdit?: boolean;
  lastSeen?: any;
  publicKey?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  imageURL?: string;
  link?: string;
  authorUid: string;
  authorName: string;
  createdAt: any;
}

export interface GalleryItem {
  id: string;
  imageURL: string;
  caption?: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: any;
  aspectRatio?: 'portrait' | 'landscape' | 'square';
}

export interface Announcement {
  id: string;
  content: string;
  author: string;
  createdAt: any;
  source?: 'whatsapp' | 'web';
}

export interface ChatRoom {
  id: string;
  participants: string[]; // [uid1, uid2] sorted
  lastMessage?: string;
  lastMessageAt?: any;
  updatedAt: any;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  encryptedKeyForSender: string;
  encryptedKeyForReceiver: string;
  iv: string;
  createdAt: any;
  read: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  fileName?: string;
  fileSize?: number;
  audioDuration?: number;
}
