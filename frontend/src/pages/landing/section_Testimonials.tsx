import React from "react";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

const TESTIMONIALS = [
  { quote: "Ensemble completely changed how our post-production team collaborates. The live chat and timeline sync is magic.", author: "Sarah Jenkins", role: "Lead Editor", img: "https://i.pravatar.cc/100?img=1" },
  { quote: "I found my best clients through the integrated gig board. Getting paid securely inside the same app is a game-changer.", author: "Michael Chen", role: "Freelance Colorist", img: "https://i.pravatar.cc/100?img=2" },
  { quote: "The AI tools cut my rough cut time in half. Dead-air cleanup alone is worth it.", author: "Elena Rossi", role: "Content Creator", img: "https://i.pravatar.cc/100?img=3" },
  { quote: "We used to juggle 4 different apps for video reviews, hiring, and messaging. Ensemble does it all perfectly.", author: "David Kim", role: "Creative Director", img: "https://i.pravatar.cc/100?img=4" },
  { quote: "The best marketplace for high-quality assets. I bought a VFX pack and hired the creator in 5 minutes.", author: "Jessica Alaba", role: "VFX Supervisor", img: "https://i.pravatar.cc/100?img=5" },
];

const SectionTestimonials: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);

  return (
    <section id="testimonials" style={{ background: theme === 'dark' ? "#121214" : "#f9fafb", padding: "100px 0", overflow: "hidden", position: "relative", transition: "background 0.3s ease" }}>
      <style>{`
        @keyframes marquee-testimonials {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .testimonial-track {
          display: flex;
          gap: 24px;
          width: fit-content;
          animation: marquee-testimonials 40s linear infinite;
        }
        .testimonial-track:hover {
          animation-play-state: paused;
        }
        .testimonial-card {
          background: ${theme === 'dark' ? '#18181b' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          border-radius: 16px;
          padding: 32px;
          width: 400px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          transition: transform 0.2s, background 0.3s ease, box-shadow 0.3s ease;
          box-shadow: ${theme === 'dark' ? 'none' : '0 4px 20px rgba(0,0,0,0.03)'};
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
          background: ${theme === 'dark' ? '#27272a' : '#f8fafc'};
        }
      `}</style>
      
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <FadeInScroll>
          <h2 style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "4px", marginBottom: "16px" }}>
            Wall of Love
          </h2>
          <h3 style={{ fontSize: "clamp(32px, 4vw, 42px)", fontWeight: 800, color: theme === 'dark' ? "#fff" : "#111827", letterSpacing: "-0.02em", transition: "color 0.3s ease" }}>
            Trusted by creators worldwide
          </h3>
        </FadeInScroll>
      </div>

      <FadeInScroll delay={200}>
        <div style={{ position: "relative", width: "100%", maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
          <div className="testimonial-track">
            {/* Double the array for seamless looping */}
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="testimonial-card">
                <p style={{ color: theme === 'dark' ? "#e4e4e7" : "#4b5563", fontSize: "16px", lineHeight: 1.6, flexGrow: 1, transition: "color 0.3s ease" }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img src={t.img} alt={t.author} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <div style={{ color: theme === 'dark' ? "#fff" : "#111827", fontWeight: 700, fontSize: "15px", transition: "color 0.3s ease" }}>{t.author}</div>
                    <div style={{ color: theme === 'dark' ? "#a1a1aa" : "#6b7280", fontSize: "13px", transition: "color 0.3s ease" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeInScroll>
    </section>
  );
};

export default SectionTestimonials;
