import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  lastSeen?: any;
  className?: string;
}

export function StatusBadge({ lastSeen, className }: StatusBadgeProps) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!lastSeen) {
      setIsOnline(false);
      return;
    }

    const checkStatus = () => {
      const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      const now = new Date();
      const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
      
      // Consider online if seen in the last 3 minutes
      setIsOnline(diffInMinutes < 3);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [lastSeen]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn(
        "h-2 w-2 rounded-full animate-pulse",
        isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"
      )} />
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider",
        isOnline ? "text-green-500" : "text-muted-foreground"
      )}>
        {isOnline ? "Active Now" : "Inactive"}
      </span>
    </div>
  );
}
