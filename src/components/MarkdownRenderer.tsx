import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  useEffect(() => {
    document.querySelectorAll("pre code").forEach(block => {
      const pre = block.parentElement;
      if (pre && !pre.querySelector(".copy-btn")) {
        const button = document.createElement("button");
        button.innerText = "Copy";
        button.className =
          "copy-btn absolute top-1 right-1 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600";
        button.onclick = () => {
          navigator.clipboard.writeText(block.textContent || "");
          button.innerText = "Copied!";
          setTimeout(() => (button.innerText = "Copy"), 2000);
        };
        pre.style.position = "relative";
        pre.appendChild(button);
      }
    });
  }, [content]);

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      components={{
        p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-3 mb-2" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-2" {...props} />,
        code: ({ inline, ...props }:any) =>
          inline ? (
            <code className="px-1 py-0.5 bg-gray-700 rounded text-sm" {...props} />
          ) : (
            <code {...props} />
          ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
