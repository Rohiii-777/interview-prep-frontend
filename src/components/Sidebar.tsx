import React from "react";
import { api } from "../api";

export default function Sidebar({ onOpenCategory }: { onOpenCategory: () => void }) {
  return (
    <aside className="w-20 bg-gray-800 flex flex-col items-center p-4 space-y-6">
      <div className="text-2xl animate-pulse">📚</div>
      <nav className="flex flex-col space-y-4">
        <button className="text-sm hover:font-semibold">Home</button>
        <button className="text-sm hover:font-semibold">Interview Prep</button>
        <button className="text-sm hover:font-semibold">Trello</button>
      </nav>
      <div className="flex-grow" />
      <button className="p-2 rounded" onClick={onOpenCategory}>⚙️</button>

      {/* Export + Import same as before */}
      {/* ... */}
    </aside>
  );
}
