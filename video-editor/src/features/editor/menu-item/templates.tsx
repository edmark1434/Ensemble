import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Heart, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MediaSearchBar } from "@/components/media-search-bar";
import { MarketCollectionRow } from "@/components/market-collection-row";
import { MarketBrowserHeader } from "@/components/market-browser-header";
import { MarketAssetActions } from "@/components/market-asset-actions";
import { MarketPriceBadge } from "@/components/market-price-badge";
import { MarketPreview, getWidestBundleShowcase, useWidestBundleShowcaseDimensions, type MarketAssetBundle } from "@/components/market-asset-browser";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { useMasonryRows } from "../hooks/use-masonry-rows";
import { TemplateOpenModal } from "../modals/template-open-modal";
import { useMarketLicenses } from "../store/use-market-licenses";
import useStore from "../store/use-store";

type Collection = "purchased" | "liked" | "saved";
const collections = [
  { view: "purchased", label: "Purchased", icon: ShoppingBag },
  { view: "saved", label: "Saved", icon: Bookmark },
  { view: "liked", label: "Liked", icon: Heart },
] as const;

function useRefresh(refresh: () => void) {
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("market-engagement-updated", refresh);
    window.addEventListener("market-license-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("market-engagement-updated", refresh);
      window.removeEventListener("market-license-updated", refresh);
    };
  }, [refresh]);
}

function CollectionRow({ collection, onOpen }: { collection: typeof collections[number]; onOpen: (view: Collection) => void }) {
  const projectId = useStore(state => state.projectId);
  const { totalMediaCount, loading, error, load } = useMarketAssets<MarketAssetBundle>("template", collection.view, collection.view === "purchased" ? projectId : undefined);
  const refresh = useCallback(() => { void load(""); }, [load]);
  useRefresh(refresh);
  const Icon = collection.icon;
  return <MarketCollectionRow title={`${collection.label} templates`} icon={<Icon className="size-4" />} onOpen={() => onOpen(collection.view)}
    description={loading ? "Loading…" : error ? "Collection unavailable" : totalMediaCount === 0 ? `No ${collection.view} templates yet` : `${totalMediaCount} ${totalMediaCount === 1 ? "template" : "templates"}`} />;
}

function TemplateCard({ template, onOpen }: { template: MarketAssetBundle; onOpen: (template: MarketAssetBundle) => void }) {
  const [hovering, setHovering] = useState(false);
  const [index, setIndex] = useState(0);
  const slides = template.showcases.map(image => image.preview);
  useEffect(() => {
    if (!hovering || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % slides.length), 1100);
    return () => window.clearInterval(timer);
  }, [hovering, slides.length]);
  const reset = () => { setHovering(false); setIndex(0); };
  return <div className="group relative size-full overflow-hidden rounded-md bg-zinc-800" role="group" aria-label={template.name}
    onMouseEnter={() => setHovering(true)} onMouseLeave={reset} onFocus={() => setHovering(true)} onBlur={reset}>
    <button type="button" onClick={() => onOpen(template)} aria-label={`Open ${template.name}`} className="size-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
      <MarketPreview src={slides[index % (slides.length || 1)]} type="image" className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
      <MarketPriceBadge credits={template.price_credits} className="absolute left-2 top-2" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/50 p-2.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{template.name}</span>
    </button>
    <div className="absolute right-1 top-1"><MarketAssetActions bundle={template} menuOnly kind="template" /></div>
  </div>;
}

function TemplateListings({ items, onOpen }: { items: MarketAssetBundle[]; onOpen: (template: MarketAssetBundle) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const dimensions = useWidestBundleShowcaseDimensions(items);
  const displayItems = useMemo(() => items.map(item => {
    const size = getWidestBundleShowcase(item)?.details ?? dimensions[item.marketAssetId];
    return size ? { ...item, details: size } : item;
  }), [items, dimensions]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const rows = useMasonryRows(displayItems, width, { gap: 8, targetRowHeight: 140, minRowHeight: 120 });
  return <div ref={container} className="flex flex-col gap-2">
    {rows.map((row, index) => <div key={index} className="flex gap-2" style={{ height: row.height }}>
      {row.items.map(({ item, width }) => <div key={item.marketAssetId} style={{ width }} className="h-full"><TemplateCard template={item} onOpen={onOpen} /></div>)}
    </div>)}
  </div>;
}

function TemplateBrowser({ collection, onOpen }: { collection: Collection | null; onOpen: (view: Collection | null) => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MarketAssetBundle | null>(null);
  const projectId = useStore(state => state.projectId);
  const { items, loading, error, hasMore, totalMediaCount, load, loadMore } = useMarketAssets<MarketAssetBundle>("template", collection || "discover", collection === "purchased" ? projectId : undefined);
  const refresh = useCallback(() => { void load(search); }, [load, search]);
  useRefresh(refresh);
  const title = collection ? `${collections.find(item => item.view === collection)!.label} templates` : "Templates";
  const searchProps = {
    value: query, placeholder: `Search ${title.toLowerCase()}...`, loading, onChange: setQuery,
    onSearch: () => search === query.trim() ? refresh() : setSearch(query.trim()),
    onClear: () => { setQuery(""); if (search === "") refresh(); else setSearch(""); },
  };
  const results = <>
    {error && <div role="alert" className="py-6 text-center text-xs text-muted-foreground"><p>{error}</p><Button variant="ghost" size="sm" onClick={refresh}>Try again</Button></div>}
    {!error && !loading && !items.length && <p className="py-10 text-center text-xs text-muted-foreground">{search ? "No matching templates." : collection ? `No ${collection} templates yet.` : "No templates available yet."}</p>}
    <TemplateListings items={items} onOpen={setSelectedTemplate} />
    {selectedTemplate && <TemplateOpenModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)}
      onPurchase={(mode) => {
        useMarketLicenses.getState().openPurchase(selectedTemplate.marketAssetId, mode);
        setSelectedTemplate(null);
      }} />}
    {loading && <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />}
    {hasMore && (collection
      ? <Button variant="outline" size="sm" className="mt-4 w-full" disabled={loading} onClick={() => void loadMore(search)}>Load more</Button>
      : <div className="flex items-center justify-center p-4"><Button variant="outline" size="sm" disabled={loading} onClick={() => void loadMore(search)}>Load more</Button></div>)}
  </>;

  if (collection) {
    const Icon = collections.find(item => item.view === collection)!.icon;
    return <div className="flex h-full min-h-0 w-full flex-col">
      <MarketBrowserHeader title={title} onBack={() => onOpen(null)} backLabel="Back to templates"
        subtitle={<><Icon className="size-3.5 shrink-0" aria-hidden="true" /><span>{totalMediaCount} {totalMediaCount === 1 ? "template" : "templates"}</span></>}>
        {(items.length > 0 || query || search) && <MediaSearchBar className="mt-4 p-0" {...searchProps} />}
      </MarketBrowserHeader>
      <ScrollArea className="min-h-0 flex-1 px-4"><div className="pb-4">{results}</div></ScrollArea>
    </div>;
  }

  return <div className="relative h-full min-h-0 w-full overflow-hidden">
    <div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
      <MediaSearchBar {...searchProps} />
      <ScrollArea className="flex-1 px-4 h-full">
        <div className="mb-3 flex flex-col gap-2" aria-label="templates collections">
          <CollectionRow collection={collections[0]} onOpen={onOpen} />
          <div className="grid grid-cols-2 gap-2">{collections.slice(1).map(item => <CollectionRow key={item.view} collection={item} onOpen={onOpen} />)}</div>
        </div>
        {results}
      </ScrollArea>
    </div>
  </div>;
}

export function Templates() {
  const [collection, setCollection] = useState<Collection | null>(null);
  return <TemplateBrowser key={collection || "discover"} collection={collection} onOpen={setCollection} />;
}
