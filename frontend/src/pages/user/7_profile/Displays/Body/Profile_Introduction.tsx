import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Edit2, Check, Bold, Italic, List, Eye, EyeOff, Play, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/axios.ts";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryItem } from "./Profile_Gallery";
import { GalleryLightbox } from "./GalleryLightbox";
import { GalleryEditModal } from "../../Edits/GalleryEditModal";

interface ProfileIntroductionProps {
  introduction?: string;
  isOwner?: boolean;
  onSave?: (newIntro: string) => void;
  accountId?: string;
  onViewMoreGallery?: () => void;
}

// Helper to construct asset URL
const constructAssetUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
};

export const Profile_Introduction: React.FC<ProfileIntroductionProps> = ({ introduction, isOwner, onSave, accountId, onViewMoreGallery }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(introduction || "");
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [featuredWorks, setFeaturedWorks] = useState<GalleryItem[]>([]);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<GalleryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);

  const fetchFeaturedWorks = () => {
    if (accountId) {
      api.get(`/api/accounts/${accountId}/galleries`)
        .then(res => setFeaturedWorks(res.data.slice(0, 3)))
        .catch(err => console.error("Failed to fetch featured works:", err));
    }
  };

  useEffect(() => {
    fetchFeaturedWorks();
  }, [accountId]);

  const handleEdit = (item: GalleryItem) => {
    setItemToEdit(item);
  };

  const handleDeleteClick = (item: GalleryItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/api/accounts/galleries/${itemToDelete.gallery_id}`);
      toast.success("Gallery item deleted successfully");
      setItemToDelete(null);
      setSelectedGalleryItem(null);
      fetchFeaturedWorks();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete gallery item");
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selected + suffix + after;
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const original = { introduction: introduction || "" };
      const updates = { introduction: content };
      
      const response = await api.put('/api/accounts/update-profile-details', {
        original,
        updates
      });

      if (response.data.success) {
        toast.success("Introduction saved successfully");
        if (onSave) onSave(content);
        setIsEditing(false);
        setIsPreview(false);
      } else {
        toast.error(response.data.message || "Failed to save introduction");
      }
    } catch (error: any) {
      console.error("Error saving introduction:", error);
      toast.error(error.response?.data?.message || "Failed to save introduction");
    } finally {
      setIsLoading(false);
    }
  };

  const getSanitizedContent = (text: string) => {
    if (!text) return text;
    // Fix markdown bold syntax where user leaves spaces (e.g., "** text **" -> "**text**")
    return text.replace(/\*\*([^*]+)\*\*/g, (match, p1) => `**${p1.trim()}**`);
  };

  return (
    <div className="flex flex-col h-full relative pt-1">
      <div className="w-full text-left">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-100 dark:bg-white/5 p-2 rounded-t-xl border border-b-0 border-gray-200 dark:border-white/10">
              <div className="flex gap-1">
                <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors" title="Bold" disabled={isPreview}>
                  <Bold className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors" title="Italic" disabled={isPreview}>
                  <Italic className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => insertMarkdown('# ')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors font-bold text-xs" title="Heading 1" disabled={isPreview}>
                  H1
                </button>
                <button type="button" onClick={() => insertMarkdown('## ')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors font-bold text-xs" title="Heading 2" disabled={isPreview}>
                  H2
                </button>
                <button type="button" onClick={() => insertMarkdown('### ')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors font-bold text-xs" title="Heading 3" disabled={isPreview}>
                  H3
                </button>
                <button type="button" onClick={() => insertMarkdown('#### ')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors font-bold text-xs" title="Heading 4" disabled={isPreview}>
                  H4
                </button>
                <button type="button" onClick={() => insertMarkdown('- ')} className="p-1.5 rounded hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors" title="Bullet List" disabled={isPreview}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-500">{content.length}/3000</span>
                <button type="button" onClick={() => setIsPreview(!isPreview)} className={`p-1.5 rounded transition-colors flex items-center gap-1.5 px-3 ${isPreview ? 'bg-blue-500/20 text-blue-500' : 'hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300'}`} title="Toggle Preview">
                  {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-[10px] font-bold uppercase">{isPreview ? 'Edit' : 'Preview'}</span>
                </button>
              </div>
            </div>
            
            {isPreview ? (
              <div className="w-full min-h-[300px] rounded-b-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-sm overflow-y-auto break-words leading-relaxed">
                {content ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ node, ...props }) => <strong className="font-extrabold text-gray-900 dark:text-white" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 my-2 marker:text-gray-400 dark:marker:text-zinc-500" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 my-2 marker:text-gray-400 dark:marker:text-zinc-500" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-1 mb-1 last:mb-0" {...props} />,
                      p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-3 last:mb-0" {...props} />,
                      a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                      h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-3 mb-2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2 mb-1" {...props} />,
                    }}
                  >
                    {getSanitizedContent(content)}
                  </ReactMarkdown>
                ) : (
                  <span className="text-gray-500 dark:text-zinc-500 italic">Nothing to preview</span>
                )}
              </div>
            ) : (
              <textarea 
                ref={textareaRef} 
                rows={15} 
                maxLength={3000} 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                className="w-full min-h-[300px] rounded-b-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-5 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500/50 transition-all resize-y break-words custom-scrollbar leading-relaxed" 
                placeholder="Write an introduction about yourself..."
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setIsEditing(false); setContent(introduction || ""); setIsPreview(false); }} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 transition">
                Cancel
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">
                <Check className="h-4 w-4" /> Save Introduction
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full text-gray-700 dark:text-zinc-300 leading-relaxed text-left">
            {isOwner && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute top-0 right-0 p-2 rounded-xl text-gray-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors z-10"
                title="Edit Introduction"
              >
                <Edit2 className="h-5 w-5" />
              </button>
            )}
            
            {content ? (
              <div className="w-full max-w-none break-words pr-12 pb-10">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({ node, ...props }) => <strong className="font-extrabold text-gray-900 dark:text-white" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 my-2 marker:text-gray-400 dark:marker:text-zinc-500" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 my-2 marker:text-gray-400 dark:marker:text-zinc-500" {...props} />,
                    li: ({ node, ...props }) => <li className="pl-1 mb-1 last:mb-0" {...props} />,
                    p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-3 last:mb-0 first-of-type:mt-0" {...props} />,
                    a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-5 mb-2 first-of-type:mt-0" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2 first-of-type:mt-0" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-3 mb-1 first-of-type:mt-0" {...props} />,
                    h4: ({ node, ...props }) => <h4 className="text-base font-bold text-gray-900 dark:text-white mt-2 mb-1 first-of-type:mt-0" {...props} />,
                  }}
                >
                  {getSanitizedContent(content)}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-10 italic text-gray-500 dark:text-zinc-500">
                This person seems shy on introducing themselves...
              </div>
            )}

            {/* Featured Work Section */}
            {featuredWorks.length > 0 && !isEditing && (
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Featured Work
                  </h3>
                  {onViewMoreGallery && (
                    <button
                      onClick={onViewMoreGallery}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      View More
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {featuredWorks.map(item => {
                    const assetUrl = constructAssetUrl(item.file_url);
                    const isVideo = item.file_mimetype?.startsWith("video/");

                    return (
                      <div 
                        key={item.gallery_id} 
                        className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer shadow-sm hover:shadow-lg transition-all"
                        onClick={() => setSelectedGalleryItem(item)}
                      >
                        {isVideo ? (
                          <div className="relative w-full h-full">
                            <video 
                              src={assetUrl} 
                              className="w-full h-full object-cover" 
                              preload="metadata"
                              muted
                              loop
                              onMouseEnter={(e) => e.currentTarget.play()}
                              onMouseLeave={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                            <div className="absolute top-2 right-2 bg-black/60 p-1 rounded-full backdrop-blur-md">
                              <Play className="w-3 h-3 text-white" fill="currentColor" />
                            </div>
                          </div>
                        ) : (
                          <img src={assetUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                          <h4 className="text-white font-bold text-sm line-clamp-1">{item.title}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <GalleryLightbox 
              items={featuredWorks} 
              selectedItem={selectedGalleryItem} 
              setSelectedItem={setSelectedGalleryItem} 
              isOwner={isOwner}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />

            {itemToEdit && (
              <GalleryEditModal
                isOpen={!!itemToEdit}
                item={itemToEdit}
                onClose={() => setItemToEdit(null)}
                onEditComplete={() => {
                  fetchFeaturedWorks();
                  setSelectedGalleryItem(null);
                }}
              />
            )}

            {/* Delete Confirmation Modal */}
            {createPortal(
              <AnimatePresence>
                {itemToDelete && (
                  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setItemToDelete(null)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center"
                    >
                      <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Gallery Item</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-8">
                        Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-200">"{itemToDelete.title}"</span>? This action cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setItemToDelete(null)}
                          className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors w-full"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmDelete}
                          className="px-6 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors w-full"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
};
