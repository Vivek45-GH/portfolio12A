import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, Project } from '../types';
import { StudentCard } from '../components/StudentCard';
import { ProjectCard } from '../components/ProjectCard';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const qStudents = query(collection(db, 'students'), orderBy('name'));
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student));
    });

    const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    return () => {
      unsubscribeStudents();
      unsubscribeProjects();
    };
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.authorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
        >
          <Sparkles className="h-4 w-4" />
          <span>Session 2026-2027</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
        >
          Meet The <span className="text-primary">Future Leaders</span> Of Kv Bawana
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
        >
          Discover the brilliant minds of Class 12th A. Explore their passions, projects, and unique stories.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative max-w-2xl mx-auto group"
        >
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center">
            <Search className="absolute left-5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search students, skills, or projects..."
              className="pl-14 h-16 rounded-2xl glass border-primary/20 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-lg transition-all shadow-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute right-4 flex items-center gap-2 pointer-events-none">
              <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </motion.div>
      </header>

      <Tabs defaultValue="students" className="w-full">
        <div className="flex justify-center mb-12">
          <TabsList className="glass p-1 h-14 rounded-full">
            <TabsTrigger value="students" className="rounded-full px-8 h-full text-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              Students
            </TabsTrigger>
            <TabsTrigger value="projects" className="rounded-full px-8 h-full text-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              Projects
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredStudents.map((student, index) => (
              <div key={student.uid}>
                <StudentCard student={student} index={index} />
              </div>
            ))}
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No students found matching your search.
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div key={project.id}>
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
          {filteredProjects.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No projects found matching your search.
            </div>
          )}
        </TabsContent>
      </Tabs>

      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-32 pt-16 border-t border-primary/10 text-center"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary/5 text-primary mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold">About Our School</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Welcome to the digital showcase of <strong>PM SHRI Kendriya Vidyalaya Bawana</strong>, Delhi. 
            As a premier educational institution under the PM SHRI scheme, we are committed to nurturing 
            excellence and fostering the all-round development of our students through modern 
            pedagogy and state-of-the-art facilities.
          </p>
          <div className="flex justify-center gap-8 text-sm text-muted-foreground font-medium">
            <span>📍 Bawana, Delhi</span>
            <span>🎓 Session 2026-2027</span>
            <span>✨ Excellence in Education</span>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
