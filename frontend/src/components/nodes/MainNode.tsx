import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import { BounceCards } from '../ui/bounce-cards';
import '../../styles/flow.css';

interface MainNodeData {
  label: string;
  content: string;
  images?: string[];
  sources?: Array<{
    title: string;
    url: string;
    thumbnail?: string;
  }>;
  onAskFollowUp?: () => void;
  onDeleteNode?: () => void;
}

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyIDQtMiA0LTIiLz48bGluZSB4MT0iOSIgeTE9IjkiIHgyPSI5LjAxIiB5Mj0iOSIvPjxsaW5lIHgxPSIxNSIgeTE9IjkiIHgyPSIxNS4wMSIgeTI9IjkiLz48L3N2Zz4='; // fallback icon
  }
};

const transformStyles = [
  "rotate(-15deg) translate(-200px, -50px)",
  "rotate(-5deg) translate(-100px, -25px)",
  "rotate(0deg)",
  "rotate(5deg) translate(100px, -25px)",
  "rotate(15deg) translate(200px, -50px)"
];

const MainNode = ({ data }: NodeProps<MainNodeData>) => {
  return (
    <div className="relative bg-[#1a1a1a] rounded-lg border border-black shadow-lg min-h-[500px] max-h-[550px] flex flex-col group">
      <Handle type="target" position={Position.Left} className="w-2 h-2" />

      {/* Delete Button */}
      {data.onDeleteNode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDeleteNode!();
          }}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/40 text-white/40 hover:text-red-400 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Delete Node"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {data.images && data.images.length > 0 && (
        <div className="flex-none bg-[#1a1a1a] p-6">
          <BounceCards
            images={data.images.slice(0, 5)}
            containerWidth={500}
            containerHeight={120}
            animationDelay={0.3}
            animationStagger={0.1}
            easeType="elastic.out(1, 0.7)"
            transformStyles={transformStyles}
            className="pl-48 transform scale-90"
          />
        </div>
      )}

      <div className={`flex-1 overflow-y-auto custom-scrollbar bg-[#1a1a1a] flex items-start justify-center`}>
        {data.content === 'Loading...' ? (
          <div className="flex flex-col items-center justify-center space-y-8 p-6">
            <div className="relative">
              <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <svg className="w-24 h-24 absolute top-0 left-0 animate-reverse-spin" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5">
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-3 text-center">
              <div className="font-mystical text-lg text-white/70 tracking-[0.2em] animate-pulse">
                SEEKING WISDOM
              </div>
              <div className="text-sm text-white/40 tracking-wider">
                Traversing the depths of knowledge...
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto w-full">
            <div className="prose prose-invert prose-sm max-w-none break-words">
              <ReactMarkdown>
                {data.content}
              </ReactMarkdown>
            </div>
            {data.sources && data.sources.length > 0 && (
              <div className="mt-6 border-t border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Sources</h3>
                <div className="grid grid-cols-1 gap-3">
                  {data.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group break-all"
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-800 rounded overflow-hidden">
                        <img
                          src={getFaviconUrl(source.url)}
                          alt=""
                          className="w-4 h-4 group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white flex-1 break-words">
                        {source.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Ask Follow Up button */}
        {data.onAskFollowUp && data.content !== 'Loading...' && (
          <div className="flex-none border-t border-white/5 px-6 py-3">
            <button
              onClick={(e) => { e.stopPropagation(); data.onAskFollowUp!(); }}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors duration-200 group"
            >
              <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              Ask Follow Up
            </button>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
};

export default memo(MainNode); 