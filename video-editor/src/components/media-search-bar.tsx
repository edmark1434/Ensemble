import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MediaSearchBarProps {
  className?: string;
  value: string;
  placeholder: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function MediaSearchBar({ className, value, placeholder, loading, onChange, onSearch, onClear }: MediaSearchBarProps) {
  return <div className={cn("flex items-center gap-2 p-4", className)}>
    <div className="relative flex-1">
      <Button type="button" size="sm" variant="ghost"
        className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
        onClick={onSearch} disabled={loading} aria-label="Search">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
      </Button>
      <Input placeholder={placeholder} aria-label={placeholder} value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} className="pl-10" />
    </div>
    {value && <Button type="button" size="sm" variant="outline" onClick={onClear} disabled={loading}>Clear</Button>}
  </div>;
}
