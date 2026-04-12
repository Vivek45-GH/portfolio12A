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
