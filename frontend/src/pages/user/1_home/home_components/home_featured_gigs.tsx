// src/pages/user/1_home/home_components/home_featured_gigs.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";

export interface ServiceItem {
  id: number;
  title: string;
  price: number;
  provider: string;
  rating: number;
  ordersCount: number;
  imagePlaceholder: string;
}

export const sampleServices: ServiceItem[] = [
  {
    id: 1,
    title: "I will color grade your short film or music video in DaVinci Resolve",
    price: 150,
    provider: "Elena Rostova",
    rating: 5.0,
    ordersCount: 84,
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Color+Grading",
  },
  {
    id: 2,
    title: "I will design custom 3D title animations and kinetic typography",
    price: 95,
    provider: "Julian Vance",
    rating: 4.9,
    ordersCount: 120,
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=3D+Titles",
  },
  {
    id: 3,
    title: "I will mix and master sound design for your cinematic trailer",
    price: 120,
    provider: "Marcus Thorne",
    rating: 4.9,
    ordersCount: 65,
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Sound+Mastering",
  },
];

export const HomeFeaturedGigs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Top Services
          </h2>
          <p
            className="text-xs text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Top-rated freelance services offered by elite creators
          </p>
        </div>
        <button
          onClick={() => navigate("/gigs")}
          className="flex items-center gap-1 text-xs font-semibold text-white transition hover:text-zinc-300"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Explore Services <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {sampleServices.slice(0, 3).map((service) => (
          <div
            key={service.id}
            onClick={() => navigate(`/gigs/${service.id}`)}
            className="group flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] cursor-pointer"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
              <img
                src={service.imagePlaceholder}
                alt={service.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md border border-white/10">
                Starting at ${service.price}
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">
                    {service.provider}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{service.rating}</span>
                    <span className="text-zinc-500">({service.ordersCount})</span>
                  </div>
                </div>

                <h3
                  className="mb-3 text-sm font-semibold leading-snug text-white line-clamp-2 transition-colors group-hover:text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {service.title}
                </h3>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-zinc-500">Verified Seller</span>
                <button className="flex items-center gap-1 text-xs font-medium text-white transition hover:text-zinc-300">
                  View Gig <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};