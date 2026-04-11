import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, User } from 'lucide-react';
import { motion } from 'motion/react';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden glass border-primary/10 h-full flex flex-col">
        {project.imageURL && (
          <div className="aspect-video overflow-hidden">
            <img
              src={project.imageURL}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <CardHeader className="p-4">
          <CardTitle className="text-lg flex justify-between items-start gap-2">
            {project.title}
            {project.link && (
              <a href={project.link} target="_blank" rel="noreferrer" className="text-primary hover:text-secondary transition-colors">
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {project.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
            <User className="h-3 w-3" />
            <span>{project.authorName}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
