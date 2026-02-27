import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import '../../styles/flow.css';

interface QuestionNodeData {
    label: string;
    isCustom?: boolean;
    onDeleteNode?: () => void;
}

const QuestionNode = ({ data }: NodeProps<QuestionNodeData>) => {
    return (
        <div
            className={`relative rounded-lg p-4 font-light text-sm text-left shadow-lg cursor-pointer transition-colors group ${data.isCustom
                    ? 'bg-[#1a1a1a] text-white border border-[#5a4020] shadow-[0_4px_6px_-1px_rgba(90,64,32,0.3)]'
                    : 'bg-[#1a1a1a] text-white border border-[#333]'
                }`}
            style={{
                width: 300,
                height: 100, // Fixed dimensions matching previous inline style
            }}
        >
            <Handle type="target" position={Position.Left} className="w-2 h-2 opacity-0" />

            {/* Label Box */}
            <div className="w-full h-full flex items-center pr-6">
                <span className="line-clamp-3 text-white/90">
                    {data.label}
                </span>
            </div>

            {/* Delete Button */}
            {data.onDeleteNode && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onDeleteNode!();
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded bg-black/40 text-white/40 hover:text-red-400 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Delete Node"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            <Handle type="source" position={Position.Right} className="w-2 h-2 opacity-0" />
        </div>
    );
};

export default memo(QuestionNode);
