import React, { useState } from 'react';
import {
  FolderPlus,
  Folder,
  FolderOpen,
  FilePlus,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Trash2,
  FileText,
  Search,
  BookOpen,
  Plus,
} from 'lucide-react';
import type { ArticleItem, ArticleFolder } from '../../types';
import { db } from '../../db';

interface ArticleSidebarProps {
  userId: string;
  folders: ArticleFolder[];
  articles: ArticleItem[];
  currentArticleId: string;
  onSelectArticle: (articleId: string) => void;
  onOpenCreateArticle: (targetFolderId?: string) => void;
  onOpenAIGenerate: (targetFolderId?: string) => void;
}

export const ArticleSidebar: React.FC<ArticleSidebarProps> = ({
  userId,
  folders,
  articles,
  currentArticleId,
  onSelectArticle,
  onOpenCreateArticle,
  onOpenAIGenerate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Toggle folder open/collapse
  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Create new folder
  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const newFolder: ArticleFolder = {
        id: `folder-${Date.now()}`,
        userId,
        name: newFolderName.trim(),
        createdAt: Date.now(),
      };
      await db.articleFolders.put(newFolder);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  // Delete folder (move its articles to uncategorized)
  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除该目录吗？目录内的文章将自动移入未分类。')) return;

    try {
      await db.transaction('rw', db.articleFolders, db.articles, async () => {
        await db.articleFolders.delete(folderId);
        await db.articles
          .where({ userId, folderId })
          .modify({ folderId: undefined });
      });
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  // Delete an article
  const handleDeleteArticle = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这篇精读文章吗？')) return;

    try {
      await db.articles.delete(articleId);
      if (currentArticleId === articleId) {
        const remaining = articles.filter((a) => a.id !== articleId);
        if (remaining.length > 0) {
          onSelectArticle(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  // Filter articles by search
  const filteredArticles = articles.filter((art) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return art.title.toLowerCase().includes(q) || (art.source && art.source.toLowerCase().includes(q));
  });

  // Group articles by folder
  const articlesByFolder = new Map<string, ArticleItem[]>();
  const uncategorizedArticles: ArticleItem[] = [];

  for (const art of filteredArticles) {
    if (art.folderId && folders.some((f) => f.id === art.folderId)) {
      const list = articlesByFolder.get(art.folderId) || [];
      list.push(art);
      articlesByFolder.set(art.folderId, list);
    } else {
      uncategorizedArticles.push(art);
    }
  }

  return (
    <aside className="w-full lg:w-72 bg-[#FAF8F5] border border-stone-200/80 rounded-xl shadow-xs flex flex-col shrink-0 overflow-hidden text-sm">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-stone-200/80 bg-stone-100/70">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold font-serif-academic text-stone-900 text-sm">
            <BookOpen className="w-4 h-4 text-amber-800" />
            <span>精读篇章目录 ({articles.length})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="p-1 rounded hover:bg-stone-200/70 text-stone-600 hover:text-stone-900 transition"
              title="新建文章目录"
            >
              <FolderPlus className="w-4 h-4 text-amber-700" />
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateArticle()}
              className="p-1 rounded hover:bg-stone-200/70 text-stone-600 hover:text-stone-900 transition"
              title="新建/导入文章"
            >
              <FilePlus className="w-4 h-4 text-amber-700" />
            </button>
          </div>
        </div>

        {/* Quick AI Article Generator Banner */}
        <button
          type="button"
          onClick={() => onOpenAIGenerate()}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-medium flex items-center justify-between shadow-2xs transition"
          title="自动提取今日背过的生词，由 AI 创作连贯外刊阅读文章"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>今日新词 AI 编织文章</span>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">极速巩固</span>
        </button>

        {/* Search input */}
        <div className="relative mt-2.5">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="搜索篇章或来源..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="p-2.5 bg-amber-50/70 border-b border-amber-200 flex items-center gap-1.5"
        >
          <input
            type="text"
            autoFocus
            placeholder="目录名称 (如: 考研真题)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim()}
            className="px-2 py-1 bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-white text-xs rounded font-medium"
          >
            创建
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreatingFolder(false);
              setNewFolderName('');
            }}
            className="px-1.5 py-1 text-xs text-stone-500 hover:text-stone-800"
          >
            取消
          </button>
        </form>
      )}

      {/* Directory & Article Tree List */}
      <div className="p-2 overflow-y-auto max-h-[680px] space-y-1.5">
        {/* Render User Defined Folders */}
        {folders.map((folder) => {
          const folderArticles = articlesByFolder.get(folder.id) || [];
          const isCollapsed = collapsedFolders.has(folder.id);

          return (
            <div key={folder.id} className="rounded-lg overflow-hidden">
              {/* Folder Header Row */}
              <div
                onClick={() => toggleFolder(folder.id)}
                className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-stone-200/60 rounded-md cursor-pointer transition text-xs font-semibold text-stone-800"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  )}
                  {isCollapsed ? (
                    <Folder className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                  <span className="text-[10px] text-stone-400 font-normal">
                    ({folderArticles.length})
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {/* Add article directly inside this folder */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreateArticle(folder.id);
                    }}
                    className="p-0.5 hover:bg-amber-100 rounded text-stone-600 hover:text-amber-800 transition"
                    title={`在此目录下新建文章`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    className="p-0.5 hover:bg-rose-100 rounded text-stone-400 hover:text-rose-600 transition"
                    title="删除目录"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Folder Articles */}
              {!isCollapsed && (
                <div className="ml-4 pl-2 border-l border-stone-200 space-y-0.5 mt-0.5">
                  {folderArticles.length === 0 ? (
                    <div
                      onClick={() => onOpenCreateArticle(folder.id)}
                      className="py-1 px-2 text-[11px] text-stone-400 hover:text-amber-800 cursor-pointer italic"
                    >
                      + 点击添加此目录文章
                    </div>
                  ) : (
                    folderArticles.map((art) => {
                      const isActive = art.id === currentArticleId;
                      return (
                        <div
                          key={art.id}
                          onClick={() => onSelectArticle(art.id)}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-xs transition ${
                            isActive
                              ? 'bg-amber-100/90 text-amber-950 font-bold border-l-2 border-amber-700'
                              : 'hover:bg-stone-200/60 text-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className={`w-3 h-3 shrink-0 ${isActive ? 'text-amber-800' : 'text-stone-400'}`} />
                            <span className="truncate">{art.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteArticle(art.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-100 rounded text-stone-400 hover:text-rose-600 transition shrink-0"
                            title="删除文章"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized Articles */}
        {uncategorizedArticles.length > 0 && (
          <div className="rounded-lg overflow-hidden pt-1">
            <div className="px-2.5 py-1 text-xs font-semibold text-stone-500 flex items-center justify-between">
              <span>未分类篇章 ({uncategorizedArticles.length})</span>
            </div>
            <div className="ml-2 space-y-0.5">
              {uncategorizedArticles.map((art) => {
                const isActive = art.id === currentArticleId;
                return (
                  <div
                    key={art.id}
                    onClick={() => onSelectArticle(art.id)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-xs transition ${
                      isActive
                        ? 'bg-amber-100/90 text-amber-950 font-bold border-l-2 border-amber-700'
                        : 'hover:bg-stone-200/60 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className={`w-3 h-3 shrink-0 ${isActive ? 'text-amber-800' : 'text-stone-400'}`} />
                      <span className="truncate">{art.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteArticle(art.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-100 rounded text-stone-400 hover:text-rose-600 transition shrink-0"
                      title="删除文章"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {articles.length === 0 && (
          <div className="text-center py-8 text-stone-400 text-xs">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-stone-300" />
            <p>尚未导入任何文章</p>
            <p className="mt-1">点击上方按钮新建或由 AI 自动编织</p>
          </div>
        )}
      </div>
    </aside>
  );
};
