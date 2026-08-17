import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Maximize2, X, Play, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Image as ImageIcon } from "lucide-react";
import api from "@/lib/axios";
import { GalleryUploadModal } from "../../Edits/GalleryUploadModal";
import { GalleryEditModal } from "../../Edits/GalleryEditModal";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GalleryLightbox } from "./GalleryLightbox";

export interface GalleryItem {
  gallery_id: string;
  account_id: string;
  title: string;
  description: string;
  file_url?: string;
  file_mimetype?: string;
  created_at: string;
}

interface ProfileGalleryProps {
  accountId: string;
  isOwner?: boolean;
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

export const Profile_Gallery: React.FC<ProfileGalleryProps> = ({ accountId, isOwner }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<GalleryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);

  const handleDeleteClick = (item: GalleryItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/api/accounts/galleries/${itemToDelete.gallery_id}`);
      toast.success("Gallery item deleted successfully");
      setItemToDelete(null);
      setSelectedItem(null);
      fetchGalleries();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete gallery item");
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setItemToEdit(item);
  };

  const fetchGalleries = useCallback(async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/accounts/${accountId}/galleries`);
      setItems(res.data);
    } catch (err) {
      console.error("Failed to fetch galleries:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          Gallery
          {isOwner && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ({items.length}/5)
            </span>
          )}
        </h2>
        {isOwner && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={items.length >= 5}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full text-sm font-semibold transition-colors"
            title={items.length >= 5 ? "Upload limit reached" : ""}
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No gallery items found"
          description={isOwner ? "Showcase your best visual work! Upload images and videos to attract more clients." : "This user hasn't uploaded any gallery items yet."}
          actionLabel={isOwner ? "Upload to Gallery" : undefined}
          onAction={isOwner ? () => setIsUploadModalOpen(true) : undefined}
        />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {items.map((item) => {
            const assetUrl = constructAssetUrl(item.file_url);
            const isVideo = item.file_mimetype?.startsWith("video/");

            return (
              <div 
                key={item.gallery_id} 
                className="relative group rounded-2xl overflow-hidden break-inside-avoid bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer shadow-sm hover:shadow-lg transition-all"
                onClick={() => setSelectedItem(item)}
              >
                {/* Media Render */}
                {isVideo ? (
                  <div className="relative w-full">
                    <video 
                      src={assetUrl} 
                      className="w-full h-auto object-cover" 
                      preload="metadata"
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                      muted
                      loop
                    />
                    <div className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full backdrop-blur-md">
                      <Play className="w-3.5 h-3.5 text-white" fill="currentColor" />
                    </div>
                  </div>
                ) : (
                  <img src={assetUrl} alt={item.title} className="w-full h-auto object-cover" loading="lazy" />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                  <div className="absolute top-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity delay-100 transform translate-y-2 group-hover:translate-y-0">
                    <Maximize2 className="w-5 h-5 drop-shadow-md" />
                  </div>
                  <h3 className="text-white font-bold text-lg drop-shadow-md transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-white/80 text-sm line-clamp-2 mt-1 drop-shadow-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GalleryLightbox 
        items={items} 
        selectedItem={selectedItem} 
        setSelectedItem={setSelectedItem} 
        isOwner={isOwner}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <GalleryUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={fetchGalleries}
      />

      {itemToEdit && (
        <GalleryEditModal
          isOpen={!!itemToEdit}
          item={itemToEdit}
          onClose={() => setItemToEdit(null)}
          onEditComplete={() => {
            fetchGalleries();
            setSelectedItem(null);
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
                className="relative w-full max-w-md bg-white dark:bg-dark-base rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center"
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
  );
};
