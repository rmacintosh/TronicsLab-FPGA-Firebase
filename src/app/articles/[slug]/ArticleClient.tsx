
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { doc, onSnapshot } from 'firebase/firestore';
import { linkArticleToImage } from '@/lib/actions/article.actions';
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
  const { user, firestore } = useFirebase();
  const [article, setArticle] = useState<Article>(initialArticle);
  const [comments, setComments] = useState<FullComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const isLinking = useRef(false); // Ref to prevent multiple simultaneous calls

  useEffect(() => {
    if (article.image && article.image.id && !article.image.imageUrl) {
      const imageDocRef = doc(firestore, 'images', article.image.id);

      const unsubscribe = onSnapshot(imageDocRef, async (docSnap) => {
        if (docSnap.exists() && !isLinking.current) {
          const imageData = docSnap.data();
          if (imageData.processingComplete && imageData.permanentUrls) {
            isLinking.current = true; // Set the flag to prevent re-entry
            console.log(`Image data received for ${article.image.id}. Linking to article...`);

            const imageUrls = {
              imageUrl: imageData.permanentUrls.originalUrl,
              thumbUrl: imageData.permanentUrls.thumbUrl,
              mediumUrl: imageData.permanentUrls.mediumUrl,
              largeUrl: imageData.permanentUrls.largeUrl,
            };

            // Update the local state for immediate visual feedback
            setArticle(prevArticle => ({
              ...prevArticle,
              image: {
                ...prevArticle.image,
                ...imageUrls,
              },
            }));

            // Call the server action to permanently link the image and article
            const result = await linkArticleToImage(article.id, article.image.id, imageUrls);

            if (result.success) {
              console.log('Successfully linked article and image in the database.');
            } else {
              console.error('Failed to link article and image:', result.message);
              isLinking.current = false; // Reset if the link fails, allowing for a retry
            }
            
            // Stop listening after the link is made
            unsubscribe();
          }
        }
      });

      return () => unsubscribe();
    }
  }, [article.id, article.image, firestore]);

  const handleAddComment = async () => {
    if (newComment.trim() && user && article) {
      const newSavedComment = await addComment(article.id, user.uid, newComment);
      setComments([newSavedComment, ...comments]);
      setNewComment('');
    }
  };

  const imageUrl = article.image
    ? article.image.largeUrl || article.image.mediumUrl || article.image.imageUrl
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="prose dark:prose-invert lg:prose-xl mx-auto">
        <h1>{article.title}</h1>
        {imageUrl ? (
          <div className="relative w-full h-96 my-8">
            <Image
              src={imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 1024px) 100vw, 65ch"
              style={{ objectFit: 'cover' }}
              className="rounded-lg"
              priority
            />
          </div>
        ) : article.image?.imageHint ? (
          // Show a placeholder with the hint while the image is processing.
          <div className="relative w-full h-96 my-8 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center text-center p-4">
            <p className="text-gray-500 italic">Image processing: {article.image.imageHint}</p>
          </div>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
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

    