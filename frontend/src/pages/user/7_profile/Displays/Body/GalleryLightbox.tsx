import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Pencil, Trash2 } from "lucide-react";
import type { GalleryItem } from "./Profile_Gallery";

interface GalleryLightboxProps {
  items: GalleryItem[];
  selectedItem: GalleryItem | null;
  setSelectedItem: (item: GalleryItem | null) => void;
  isOwner?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onDelete?: (item: GalleryItem) => void;
}

const constructAssetUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
};

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ 
  items, 
  selectedItem, 
  setSelectedItem,
  isOwner,
  onEdit,
  onDelete
}) => {
  return createPortal(
    <AnimatePresence>
      {selectedItem && (() => {
        const currentIndex = items.findIndex(i => i.gallery_id === selectedItem.gallery_id);
        const hasMultiple = items.length > 1;
        
        const handlePrev = (e: React.MouseEvent) => {
          e.stopPropagation();
          setSelectedItem(items[(currentIndex - 1 + items.length) % items.length]);
        };
        
        const handleNext = (e: React.MouseEvent) => {
          e.stopPropagation();
          setSelectedItem(items[(currentIndex + 1) % items.length]);
        };

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-white/20 dark:bg-black/60 backdrop-blur-xl cursor-zoom-out"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white/80 dark:bg-dark-base/80 backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl mx-4 border border-black/5 dark:border-white/10"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedItem.gallery_id}
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex flex-col w-full h-full overflow-y-auto overflow-x-hidden"
                >
                  {/* Media Container */}
                  <div className="w-full bg-black/5 dark:bg-black/30 flex items-center justify-center relative min-h-[40vh] max-h-[70vh]">
                    {selectedItem.file_mimetype?.startsWith("video/") ? (
                      <video 
                        src={constructAssetUrl(selectedItem.file_url)} 
                        controls 
                        autoPlay 
                        className="max-w-full max-h-[70vh] object-contain drop-shadow-2xl"
                      />
                    ) : (
                      <img 
                        src={constructAssetUrl(selectedItem.file_url)} 
                        alt={selectedItem.title} 
                        className="max-w-full max-h-[70vh] object-contain drop-shadow-2xl"
                      />
                    )}
                    
                    {/* Watermark */}
                    <div className="absolute top-4 left-4 text-white/50 bg-black/40 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md pointer-events-none select-none drop-shadow-md">
                      Uploaded from Ensemble
                    </div>
                  </div>

                  {/* Bottom Info Section */}
                  <div className="w-full bg-white/40 dark:bg-dark-base/60 border-t border-white/30 dark:border-white/10 flex flex-col p-6 lg:p-8">
                    <div className="flex items-start justify-between mb-4 pr-8 lg:pr-0">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedItem.title}</h2>
                      {isOwner && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(selectedItem); }}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors flex items-center justify-center"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(selectedItem); }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-zinc-300">
                      {selectedItem.description ? (
                        <p className="whitespace-pre-wrap">{selectedItem.description}</p>
                      ) : (
                        <p className="italic text-gray-500 dark:text-zinc-500">No description provided.</p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                      Uploaded on {new Date(selectedItem.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* Controls outside of AnimatePresence to stay static during transition */}
              {hasMultiple && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-[35vh] -translate-y-1/2 p-3 bg-white/60 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/90 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-[35vh] -translate-y-1/2 p-3 bg-white/60 dark:bg-black/60 hover:bg-white/90 dark:hover:bg-black/90 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2.5 bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 backdrop-blur-lg rounded-full transition-colors text-gray-900 dark:text-white z-50 shadow-xl flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        );
      })()}
    </AnimatePresence>,
    document.body
  );
};
