import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Download,
  Upload,
  Plus,
  Check,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import type { UserProfile } from '../types';
import {
  createNewUser,
  switchUser,
  updateUserProfile,
  exportUserDataBundle,
  importUserDataBundle
} from '../engine/auth';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChanged: (newUser: UserProfile) => void;
}

const EMOJI_OPTIONS = ['🦉', '🦊', '📖', '🚀', '💡', '🌱', '☕', '🎯', '⚡', '🧠', '🦁', '🐬'];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}) => {
  const [nickname, setNickname] = useState(currentUser?.nickname || '');
  const [selectedEmoji, setSelectedEmoji] = useState(currentUser?.avatarEmoji || '🦉');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Load all local profiles in this browser
  const allUsers = useLiveQuery(() => db.users.toArray(), []) || [];

  if (!isOpen || !currentUser) return null;

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (!nickname.trim()) return;
    await updateUserProfile(currentUser.id, {
      nickname: nickname.trim(),
      avatarEmoji: selectedEmoji,
    });
    onUserChanged({
      ...currentUser,
      nickname: nickname.trim(),
      avatarEmoji: selectedEmoji,
    });
    showToast('个人档案已保存！');
  };

  const handleCreateNewUser = async () => {
    if (!newNickname.trim()) return;
    const user = await createNewUser(newNickname.trim());
    onUserChanged(user);
    setIsCreatingNew(false);
    setNewNickname('');
    showToast(`已创建并切换至新学习者：${user.nickname}`);
  };

  const handleSwitchUser = async (targetId: string) => {
    if (targetId === currentUser.id) return;
    await switchUser(targetId);
    const target = await db.users.get(targetId);
    if (target) {
      onUserChanged(target);
      showToast(`已切换至：${target.nickname}`);
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportUserDataBundle(currentUser.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaperWords_Backup_${currentUser.nickname}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('备份数据已导出！可发送到手机恢复导入。');
    } catch (e: any) {
      alert('导出失败：' + e.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const res = await importUserDataBundle(currentUser.id, text);
      showToast(`恢复成功！已导入 ${res.decksCount} 本词书，${res.wordsCount} 条单词进度。`);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      alert('导入失败，请检查文件格式：' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#FAF9F5] w-full max-w-lg rounded-xl shadow-2xl border border-[#E5E2D8] p-5 sm:p-6 text-stone-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl p-1 bg-amber-100 rounded-lg">{currentUser.avatarEmoji || '🦉'}</span>
              <div>
                <h2 className="font-serif-academic text-base font-bold text-stone-900">
                  独立学习者档案与数据隔离
                </h2>
                <p className="text-[11px] text-stone-500 font-mono-code">
                  租户 UID: {currentUser.id} · 本地专属沙箱
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toast Notice */}
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5 font-medium"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{notice}</span>
            </motion.div>
          )}

          {/* Privacy Guarantee Banner */}
          <div className="mt-3.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">数据独立性保障：</span>
              你上传的词库与学习记录保存在你当前设备的本地浏览器中。其他公网访客拥有各自独立的沙箱空间，彼此绝对互不可见。
            </div>
          </div>

          {/* Profile Edit Section */}
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">学习者昵称</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="输入你的昵称..."
                />
                <button
                  onClick={handleSaveProfile}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs rounded-lg font-medium transition"
                >
                  保存
                </button>
              </div>
            </div>

            {/* Avatar Emoji Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">个性化头像</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      updateUserProfile(currentUser.id, { avatarEmoji: emoji });
                      onUserChanged({ ...currentUser, avatarEmoji: emoji });
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg border transition ${
                      selectedEmoji === emoji
                        ? 'bg-amber-100 border-amber-400 scale-105 shadow-2xs'
                        : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Switch Profiles / Multi-tenant Section */}
          <div className="mt-5 pt-3.5 border-t border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-700">本机已有学习者身份</span>
              <button
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-[11px] text-amber-800 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                新建独立身份
              </button>
            </div>

            {isCreatingNew && (
              <div className="p-2.5 bg-white border border-stone-300 rounded-lg mb-3 flex gap-2">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="新学习者名称 (如：小李备考研)..."
                  className="flex-1 px-2.5 py-1 text-xs border border-stone-200 rounded focus:outline-none"
                />
                <button
                  onClick={handleCreateNewUser}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-medium"
                >
                  确认创建
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u.id)}
                  className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 border transition ${
                    u.id === currentUser.id
                      ? 'bg-amber-700 text-white font-medium border-amber-700'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <span>{u.avatarEmoji || '👤'}</span>
                  <span>{u.nickname}</span>
                  {u.id === currentUser.id && <span className="text-[10px] opacity-80">(当前)</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Backup & Portability Section (跨设备同步解决方案) */}
          <div className="mt-5 pt-3.5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-800 block">多端数据迁移与备份</span>
              <span className="text-[11px] text-stone-400">导出数据包发送至手机微信即可无缝恢复</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportBackup}
                title="导出当前学习者的全部词库和打卡记录"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium border border-stone-300 transition"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>导出备份</span>
              </button>

              <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{importing ? '导入中...' : '恢复备份'}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                  disabled={importing}
                />
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
