
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  title?: string;
}

export function TruncatedText({ text, maxLength = 100, title = 'Full Text' }: TruncatedTextProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }

  const truncated = text.substring(0, maxLength) + '...';

  return (
    <span>
      {truncated}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="link" size="sm" className="ml-2">
            Show More
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="prose dark:prose-invert max-h-[60vh] overflow-y-auto p-4 border rounded-md">
            <p>{text}</p>
          </div>
        </DialogContent>
      </Dialog>
    </span>
  );
}
