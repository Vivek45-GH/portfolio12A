import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/Auth';
import { Student, Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Instagram, Twitter, Linkedin, Github, Plus, Trash2, Edit2, Save, X, Ghost, ArrowLeft, Camera, Loader2, MessageSquare, Youtube } from 'lucide-react';
import { ProjectCard } from '@/components/ProjectCard';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function Profile() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Student | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student>>({
    name: '',
    bio: '',
    photoURL: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      snapchat: '',
      discord: '',
      youtube: '',
      linkedin: '',
      github: '',
    }
  });
  const [newProject, setNewProject] = useState<Partial<Project>>({ title: '', description: '', imageURL: '', link: '' });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProjectUploading, setIsProjectUploading] = useState(false);

  const isOwnProfile = user?.uid === id;
  const canEdit = (isOwnProfile && profile?.canEdit !== false) || isAdmin;

  useEffect(() => {
    if (!id) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'students', id), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Student;
        setProfile(data);
        setEditData({
          ...data,
          name: data.name || '',
          bio: data.bio || '',
          photoURL: data.photoURL || '',
          socialLinks: {
            instagram: data.socialLinks?.instagram || '',
            twitter: data.socialLinks?.twitter || '',
            snapchat: data.socialLinks?.snapchat || '',
            discord: data.socialLinks?.discord || '',
            youtube: data.socialLinks?.youtube || '',
            linkedin: data.socialLinks?.linkedin || '',
            github: data.socialLinks?.github || '',
          }
        });
      }
    });

    const qProjects = query(collection(db, 'projects'), where('authorUid', '==', id));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    return () => {
      unsubscribeProfile();
      unsubscribeProjects();
    };
  }, [id]);

  const handleSaveProfile = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'students', id), editData);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'project') => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB.");
      return;
    }

    try {
      if (type === 'profile') setIsUploading(true);
      else setIsProjectUploading(true);

      console.log(`Starting ${type} upload for user ${id}...`);
      const storageRef = ref(storage, `${type}s/${id}/${Date.now()}_${file.name}`);
      
      // Use uploadBytes and await it properly
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload successful, getting download URL...");
      
      const url = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", url);

      if (type === 'profile') {
        setEditData(prev => ({ ...prev, photoURL: url }));
        toast.success("Photo uploaded! Click 'Save' to apply changes.");
      } else {
        setNewProject(prev => ({ ...prev, imageURL: url }));
        toast.success("Project image uploaded!");
      }
    } catch (error: any) {
      console.error("Upload error details:", error);
      const errorMessage = error.code === 'storage/unauthorized' 
        ? "Permission denied. Please make sure you are logged in."
        : `Upload failed: ${error.message || 'Unknown error'}`;
      toast.error(errorMessage);
    } finally {
      if (type === 'profile') setIsUploading(false);
      else setIsProjectUploading(false);
    }
  };

  const handleAddProject = async () => {
    if (!id || !profile) return;
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        authorUid: id,
        authorName: profile.name,
        createdAt: serverTimestamp()
      });
      setNewProject({ title: '', description: '', imageURL: '', link: '' });
      setIsProjectModalOpen(false);
      toast.success("Project uploaded!");
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Failed to upload project.");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      toast.success("Project deleted.");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project.");
    }
  };

  if (!profile) return <div className="container mx-auto p-20 text-center">Loading profile...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-12"
    >
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 gap-2 hover:bg-primary/10 rounded-full"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <Card className="glass sticky top-24 border-primary/10">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="relative group">
                  <Avatar className="h-40 w-40 border-8 border-primary/10">
                    <AvatarImage src={(isEditing ? editData.photoURL : profile.photoURL) || undefined} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-secondary text-white">
                      {profile.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploading ? (
                        <Loader2 className="text-white h-8 w-8 animate-spin" />
                      ) : (
                        <>
                          <Camera className="text-white h-8 w-8" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => handleFileUpload(e, 'profile')} 
                          />
                        </>
                      )}
                    </label>
                  )}
                </div>

                {isEditing ? (
                  <div className="w-full space-y-4 text-left">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                      <Input 
                        value={editData.name} 
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground">Bio</label>
                      <Textarea 
                        value={editData.bio} 
                        onChange={(e) => setEditData({...editData, bio: e.target.value})}
                        className="glass h-24"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground">Photo URL (Optional)</label>
                      <Input 
                        value={editData.photoURL} 
                        onChange={(e) => setEditData({...editData, photoURL: e.target.value})}
                        className="glass"
                        placeholder="Or click the avatar above to upload"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Social Links</label>
                      <Input 
                        placeholder="Instagram URL" 
                        value={editData.socialLinks?.instagram} 
                        onChange={(e) => setEditData({...editData, socialLinks: {...editData.socialLinks, instagram: e.target.value}})}
                        className="glass"
                      />
                      <Input 
                        placeholder="Twitter URL" 
                        value={editData.socialLinks?.twitter} 
                        onChange={(e) => setEditData({...editData, socialLinks: {...editData.socialLinks, twitter: e.target.value}})}
                        className="glass"
                      />
                      <Input 
                        placeholder="Snapchat URL" 
                        value={editData.socialLinks?.snapchat} 
                        onChange={(e) => setEditData({...editData, socialLinks: {...editData.socialLinks, snapchat: e.target.value}})}
                        className="glass"
                      />
                      <Input 
                        placeholder="Discord URL" 
                        value={editData.socialLinks?.discord} 
                        onChange={(e) => setEditData({...editData, socialLinks: {...editData.socialLinks, discord: e.target.value}})}
                        className="glass"
                      />
                      <Input 
                        placeholder="YouTube URL" 
                        value={editData.socialLinks?.youtube} 
                        onChange={(e) => setEditData({...editData, socialLinks: {...editData.socialLinks, youtube: e.target.value}})}
                        className="glass"
                      />
                      <Input 
                        placeholder="GitHub URL" 
                        value={editData.socialLinks?.github} 
                        onChange={(e) => setEditData({...editData, socialLinks: {...editData.socialLinks, github: e.target.value}})}
                        className="glass"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveProfile} className="flex-1 gap-2">
                        <Save className="h-4 w-4" /> Save
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-3xl font-bold">{profile.name}</h2>
                      <p className="text-muted-foreground mt-2 leading-relaxed">
                        {profile.bio || "This student hasn't added a bio yet."}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      {profile.socialLinks?.instagram && (
                        <a href={profile.socialLinks.instagram} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-[#E4405F] transition-all">
                          <Instagram className="h-6 w-6" />
                        </a>
                      )}
                      {profile.socialLinks?.twitter && (
                        <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-[#1DA1F2] transition-all">
                          <Twitter className="h-6 w-6" />
                        </a>
                      )}
                      {profile.socialLinks?.snapchat && (
                        <a href={profile.socialLinks.snapchat} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-[#FFFC00] transition-all">
                          <Ghost className="h-6 w-6" />
                        </a>
                      )}
                      {profile.socialLinks?.discord && (
                        <a href={profile.socialLinks.discord} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-[#5865F2] transition-all">
                          <MessageSquare className="h-6 w-6" />
                        </a>
                      )}
                      {profile.socialLinks?.youtube && (
                        <a href={profile.socialLinks.youtube} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-[#FF0000] transition-all">
                          <Youtube className="h-6 w-6" />
                        </a>
                      )}
                      {profile.socialLinks?.linkedin && (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-[#0A66C2] transition-all">
                          <Linkedin className="h-6 w-6" />
                        </a>
                      )}
                      {profile.socialLinks?.github && (
                        <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="p-3 rounded-full glass hover:text-foreground transition-all">
                          <Github className="h-6 w-6" />
                        </a>
                      )}
                    </div>

                    {canEdit && (
                      <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full gap-2 mt-4 rounded-full">
                        <Edit2 className="h-4 w-4" /> Edit Profile
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-bold">Showcase</h3>
            {canEdit && (
              <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
                <DialogTrigger
                  render={
                    <Button className="gap-2 rounded-full">
                      <Plus className="h-4 w-4" /> Add Project
                    </Button>
                  }
                />
                <DialogContent className="glass border-primary/20">
                  <DialogHeader>
                    <DialogTitle>Add New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input 
                      placeholder="Project Title" 
                      value={newProject.title}
                      onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                      className="glass"
                    />
                    <Textarea 
                      placeholder="Description" 
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      className="glass"
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Project Image</label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Image URL" 
                          value={newProject.imageURL}
                          onChange={(e) => setNewProject({...newProject, imageURL: e.target.value})}
                          className="glass flex-1"
                        />
                        <div className="relative">
                          <Button variant="outline" size="icon" className="relative overflow-hidden">
                            {isProjectUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            <input 
                              type="file" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              accept="image/*" 
                              onChange={(e) => handleFileUpload(e, 'project')} 
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Input 
                      placeholder="Project Link" 
                      value={newProject.link}
                      onChange={(e) => setNewProject({...newProject, link: e.target.value})}
                      className="glass"
                    />
                    <Button onClick={handleAddProject} className="w-full">Upload Project</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <ProjectCard project={project} />
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-20 glass rounded-3xl border-dashed border-2 border-muted">
              <p className="text-muted-foreground">No projects showcased yet.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
