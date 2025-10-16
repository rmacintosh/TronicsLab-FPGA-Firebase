import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  return (
    <div className={cn("relative", className)}>
      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm border">
        <code className="font-code">{code}</code>
      </pre>
      {language && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md">
          {language}
        </div>
      )}
    </div>
  );
}
