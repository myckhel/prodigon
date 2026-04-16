// ---------------------------------------------------------------------------
// MarkdownRenderer — renders assistant markdown with syntax-highlighted code
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      {/* Language label + copy button */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/80 text-xs text-muted-foreground">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.8125rem',
          lineHeight: 1.6,
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        // Fenced code blocks
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          // If it has a language class, it is a fenced code block
          if (match) {
            return <CodeBlock language={match[1]} children={codeString} />;
          }

          // Inline code
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          );
        },

        // Block elements with fenced code handled above need pre passthrough
        pre({ children }) {
          return <>{children}</>;
        },

        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },

        ul({ children }) {
          return <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>;
        },

        ol({ children }) {
          return (
            <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
          );
        },

        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },

        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          );
        },

        h1({ children }) {
          return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
        },

        h2({ children }) {
          return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>;
        },

        h3({ children }) {
          return <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>;
        },

        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          );
        },

        hr() {
          return <hr className="my-4 border-border" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
