// src/App.tsx
import { useEffect, useState, useCallback  } from "react";
import { api } from "./api";
import { debounce } from "lodash";
import QnaCard from "./components/QnaCard";
type Category = { id: number; name: string };
type Qna = { id: number; question: string; answer?: string; is_done: boolean; bookmark: boolean; category_id?: number };

export default function App() {
  const [qnas, setQnas] = useState<Qna[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | "">("");
  const [filterDone, setFilterDone] = useState<"" | boolean>("");
  const [filterBookmark, setFilterBookmark] = useState<"" | boolean>("");
  const [darkMode, setDarkMode] = useState(true);

  const [openQnaModal, setOpenQnaModal] = useState(false);
  const [editingQna, setEditingQna] = useState<Qna | null>(null);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [expandedIds, setExpandedIds] = useState<number[]>([]);


  const load = async () => {
    const params: any = {};
    if (filterCategory !== "") params.category_id = filterCategory;
    if (filterDone !== "") params.is_done = filterDone;
    if (filterBookmark !== "") params.bookmark = filterBookmark;
    if (search) params.search = search;

    const [qs, cs] = await Promise.all([
      api.get("/qnas/", { params }),
      api.get("/categories/"),
    ]);
        setQnas(qs.data);
    setCategories(cs.data);
  };

  const debouncedLoad = useCallback(debounce(load, 1000), [
  filterCategory,
  filterDone,
  filterBookmark,
  search,
]);

  useEffect(() => { debouncedLoad(); }, [filterCategory, filterDone, filterBookmark, search]);

  const openCreateQna = () => {
    setEditingQna({ id: 0, question: "", answer: "", is_done: false, bookmark: false });
    setOpenQnaModal(true);
  };

  const openEditQna = (q: Qna) => {
    setEditingQna(q);
    setOpenQnaModal(true);
  };

  const saveQna = async () => {
    if (!editingQna) return;
    if (editingQna.id && editingQna.id > 0) {
      await api.put(`/qnas/${editingQna.id}`, editingQna);
    } else {
      await api.post(`/qnas/`, editingQna);
    }
    setOpenQnaModal(false);
    setEditingQna(null);
    await load();
  };

  const deleteQna = async (id: number) => {
    if (!confirm("Delete this question?")) return;
    await api.delete(`/qnas/${id}`);
    await load();
  };

  const toggleBookmark = async (id: number) => {
    await api.patch(`/qnas/${id}/bookmark`);
    await load();
  };

  const toggleDone = async (id: number, done: boolean) => {
    await api.patch(`/qnas/${id}/mark?done=${!done}`);
    await load();
  };

  const saveCategory = async () => {
    if (!categoryName) return;
    if (editingCategory) {
      await api.put(`/categories/${editingCategory.id}`, { name: categoryName });
    } else {
      await api.post(`/categories/`, { name: categoryName });
    }
    setCategoryName("");
    setEditingCategory(null);
    await load();
  };

  const editCategory = (c: Category) => {
    setEditingCategory(c);
    setCategoryName(c.name);
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Delete this category and its QnAs?")) return;
    await api.delete(`/categories/${id}`);
    await load();
  };

  const getCategoryName = (id?: number) => categories.find(c => c.id === id)?.name || "";

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className={darkMode ? "bg-black text-gray-100 flex h-screen transition-colors duration-500" : "bg-white text-gray-900 flex h-screen transition-colors duration-500"}>
      {/* Sidebar */}
<aside
  className={`w-20 flex flex-col items-center py-6 px-3 transition-colors duration-500 ${
    darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-800"
  }`}
>
  {/* Logo */}
  <div className="text-3xl animate-pulse">📚</div>

  {/* Nav */}
  <nav className="flex flex-col items-center space-y-6 mt-10">
    <button className="text-xs font-medium hover:scale-105 transition">
      🏠 <span className="sr-only">Home</span>
    </button>
    <button className="text-xs font-medium hover:scale-105 transition">
      🎯 <span className="sr-only">Interview Prep</span>
    </button>
    <button className="text-xs font-medium hover:scale-105 transition">
      🗂️ <span className="sr-only">Trello</span>
    </button>
  </nav>

  {/* Spacer */}
  <div className="flex-grow" />

  {/* Settings */}
  <button
    className="p-2 rounded-lg hover:bg-gray-700/20 transition"
    onClick={() => setOpenCategoryModal(true)}
  >
    ⚙️
  </button>

  {/* Export Buttons */}
  <div className="flex flex-col space-y-2 mt-6 w-full">
    <button
      onClick={async () => {
        const res = await api.get("/bulk/export/json");
        const blob = new Blob([JSON.stringify(res.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "qna_backup.json";
        a.click();
      }}
      className="w-full text-xs py-2 rounded bg-blue-500 hover:bg-blue-400 text-white transition"
    >
      JSON ⬇️
    </button>

    <button
      onClick={async () => {
        const res = await api.get("/bulk/export/csv");
        const blob = new Blob([res.data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "qna_backup.csv";
        a.click();
      }}
      className="w-full text-xs py-2 rounded bg-green-500 hover:bg-green-400 text-white transition"
    >
      CSV ⬇️
    </button>
  </div>

  {/* Import Buttons */}
  <div className="flex flex-col space-y-2 mt-4 w-full">
    <label className="w-full text-xs py-2 rounded bg-purple-500 hover:bg-purple-400 text-white text-center cursor-pointer transition">
      JSON ⬆️
      <input
        type="file"
        accept=".json"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files?.length) {
            const formData = new FormData();
            formData.append("file", e.target.files[0]);
            await api.post("/bulk/import/json", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            alert("JSON import successful!");
          }
        }}
      />
    </label>

    <label className="w-full text-xs py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-white text-center cursor-pointer transition">
      CSV ⬆️
      <input
        type="file"
        accept=".csv"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files?.length) {
            const formData = new FormData();
            formData.append("file", e.target.files[0]);
            await api.post("/bulk/import/csv", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            alert("CSV import successful!");
          }
        }}
      />
    </label>
  </div>
</aside>
      {/* Main */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Topbar */}
        <header className="flex justify-between items-center mb-4">
          <div className="flex space-x-2 items-center">
            <input type="text" placeholder="Search" className={`px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? "bg-gray-800 text-gray-100" : "bg-gray-200 text-gray-900"}`} value={search} onChange={e => setSearch(e.target.value)} />
            <select className={`px-2 py-2 rounded-md focus:ring-2 focus:ring-blue-500 transition ${darkMode ? "bg-gray-800 text-gray-100" : "bg-gray-200 text-gray-900"}`} value={filterDone.toString()} onChange={e => setFilterDone(e.target.value === "" ? "" : e.target.value === "true") }>
              <option value="">All</option>
              <option value="true">Done</option>
              <option value="false">Not done</option>
            </select>
            <select className={`px-2 py-2 rounded-md focus:ring-2 focus:ring-blue-500 transition ${darkMode ? "bg-gray-800 text-gray-100" : "bg-gray-200 text-gray-900"}`} value={filterBookmark.toString()} onChange={e => setFilterBookmark(e.target.value === "" ? "" : e.target.value === "true") }>
              <option value="">All</option>
              <option value="true">Bookmarked</option>
              <option value="false">Not Bookmarked</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <button onClick={() => setDarkMode(!darkMode)} className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition transform hover:scale-105">{darkMode ? "🌙" : "☀️"}</button>
            <button onClick={openCreateQna} className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition transform hover:scale-105">Add Question</button>
          </div>
        </header>

        {/* Category bubbles */}
        <div className="flex space-x-2 mb-4 flex-wrap">
          <button onClick={() => setFilterCategory("")} className={`px-3 py-1 rounded-full transition transform hover:scale-105 ${filterCategory===""?"bg-blue-600 text-white":"bg-gray-500 text-gray-100 hover:bg-gray-400"}`}>All</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setFilterCategory(c.id)} className={`px-3 py-1 rounded-full transition transform hover:scale-105 ${filterCategory===c.id?"bg-blue-600 text-white":"bg-gray-500 text-gray-100 hover:bg-gray-400"}`}>{c.name}</button>
          ))}
        </div>

        {/* Full-width Cards with collapsible answers */}
<div className="space-y-4">
  {qnas.map(q => {
    const isExpanded = expandedIds.includes(q.id);
    return (
      <QnaCard
        key={q.id}
        qna={q}
        categoryName={getCategoryName(q.category_id)}
        isExpanded={isExpanded}
        onToggleExpand={() => toggleExpand(q.id)}
        onEdit={() => openEditQna(q)}
        onDelete={() => deleteQna(q.id)}
        onToggleBookmark={() => toggleBookmark(q.id)}
        onToggleDone={() => toggleDone(q.id, q.is_done)}
        darkMode={darkMode}
      />
    );
  })}
</div>


       

      </main>

      {/* QnA Modal */}
      {openQnaModal && editingQna && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center animate-fadeIn">
          <div className={`${darkMode?"bg-gray-900":"bg-white"} rounded-lg p-6 w-full max-w-2xl transform transition-all scale-95 animate-slideUp`}>
            <h2 className="text-lg mb-4 font-semibold">{editingQna.id && editingQna.id>0 ? 'Edit Question' : 'Add Question'}</h2>
            <textarea className={`w-full mb-2 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 transition ${darkMode?"bg-gray-800 text-gray-100":"bg-gray-200 text-gray-900"}`} placeholder="Question" rows={3} value={editingQna.question} onChange={e => setEditingQna({...editingQna, question: e.target.value})} />
            <textarea className={`w-full mb-2 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 transition ${darkMode?"bg-gray-800 text-gray-100":"bg-gray-200 text-gray-900"}`} placeholder="Answer" rows={8} value={editingQna.answer} onChange={e => setEditingQna({...editingQna, answer: e.target.value})} />
            <select className={`w-full mb-2 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 transition ${darkMode?"bg-gray-800 text-gray-100":"bg-gray-200 text-gray-900"}`} value={editingQna.category_id || ''} onChange={e => setEditingQna({...editingQna, category_id: e.target.value?Number(e.target.value):undefined})}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2"><input type="checkbox" checked={editingQna.is_done} onChange={e => setEditingQna({...editingQna, is_done:e.target.checked})}/> <span>Done</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={editingQna.bookmark} onChange={e => setEditingQna({...editingQna, bookmark:e.target.checked})}/> <span>Bookmark</span></label>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={saveQna} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white transition">Save</button>
              <button onClick={()=>{setOpenQnaModal(false);setEditingQna(null)}} className="px-3 py-2 bg-gray-500 hover:bg-gray-400 rounded text-white transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {openCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center animate-fadeIn">
          <div className={`${darkMode?"bg-gray-900":"bg-white"} rounded-lg p-6 w-80 transform transition-all scale-95 animate-slideUp`}>
            <h2 className="text-lg mb-4 font-semibold">Manage Categories</h2>
            <div className="flex space-x-2 mb-4">
              <input className={`flex-1 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 transition ${darkMode?"bg-gray-800 text-gray-100":"bg-gray-200 text-gray-900"}`} placeholder="Category name" value={categoryName} onChange={e => setCategoryName(e.target.value)} />
              <button onClick={saveCategory} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white transition">{editingCategory?'Update':'Add'}</button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c=>(
                <li key={c.id} className={`flex justify-between items-center p-2 rounded transition ${darkMode?"bg-gray-800 hover:bg-gray-700":"bg-gray-200 hover:bg-gray-300"}`}>
                  <span>{c.name}</span>
                  <div className="flex space-x-2">
                    <button onClick={()=>editCategory(c)} className="px-2 py-1 bg-gray-500 hover:bg-gray-400 rounded text-white transition">✏️</button>
                    <button onClick={()=>deleteCategory(c.id)} className="px-2 py-1 bg-red-500 hover:bg-red-400 rounded text-white transition">🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button onClick={()=>setOpenCategoryModal(false)} className="px-3 py-2 bg-gray-500 hover:bg-gray-400 rounded text-white transition">Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from {opacity:0} to {opacity:1} }
        @keyframes slideUp { from {transform:translateY(20px); opacity:0} to {transform:translateY(0); opacity:1} }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}