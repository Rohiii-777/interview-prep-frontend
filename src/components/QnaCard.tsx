import MarkdownRenderer from "./MarkdownRenderer";
import { useState, useEffect, useRef } from "react";

// Enhanced Props with new features
type Props = {
  qna: {
    id: number;
    question: string;
    answer?: string;
    is_done: boolean;
    bookmark: boolean;
    category_id?: number;
    difficulty?: number; // 1-5 stars
    tags?: string[];
    notes?: string;
    study_count?: number;
    last_studied?: string;
    next_review?: string;
    performance_score?: number; // 0-100
    time_spent?: number; // in seconds
    related_cards?: number[];
  };
  categoryName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleBookmark: () => void;
  onToggleDone: () => void;
  darkMode: boolean;
  searchTerm?: string;
  onUpdateCard?: (updates: Partial<Props['qna']>) => void;
  relatedCards?: Props['qna'][];
  onExport?: (format: 'pdf' | 'markdown') => void;
};

const QnaCard: React.FC<Props> = ({
  qna,
  categoryName,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleBookmark,
  onToggleDone,
  darkMode,
  searchTerm = "",
  onUpdateCard,
  relatedCards = [],
  onExport,
}) => {
  // State management
  const [isHovered, setIsHovered] = useState(false);
  const [codeView, setCodeView] = useState(false);
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const [studyTimer, setStudyTimer] = useState(0);
  const [isStudying, setIsStudying] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(qna.notes || "");
  const [showRelated, setShowRelated] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [performanceRating, setPerformanceRating] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize flashcard mode
  useEffect(() => {
    if (flashcardMode) {
      setShowAnswer(false);
    } else {
      setShowAnswer(true);
    }
  }, [flashcardMode]);

  // Study timer effect
  useEffect(() => {
    if (isStudying) {
      timerRef.current = setInterval(() => {
        setStudyTimer(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      if (studyTimer > 0 && onUpdateCard) {
        onUpdateCard({
          time_spent: (qna.time_spent || 0) + studyTimer,
          study_count: (qna.study_count || 0) + 1,
          last_studied: new Date().toISOString(),
        });
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStudying, studyTimer, onUpdateCard, qna.time_spent, qna.study_count]);

  // Cleanup speech synthesis
  useEffect(() => {
    return () => {
      if (speechRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const preview = qna.answer && qna.answer.length > 150
    ? qna.answer.slice(0, 150) + "..."
    : qna.answer;

  // Extract code blocks with enhanced parsing
  const extractCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const matches = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      matches.push({
        type: 'block',
        language: match[1] || 'text',
        code: match[2].trim(),
        full: match[0],
        id: matches.length
      });
    }

    const inlineMatches = [...content.matchAll(inlineCodeRegex)];
    inlineMatches.forEach(match => {
      matches.push({
        type: 'inline',
        language: 'text',
        code: match[1],
        full: match[0],
        id: matches.length
      });
    });

    return matches;
  };

  const codeBlocks = qna.answer ? extractCodeBlocks(qna.answer) : [];
  const hasCode = codeBlocks.length > 0;

  // Highlight search terms
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>');
  };

  // Spaced repetition calculation
  const calculateNextReview = (performance: number) => {
    const intervals = [1, 3, 7, 14, 30, 90]; // days
    const currentInterval = Math.min(Math.floor(performance / 20), intervals.length - 1);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervals[currentInterval]);
    return nextReview.toISOString();
  };

  // Performance rating handler
  const handlePerformanceRating = (rating: number) => {
    setPerformanceRating(rating);
    if (onUpdateCard) {
      onUpdateCard({
        performance_score: rating,
        next_review: calculateNextReview(rating),
        last_studied: new Date().toISOString(),
      });
    }
    setTimeout(() => setPerformanceRating(null), 2000);
  };

  // Copy code function
  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Text-to-speech function
  const toggleSpeech = () => {
    if (isReading) {
      speechSynthesis.cancel();
      setIsReading(false);
    } else if (qna.answer) {
      const utterance = new SpeechSynthesisUtterance(qna.answer);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      speechRef.current = utterance;
      speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  // Export functions
  const handleExport = (format: 'pdf' | 'markdown') => {
    if (onExport) {
      onExport(format);
    } else {
      // Fallback: create downloadable content
      if (format === 'markdown') {
        const content = `# ${qna.question}\n\n${qna.answer || 'No answer yet'}\n\n---\n**Category:** ${categoryName}\n**Tags:** ${qna.tags?.join(', ') || 'None'}\n**Difficulty:** ${'★'.repeat(qna.difficulty || 0)}${'☆'.repeat(5 - (qna.difficulty || 0))}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qna-${qna.id}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  // Utility functions
  const estimateReadTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: number) => {
    const colors = ['text-green-500', 'text-yellow-500', 'text-orange-500', 'text-red-500', 'text-purple-500'];
    return colors[difficulty - 1] || 'text-gray-400';
  };

  // Card styling
  const getCardStyle = () => {
    const base = `relative rounded-xl border p-4 transition-all duration-300 group ${
      isHovered ? "shadow-lg -translate-y-1" : "shadow-sm hover:shadow-md"
    }`;
    
    if (qna.is_done) {
      return `${base} ${darkMode 
        ? "bg-green-900/20 border-green-600/30 hover:bg-green-900/30" 
        : "bg-green-50 border-green-200 hover:bg-green-100"}`;
    }
    if (qna.bookmark) {
      return `${base} ${darkMode 
        ? "bg-amber-900/20 border-amber-600/30 hover:bg-amber-900/30" 
        : "bg-amber-50 border-amber-200 hover:bg-amber-100"}`;
    }
    if (qna.next_review && new Date(qna.next_review) <= new Date()) {
      return `${base} ${darkMode 
        ? "bg-blue-900/20 border-blue-600/30 hover:bg-blue-900/30" 
        : "bg-blue-50 border-blue-200 hover:bg-blue-100"}`;
    }
    return `${base} ${darkMode 
      ? "bg-gray-800 border-gray-700 hover:bg-gray-750" 
      : "bg-white border-gray-200 hover:bg-gray-50"}`;
  };

  const getTextColor = () => darkMode ? "text-gray-100" : "text-gray-900";
  const getSecondaryColor = () => darkMode ? "text-gray-400" : "text-gray-600";

  return (
    <div
      className={getCardStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Indicators */}
      <div className="absolute top-2 right-2 flex space-x-1">
        {qna.is_done && <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Completed"></div>}
        {qna.bookmark && <div className="w-3 h-3 bg-amber-500 rounded-full" title="Bookmarked"></div>}
        {hasCode && <div className="w-3 h-3 bg-purple-500 rounded-full" title="Contains Code"></div>}
        {qna.next_review && new Date(qna.next_review) <= new Date() && 
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" title="Due for Review"></div>}
      </div>

      {/* Study Timer */}
      {isStudying && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
          {formatTime(studyTimer)}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={qna.is_done}
            onChange={onToggleDone}
            className="mt-1 h-4 w-4 text-blue-500 rounded focus:ring-1 focus:ring-blue-400"
          />
          
          <div className="flex-1">
            <h3 
              className={`font-semibold text-base leading-snug ${getTextColor()} ${
                qna.is_done ? "line-through opacity-60" : ""
              }`}
              dangerouslySetInnerHTML={{
                __html: highlightText(qna.question, searchTerm)
              }}
            />
            
            {/* Difficulty Rating */}
            {qna.difficulty && (
              <div className={`flex items-center space-x-1 mt-1 ${getDifficultyColor(qna.difficulty)}`}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-sm">
                    {i < qna.difficulty! ? '★' : '☆'}
                  </span>
                ))}
              </div>
            )}

            {/* Tags */}
            {qna.tags && qna.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {qna.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {categoryName && (
          <span className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            darkMode ? "bg-blue-600/30 text-blue-300" : "bg-blue-100 text-blue-700"
          }`}>
            {categoryName}
          </span>
        )}
      </div>

      {/* Advanced Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center space-x-2">
          {/* Study Mode Toggle */}
          <button
            onClick={() => setIsStudying(!isStudying)}
            className={`px-2 py-1 rounded-md font-medium transition ${
              isStudying
                ? "bg-red-500 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {isStudying ? "Stop Study" : "Start Study"}
          </button>

          {/* Flashcard Mode */}
          <button
            onClick={() => setFlashcardMode(!flashcardMode)}
            className={`px-2 py-1 rounded-md font-medium transition ${
              flashcardMode
                ? "bg-indigo-500 text-white"
                : darkMode
                ? "bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50"
                : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            }`}
          >
            Flashcard
          </button>

          {hasCode && (
            <button
              onClick={() => setCodeView(!codeView)}
              className={`px-2 py-1 rounded-md font-medium transition ${
                codeView
                  ? "bg-purple-500 text-white"
                  : darkMode
                  ? "bg-purple-600/30 text-purple-300 hover:bg-purple-600/50"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
            >
              {codeView ? "Text" : "Code"} ({codeBlocks.length})
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Voice Reading */}
          {qna.answer && (
            <button
              onClick={toggleSpeech}
              className={`p-1 rounded-md transition ${
                isReading
                  ? "text-green-500 bg-green-500/20"
                  : darkMode
                  ? "text-gray-400 hover:text-green-400 hover:bg-green-400/20"
                  : "text-gray-500 hover:text-green-600 hover:bg-green-100"
              }`}
              title={isReading ? "Stop reading" : "Read aloud"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M6 17H4a2 2 0 01-2-2v-6a2 2 0 012-2h2m0 10v-2m0-8v2m4 8l4-4-4-4v8z" />
              </svg>
            </button>
          )}

          {qna.answer && estimateReadTime(qna.answer) > 0 && (
            <span className={getSecondaryColor()}>
              {estimateReadTime(qna.answer)} min read
            </span>
          )}

          {qna.answer && qna.answer.length > 150 && (
            <button
              onClick={onToggleExpand}
              className={`px-2 py-1 rounded-md transition ${
                darkMode 
                  ? "text-blue-400 hover:bg-blue-600/20" 
                  : "text-blue-600 hover:bg-blue-100"
              }`}
            >
              {isExpanded ? "Less" : "More"}
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {qna.answer ? (
        <div className="mb-3">
          {flashcardMode ? (
            // Flashcard Mode
            <div className={`text-center py-8 rounded-lg border-2 border-dashed cursor-pointer ${
              darkMode ? "border-gray-600 hover:border-gray-500" : "border-gray-300 hover:border-gray-400"
            }`} onClick={() => setShowAnswer(!showAnswer)}>
              {showAnswer ? (
                <div className={`prose prose-sm max-w-none ${darkMode ? "prose-invert" : ""}`}>
                  <MarkdownRenderer content={qna.answer} />
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">🤔</div>
                  <span className={getSecondaryColor()}>Click to reveal answer</span>
                </div>
              )}
            </div>
          ) : codeView && hasCode ? (
            // Code-only view
            <div className="space-y-3">
              {codeBlocks.map((block, index) => (
                <div key={index} className={`rounded-lg overflow-hidden ${
                  darkMode ? "bg-gray-900 border border-gray-700" : "bg-gray-100 border border-gray-200"
                }`}>
                  <div className={`px-3 py-1 text-xs font-medium flex justify-between items-center ${
                    darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"
                  }`}>
                    <span>{block.language.toUpperCase()}</span>
                    <div className="flex items-center space-x-2">
                      <span className="opacity-60">{block.type}</span>
                      <button
                        onClick={() => copyCode(block.code, index)}
                        className={`p-1 rounded hover:bg-gray-600 transition ${
                          copiedCode === index ? "text-green-400" : ""
                        }`}
                        title="Copy code"
                      >
                        {copiedCode === index ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <pre className={`p-3 text-sm overflow-x-auto ${
                    darkMode ? "text-green-400" : "text-blue-800"
                  }`}>
                    <code>{block.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            // Normal markdown view with proper rendering
            <div
              className={`transition-all duration-300 ${
                isExpanded ? "" : "relative"
              }`}
              style={{
                maxHeight: isExpanded ? "none" : "6rem",
                overflow: "hidden",
              }}
            >
              <div className={`prose prose-sm max-w-none ${
                darkMode 
                  ? "prose-invert prose-pre:bg-gray-800 prose-code:bg-gray-800 prose-code:text-green-400 prose-code:px-1 prose-code:py-0.5 prose-code:rounded" 
                  : "prose-pre:bg-gray-100 prose-code:bg-gray-100 prose-code:text-blue-600 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
              } prose-headings:text-current prose-p:text-current prose-strong:text-current prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700`}>
                <MarkdownRenderer content={isExpanded ? qna.answer : preview || ""} />
              </div>
              
              {/* Fade overlay for collapsed state */}
              {!isExpanded && qna.answer && qna.answer.length > 150 && (
                <div className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none ${
                  darkMode 
                    ? "bg-gradient-to-t from-gray-800 to-transparent" 
                    : "bg-gradient-to-t from-white to-transparent"
                }`}></div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center py-4 rounded-lg border-2 border-dashed ${
          darkMode ? "border-gray-600 text-gray-500" : "border-gray-300 text-gray-400"
        }`}>
          <span className="text-sm italic">No answer yet</span>
        </div>
      )}

      {/* Performance Rating (appears after study session) */}
      {isStudying && qna.answer && (
        <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm mb-2">How well did you understand this?</p>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handlePerformanceRating(rating * 20)}
                className={`px-3 py-1 rounded-md text-sm transition ${
                  performanceRating === rating * 20
                    ? "bg-blue-500 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {rating === 1 ? "😰" : rating === 2 ? "😕" : rating === 3 ? "😐" : rating === 4 ? "😊" : "😍"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      {showNotes && (
        <div className="mb-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add your personal notes..."
            className={`w-full p-2 rounded-md border text-sm resize-none ${
              darkMode 
                ? "bg-gray-800 border-gray-600 text-gray-100" 
                : "bg-white border-gray-300 text-gray-900"
            }`}
            rows={3}
            onBlur={() => {
              if (onUpdateCard && noteText !== qna.notes) {
                onUpdateCard({ notes: noteText });
              }
            }}
          />
        </div>
      )}

      {/* Related Cards */}
      {showRelated && relatedCards.length > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
          <h4 className="text-sm font-medium mb-2">Related Questions</h4>
          <div className="space-y-2">
            {relatedCards.slice(0, 3).map((card) => (
              <div key={card.id} className="text-sm p-2 rounded bg-white dark:bg-gray-800 border">
                {card.question}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <h4 className="text-sm font-medium mb-2">Study Analytics</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Study Count: {qna.study_count || 0}</div>
            <div>Time Spent: {formatTime(qna.time_spent || 0)}</div>
            <div>Performance: {qna.performance_score || 0}%</div>
            <div>Last Studied: {qna.last_studied ? new Date(qna.last_studied).toLocaleDateString() : 'Never'}</div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1">
          {/* Additional Feature Toggles */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              showNotes || qna.notes
                ? darkMode
                  ? "text-yellow-400 bg-yellow-600/20"
                  : "text-yellow-600 bg-yellow-100"
                : darkMode
                ? "text-gray-400 hover:text-yellow-400 hover:bg-yellow-600/20"
                : "text-gray-500 hover:text-yellow-600 hover:bg-yellow-100"
            }`}
            title="Personal notes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={() => setShowRelated(!showRelated)}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              showRelated
                ? darkMode
                  ? "text-purple-400 bg-purple-600/20"
                  : "text-purple-600 bg-purple-100"
                : darkMode
                ? "text-gray-400 hover:text-purple-400 hover:bg-purple-600/20"
                : "text-gray-500 hover:text-purple-600 hover:bg-purple-100"
            }`}
            title="Related cards"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              showAnalytics
                ? darkMode
                  ? "text-green-400 bg-green-600/20"
                  : "text-green-600 bg-green-100"
                : darkMode
                ? "text-gray-400 hover:text-green-400 hover:bg-green-600/20"
                : "text-gray-500 hover:text-green-600 hover:bg-green-100"
            }`}
            title="Study analytics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14" />
            </svg>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                darkMode
                ? "text-gray-400 hover:text-gray-300 hover:bg-gray-600/20"
                : "text-gray-500 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title="Export options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>

          {/* Code block stats */}
          {hasCode && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              darkMode ? "bg-purple-600/20 text-purple-300" : "bg-purple-100 text-purple-600"
            }`}>
              {codeBlocks.filter(b => b.type === 'block').length}B/{codeBlocks.filter(b => b.type === 'inline').length}I
            </span>
          )}
        </div>

        {/* Main Action Buttons */}
        <div className="flex space-x-1">
          {/* Edit Button */}
          <button
            onClick={onEdit}
            className={`p-2 rounded-md transition-all duration-200 ${
              darkMode 
                ? "text-gray-400 hover:text-blue-400 hover:bg-blue-600/20" 
                : "text-gray-500 hover:text-blue-600 hover:bg-blue-100"
            }`}
            title="Edit question/answer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={onToggleBookmark}
            className={`p-2 rounded-md transition-all duration-200 ${
              qna.bookmark
                ? darkMode
                  ? "text-amber-400 bg-amber-600/20"
                  : "text-amber-600 bg-amber-100"
                : darkMode
                ? "text-gray-400 hover:text-amber-400 hover:bg-amber-600/20"
                : "text-gray-500 hover:text-amber-600 hover:bg-amber-100"
            }`}
            title={qna.bookmark ? "Remove bookmark" : "Add bookmark"}
          >
            <svg className="w-4 h-4" fill={qna.bookmark ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Export Menu */}
          <div className="relative">
            <button
              className={`p-2 rounded-md transition-all duration-200 ${
                darkMode 
                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-600/20" 
                  : "text-gray-500 hover:text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => handleExport('markdown')}
              title="Export as markdown"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </button>
          </div>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className={`p-2 rounded-md transition-all duration-200 ${
              darkMode 
                ? "text-gray-400 hover:text-red-400 hover:bg-red-600/20" 
                : "text-gray-500 hover:text-red-600 hover:bg-red-100"
            }`}
            title="Delete card"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Study Progress Minimap */}
      {qna.answer && (qna.study_count || 0) > 0 && (
        <div className="absolute -bottom-1 left-4 right-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-1000"
            style={{ 
              width: `${Math.min(100, (qna.performance_score || 0))}%` 
            }}
          ></div>
        </div>
      )}

      {/* Spaced Repetition Notification */}
      {qna.next_review && new Date(qna.next_review) <= new Date() && (
        <div className="absolute -top-2 -left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full animate-bounce">
          📚 Review Due!
        </div>
      )}

      {/* Performance Feedback */}
      {performanceRating !== null && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          Rating: {performanceRating}% 
          {performanceRating >= 80 ? " 🎉" : performanceRating >= 60 ? " 👍" : " 💪"}
        </div>
      )}
    </div>
  );
};

export default QnaCard;