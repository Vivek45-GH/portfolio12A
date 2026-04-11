import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/Auth';
import { Student, Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Shield, User, FolderOpen, ArrowLeft, Lock, Unlock } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { StatusBadge } from '@/components/StatusBadge';

export function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribeStudents = onSnapshot(query(collection(db, 'students'), orderBy('name')), (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student));
    });

    const unsubscribeProjects = onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    return () => {
      unsubscribeStudents();
      unsubscribeProjects();
    };
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/login" />;

  const handleDeleteStudent = async (uid: string) => {
    if (!uid) {
      toast.error("Invalid student ID");
      return;
    }
    if (!window.confirm("Delete this student profile? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'students', uid));
      toast.success("Student profile deleted");
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student profile");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleAdmin = async (student: Student) => {
    try {
      await updateDoc(doc(db, 'students', student.uid), {
        role: student.role === 'admin' ? 'student' : 'admin'
      });
      toast.success(`Role updated for ${student.name}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update role");
    }
  };

  const togglePermission = async (student: Student) => {
    try {
      await updateDoc(doc(db, 'students', student.uid), {
        canEdit: student.canEdit === false ? true : false
      });
      toast.success(`Permissions updated for ${student.name}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update permissions");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 gap-2 hover:bg-primary/10 rounded-full"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage students and projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Students Management */}
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Students
            </CardTitle>
            <span className="text-sm text-muted-foreground">{students.length} total</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {students.map((student) => (
              <div key={student.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.photoURL || undefined} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                      student.lastSeen && (new Date().getTime() - (student.lastSeen.toDate ? student.lastSeen.toDate() : new Date(student.lastSeen)).getTime()) / 60000 < 3 
                        ? "bg-green-500" 
                        : "bg-gray-400"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{student.name}</p>
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge lastSeen={student.lastSeen} />
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{student.role || 'student'}</p>
                        <span className="text-[9px] text-muted-foreground">•</span>
                        <p className={cn("text-[9px] uppercase font-bold", student.canEdit !== false ? "text-green-500" : "text-red-500")}>
                          {student.canEdit !== false ? "Can Edit" : "Locked"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => togglePermission(student)}
                    title={student.canEdit !== false ? "Lock Profile" : "Unlock Profile"}
                    className={student.canEdit !== false ? 'text-muted-foreground' : 'text-red-500'}
                  >
                    {student.canEdit !== false ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toggleAdmin(student)}
                    title="Toggle Admin"
                    className={student.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStudent(student.uid)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Projects Management */}
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" /> Projects
            </CardTitle>
            <span className="text-sm text-muted-foreground">{projects.length} total</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
                <div className="flex flex-col">
                  <p className="font-medium">{project.title}</p>
                  <p className="text-xs text-muted-foreground">by {project.authorName}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProject(project.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
