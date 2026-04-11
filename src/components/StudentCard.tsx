import { Student } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Instagram, Twitter, Linkedin, Github, Ghost, MessageSquare, Youtube } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export function StudentCard({ student, index = 0 }: { student: Student, index?: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -100, scale: 0.8 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ 
        y: -10, 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
    >
      <Card 
        className="overflow-hidden glass hover:shadow-2xl transition-all duration-500 border-primary/10 group cursor-pointer"
        onClick={() => navigate(`/profile/${student.uid}`)}
      >
        <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-primary/20 transition-transform duration-500 group-hover:scale-110">
                  <AvatarImage src={student.photoURL || undefined} alt={student.name} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                    {student.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Badge className="bg-transparent border-none p-0">
                    <span className="text-[10px] font-bold">PRO</span>
                  </Badge>
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">{student.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 italic">
                  "{student.bio || "Crafting the future..."}"
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {student.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px] uppercase tracking-widest bg-primary/5 hover:bg-primary/20 transition-colors">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {student.socialLinks?.instagram && (
                  <a href={student.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#E4405F] transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {student.socialLinks?.twitter && (
                  <a href={student.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {student.socialLinks?.snapchat && (
                  <a href={student.socialLinks.snapchat} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#FFFC00] transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <Ghost className="h-5 w-5" />
                  </a>
                )}
                {student.socialLinks?.discord && (
                  <a href={student.socialLinks.discord} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#5865F2] transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <MessageSquare className="h-5 w-5" />
                  </a>
                )}
                {student.socialLinks?.youtube && (
                  <a href={student.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#FF0000] transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
                {student.socialLinks?.linkedin && (
                  <a href={student.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#0A66C2] transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {student.socialLinks?.github && (
                  <a href={student.socialLinks.github} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-all hover:scale-125" onClick={(e) => e.stopPropagation()}>
                    <Github className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
    </motion.div>
  );
}
