"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Source } from "@/hooks/useChatHistory";
import CodeBlock from "./CodeBlock";
import CitationMarker from "./CitationMarker";

interface Citation {
  startIndex: number;
  endIndex: number;
  text: string;
  sourceIndices: number[];
}

interface MessageWithCitationsProps {
  content: string;
  citations?: Citation[];
  sources?: Source[];
  onDocumentClick?: (source: Source) => void;
}

export default function MessageWithCitations({
  content,
  citations,
  sources,
  onDocumentClick,
}: MessageWithCitationsProps) {
  console.log("MessageWithCitations:", { citations, sources });

  // Build source mapping with citation numbers
  const sourceMap = new Map<number, number>();
  const uniqueSources: Source[] = [];
  let citationNumber = 1;

  if (citations && sources && citations.length > 0 && sources.length > 0) {
    const sortedCitations = [...citations].sort((a, b) => a.startIndex - b.startIndex);

    for (const citation of sortedCitations) {
      for (const sourceIndex of citation.sourceIndices) {
        if (!sourceMap.has(sourceIndex)) {
          sourceMap.set(sourceIndex, citationNumber);
          uniqueSources.push(sources[sourceIndex]);
          citationNumber++;
        }
      }
    }
  }

  // Build content segments with inline citations
  const contentSegments = React.useMemo(() => {
    if (!citations || !sources || citations.length === 0 || sources.length === 0) {
      return [{ type: 'text' as const, content }];
    }

    // Create a map of positions to citation numbers
    const positionToCitations = new Map<number, number[]>();

    for (const citation of citations) {
      for (const sourceIndex of citation.sourceIndices) {
        const citNum = sourceMap.get(sourceIndex);
        if (citNum) {
          const existing = positionToCitations.get(citation.endIndex) || [];
          if (!existing.includes(citNum)) {
            existing.push(citNum);
          }
          positionToCitations.set(citation.endIndex, existing);
        }
      }
    }

    // Split content into segments
    const positions = Array.from(positionToCitations.keys()).sort((a, b) => a - b);
    const segments: Array<{ type: 'text' | 'citation', content?: string, citNums?: number[] }> = [];

    let lastPos = 0;
    for (const position of positions) {
      // Add text segment
      if (position > lastPos) {
        segments.push({ type: 'text', content: content.slice(lastPos, position) });
      }
      // Add citation segment
      const citNums = positionToCitations.get(position) || [];
      segments.push({ type: 'citation', citNums });
      lastPos = position;
    }

    // Add remaining text
    if (lastPos < content.length) {
      segments.push({ type: 'text', content: content.slice(lastPos) });
    }

    return segments;
  }, [content, citations, sources, sourceMap]);

  return (
    <div>
      {/* Main content with inline citations */}
      <div className="prose prose-sm sm:prose-base max-w-none">
        {contentSegments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <ReactMarkdown
                key={index}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, '')}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Prevent wrapping in p tags for inline segments
                  p({ children }) {
                    return <>{children}</>;
                  },
                }}
              >
                {segment.content || ''}
              </ReactMarkdown>
            );
          } else {
            // Citation markers
            return (
              <span key={index} className="inline">
                {segment.citNums?.map((citNum) => {
                  const source = uniqueSources[citNum - 1];
                  return source ? (
                    <CitationMarker
                      key={citNum}
                      citationNumber={citNum}
                      source={source}
                      onDocumentClick={onDocumentClick}
                    />
                  ) : null;
                })}
              </span>
            );
          }
        })}
      </div>

      {/* Numbered source list at the end */}
      {uniqueSources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1.5">
            <div className="font-semibold text-gray-700 mb-2">Quellen:</div>
            {uniqueSources.map((source, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="font-semibold text-blue-600 flex-shrink-0">[{index + 1}]</span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-blue-600 underline decoration-dotted hover:decoration-solid transition-colors line-clamp-1"
                  >
                    {source.displayName}
                  </a>
                ) : source.localPath && onDocumentClick ? (
                  <button
                    onClick={() => onDocumentClick(source)}
                    className="text-gray-700 hover:text-blue-600 underline decoration-dotted hover:decoration-solid transition-colors line-clamp-1 text-left"
                  >
                    {source.displayName}
                  </button>
                ) : (
                  <span className="text-gray-700 line-clamp-1">{source.displayName}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
