import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ExternalLink,
  Loader2,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Play,
  User,
  Maximize2,
} from "lucide-react";
import api from "@/lib/axios";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import { VerificationIcon } from "@/components/ui/VerificationIcon";
import { SubscriptionIcon } from "@/components/ui/SubscriptionIcon";
import { JobRichText } from "./JobRichText";
import { GalleryLightbox } from "@/pages/user/7_profile/Displays/Body/GalleryLightbox";
import type { GalleryItem } from "@/pages/user/7_profile/Displays/Body/Profile_Gallery";

export interface SelectedFreelancerPreview {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  tagline: string;
  verified: boolean;
  subscriptionType: string;
}

interface FreelancerPreviewModalProps {
  freelancer: SelectedFreelancerPreview;
  onClose: () => void;
  onCloseDrawer: () => void;
}

const constructAssetUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  const cleanCf = cloudfrontUrl.endsWith("/") ? cloudfrontUrl : `${cloudfrontUrl}/`;
  return `${cleanCf}${cleanPath}`;
};

type PreviewTab = "introduction" | "portfolio" | "gallery";

export const FreelancerPreviewModal: React.FC<FreelancerPreviewModalProps> = ({
  freelancer,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PreviewTab>("introduction");
  const [loading, setLoading] = useState(true);
  const [introduction, setIntroduction] = useState("");
  const [bio, setBio] = useState(freelancer.bio || "");
  const [tagline, setTagline] = useState(freelancer.tagline || "");
  const [subscriptionPlan, setSubscriptionPlan] = useState(freelancer.subscriptionType || "Free");
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveTab("introduction");
    setSelectedGalleryItem(null);
    setSelectedPortfolioItem(null);

    Promise.all([
      api.get(`/api/accounts/profile/${freelancer.id}`).catch(() => null),
      api.get(`/api/accounts/profile/${freelancer.id}/attachments`).catch(() => null),
      api.get(`/api/accounts/${freelancer.id}/galleries`).catch(() => null),
    ])
      .then(([profileRes, attachmentsRes, galleriesRes]) => {
        if (cancelled) return;
        const p = profileRes?.data?.data || profileRes?.data || null;
        if (p) {
          setIntroduction(p.introduction || "");
          setBio(p.bio ?? freelancer.bio ?? "");
          setTagline(p.tagline ?? freelancer.tagline ?? "");
          setSubscriptionPlan(p.subscriptionType || p.subscriptiontype || freelancer.subscriptionType || "Free");
        }
        const attachments = attachmentsRes?.data?.attachments || [];
        setPortfolioItems(Array.isArray(attachments) ? attachments : []);
        const galleries = galleriesRes?.data;
        setGalleryItems(Array.isArray(galleries) ? galleries : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [freelancer.id]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-[320px] xl:w-[370px] h-[450px] flex flex-col shrink-0 rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden text-left"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={freelancer.avatar}
            alt={freelancer.name}
            className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {freelancer.name}
              </span>
              <VerificationIcon verified={freelancer.verified} className="h-3.5 w-3.5 shrink-0" />
              {freelancer.subscriptionType && freelancer.subscriptionType !== "Free" && (
                <SubscriptionIcon plan={freelancer.subscriptionType} className="h-3.5 w-3.5 shrink-0" />
              )}
            </div>
            {freelancer.username && (
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                @{freelancer.username}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={`/profile/${freelancer.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View Full Profile"
            className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            title="Close Preview"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-white/10 flex items-center gap-1">
        {(
          [
            { key: "introduction", label: "Introduction", icon: User },
            {
              key: "portfolio",
              label: `Portfolio${portfolioItems.length > 0 ? ` (${portfolioItems.length})` : ""}`,
              icon: FolderOpen,
            },
            {
              key: "gallery",
              label: `Gallery${galleryItems.length > 0 ? ` (${galleryItems.length})` : ""}`,
              icon: ImageIcon,
            },
          ] as const
        ).map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                active
                  ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-3.5 flex-1 overflow-y-auto thin-scrollbar">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading profile details...</span>
          </div>
        ) : activeTab === "introduction" ? (
          <div className="space-y-3">
            {tagline && (
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/5 flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold shrink-0">
                  Tagline
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                    subscriptionPlan === "Business"
                      ? "animate-rainbow"
                      : subscriptionPlan === "Premium"
                      ? "animate-gold-solid"
                      : "silver-solid"
                  }`}
                >
                  {tagline}
                </span>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/5">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                Introduction
              </div>
              <JobRichText
                content={introduction || bio || "This freelancer hasn't written an introduction yet."}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        ) : activeTab === "portfolio" ? (
          portfolioItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-500 dark:text-zinc-400">
              No portfolio items added yet.
            </div>
          ) : (
            <div className="space-y-2">
              {portfolioItems.map((item: any) => {
                const isProject = item.attachment_type === "project";
                const isLink = item.attachment_kind === "link";
                const meta = item.metadata || {};
                const thumb = item.project_thumbnail_path || meta.thumbnail_path;

                return (
                  <div
                    key={item.account_attachment_id || item.name}
                    onClick={() => setSelectedPortfolioItem(item)}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/25 transition flex items-center gap-2.5 cursor-pointer group"
                  >
                    {thumb ? (
                      <img
                        src={constructAssetUrl(thumb)}
                        alt={item.name}
                        className="h-10 w-14 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                        {isProject ? (
                          <Play className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                        ) : isLink ? (
                          <Link2 className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                        {item.description || (isProject ? "Project clip" : isLink ? item.external_url : item.file_name || "Document")}
                      </p>
                    </div>

                    <div
                      className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:bg-gray-200/70 dark:group-hover:bg-white/10 transition shrink-0"
                      title="Preview"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : galleryItems.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-500 dark:text-zinc-400">
            No gallery items uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {galleryItems.map((item: any) => {
              const rawPath = item.file_url || item.file_path || item.path || item.url || "";
              const mediaUrl = constructAssetUrl(rawPath);
              const isVideo =
                String(item.file_mimetype || item.media_type || item.mime_type || "").startsWith("video/") ||
                /\.(mp4|webm|mov)$/i.test(rawPath);

              return (
                <div
                  key={item.gallery_id || rawPath}
                  onClick={() => setSelectedGalleryItem(item)}
                  className="rounded-xl overflow-hidden border border-gray-200/80 dark:border-white/10 bg-zinc-900 group cursor-pointer hover:border-gray-300 dark:hover:border-white/25 transition relative"
                >
                  <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden">
                    {isVideo && mediaUrl ? (
                      <video
                        src={mediaUrl}
                        preload="metadata"
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt={item.title || "Gallery item"}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}

                    {/* Hover Overlay (title + expand icon shown only on hover) */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                      <div className="flex justify-end">
                        <span className="p-1 rounded-md bg-black/50 text-white">
                          <Maximize2 className="h-3 w-3" />
                        </span>
                      </div>
                      {item.title && (
                        <p className="text-[11px] font-semibold text-white truncate">
                          {item.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GalleryLightbox
        items={galleryItems}
        selectedItem={selectedGalleryItem}
        setSelectedItem={setSelectedGalleryItem}
        isOwner={false}
      />

      {selectedPortfolioItem &&
        createPortal(
          <div
            onClick={() => setSelectedPortfolioItem(null)}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl h-[82vh] rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {selectedPortfolioItem.name}
                  </h4>
                  {selectedPortfolioItem.description && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                      {selectedPortfolioItem.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(() => {
                    const isProject = selectedPortfolioItem.attachment_type === "project";
                    const isLink = selectedPortfolioItem.attachment_kind === "link";
                    const meta = selectedPortfolioItem.metadata || {};
                    const url = isProject
                      ? constructAssetUrl(selectedPortfolioItem.project_video_path || meta.video_path)
                      : isLink
                      ? selectedPortfolioItem.external_url
                      : constructAssetUrl(selectedPortfolioItem.file_path);
                    if (!url) return null;
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in new tab"
                        className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setSelectedPortfolioItem(null)}
                    className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-zinc-950 p-3 flex items-center justify-center overflow-hidden">
                {(() => {
                  const isProject = selectedPortfolioItem.attachment_type === "project";
                  const isLink = selectedPortfolioItem.attachment_kind === "link";
                  const meta = selectedPortfolioItem.metadata || {};
                  const videoUrl = constructAssetUrl(selectedPortfolioItem.project_video_path || meta.video_path);
                  const fileUrl = constructAssetUrl(selectedPortfolioItem.file_path);
                  const externalUrl = selectedPortfolioItem.external_url;

                  if (isProject && videoUrl) {
                    return (
                      <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full max-h-full rounded-xl object-contain"
                      />
                    );
                  }
                  if (isLink && externalUrl) {
                    return (
                      <iframe
                        src={externalUrl}
                        title={selectedPortfolioItem.name}
                        className="w-full h-full rounded-xl bg-white border-0"
                      />
                    );
                  }
                  if (fileUrl) {
                    return (
                      <iframe
                        src={fileUrl}
                        title={selectedPortfolioItem.name}
                        className="w-full h-full rounded-xl bg-white border-0"
                      />
                    );
                  }
                  return (
                    <p className="text-xs text-zinc-400">
                      Preview is not available for this portfolio item.
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
