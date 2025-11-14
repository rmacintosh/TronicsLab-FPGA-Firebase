'use client';

import { useState } from 'react';
import Image from 'next/image';
import { addComment } from '@/lib/server-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Article, FullComment } from '@/lib/types';

interface ArticleClientProps {
  initialArticle: Article;
  initialComments: FullComment[];
}

export function ArticleClient({ initialArticle, initialComments }: ArticleClientProps) {
  const { user } = useFirebase();
  const [comments, setComments] = useState<FullComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (newComment.trim() && user && initialArticle) {
      const newSavedComment = await addComment(initialArticle.id, user.uid, newComment);
      setComments([newSavedComment, ...comments]);
      setNewComment('');
    }
  };

  const imageUrl = initialArticle.image 
    ? initialArticle.image.largeUrl || initialArticle.image.mediumUrl || initialArticle.image.imageUrl 
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="prose dark:prose-invert lg:prose-xl mx-auto">
        <h1>{initialArticle.title}</h1>
        {imageUrl && (
          <div className="relative w-full h-96 my-8">
            <Image
              src={imageUrl}
              alt={initialArticle.title}
              fill
              sizes="(max-width: 1024px) 100vw, 65ch"
              style={{ objectFit: 'cover' }}
              className="rounded-lg"
              priority
            />
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: initialArticle.content }} />
      </article>

      <div className="mt-12 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Comments</h2>
        {user && (
          <div className="mb-6 flex gap-4">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              />
            <Button onClick={handleAddComment}>Post</Button>
          </div>
        )}
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="p-4 flex gap-4 items-start">
                <Avatar>
                  <AvatarImage src={comment.authorPhotoURL} />
                  <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{comment.authorName}</p>
                  <p>{comment.comment}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
