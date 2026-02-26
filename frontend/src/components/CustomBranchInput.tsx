import React, { useState, KeyboardEvent } from 'react';

interface CustomBranchInputProps {
    questions: string[];
    onAdd: (question: string) => void;
    onRemove: (index: number) => void;
}

const CustomBranchInput: React.FC<CustomBranchInputProps> = ({ questions, onAdd, onRemove }) => {
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !questions.includes(trimmed)) {
            onAdd(trimmed);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto mt-4">
            {/* Input row */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2c2c2c] via-[#3c3c3c] to-[#2c2c2c] rounded-full opacity-20 group-focus-within:opacity-40 transition duration-500 blur-sm" />
                    <input
                        type="text"
                        className="w-full px-5 py-2.5 rounded-full bg-[#111111] text-white/80 border border-white/10 focus:border-white/20 focus:outline-none placeholder-white/25 text-sm font-light tracking-wide"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="添加自定义分支问题..."
                    />
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!inputValue.trim()}
                    className="flex-shrink-0 w-9 h-9 rounded-full border border-white/10 bg-[#111111] text-white/50 hover:text-white/90 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    title="添加问题"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Tags */}
            {questions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {questions.map((q, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-white/15 text-white/65 text-xs font-light max-w-full group hover:border-white/25 transition-colors duration-200"
                        >
                            <span className="truncate max-w-[220px]" title={q}>{q}</span>
                            <button
                                onClick={() => onRemove(index)}
                                className="flex-shrink-0 text-white/30 hover:text-white/80 transition-colors duration-150 leading-none"
                                title="移除"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomBranchInput;
