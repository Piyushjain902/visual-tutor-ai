import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './StreamingText.css';

/**
 * StreamingText - Renders text with markdown and LaTeX support
 * Displays content immediately without letter-by-letter animation
 */
const StreamingText = ({ text = '' }) => {
  return (
    <div className="streaming-text">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) => <p className="markdown-paragraph" {...props} />,
          ul: ({ node, ...props }) => <ul className="markdown-list" {...props} />,
          li: ({ node, ...props }) => <li className="markdown-list-item" {...props} />,
          code: ({ node, inline, ...props }) => 
            inline ? (
              <code className="inline-code" {...props} />
            ) : (
              <code className="code-block" {...props} />
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default StreamingText;
