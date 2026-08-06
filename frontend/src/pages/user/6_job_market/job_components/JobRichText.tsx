import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface JobRichTextProps {
  content: string;
  className?: string;
  truncate?: number;
}

export const JobRichText: React.FC<JobRichTextProps> = ({ content, className = '', truncate }) => {
  return (
    <div 
      className={`text-zinc-300 text-[13px] leading-relaxed break-words ${className}`}
      style={truncate ? {
        display: '-webkit-box',
        WebkitLineClamp: truncate,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      } : undefined}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ node, ...props }) => <strong className="font-extrabold text-white" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 my-2 marker:text-zinc-500" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 my-2 marker:text-zinc-500" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1 mb-1 last:mb-0" {...props} />,
          p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-3 last:mb-0" {...props} />,
          a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold text-white mt-2 mb-1" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default JobRichText;
