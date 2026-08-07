import React from "react";
import FadeInScroll from "@/components/ui/FadeInScroll";

const TESTIMONIALS = [
  { quote: "Ensemble completely changed how our post-production team collaborates. The live chat and timeline sync is magic.", author: "Sarah Jenkins", role: "Lead Editor", img: "https://i.pravatar.cc/100?img=1" },
  { quote: "I found my best clients through the integrated gig board. Getting paid securely inside the same app is a game-changer.", author: "Michael Chen", role: "Freelance Colorist", img: "https://i.pravatar.cc/100?img=2" },
  { quote: "The AI tools cut my rough cut time in half. Dead-air cleanup alone is worth it.", author: "Elena Rossi", role: "Content Creator", img: "https://i.pravatar.cc/100?img=3" },
  { quote: "We used to juggle 4 different apps for video reviews, hiring, and messaging. Ensemble does it all perfectly.", author: "David Kim", role: "Creative Director", img: "https://i.pravatar.cc/100?img=4" },
  { quote: "The best marketplace for high-quality assets. I bought a VFX pack and hired the creator in 5 minutes.", author: "Jessica Alaba", role: "VFX Supervisor", img: "https://i.pravatar.cc/100?img=5" },
];

const SectionTestimonials: React.FC = () => {
  return (
    <section id="testimonials" style={{ background: "#080a12", padding: "100px 0", overflow: "hidden", position: "relative" }}>
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
          background: #0d0f1a;
          border: 1px solid #1e2130;
          border-radius: 16px;
          padding: 32px;
          width: 400px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          transition: transform 0.2s, background 0.2s;
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
          background: #111424;
        }
      `}</style>
      
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <FadeInScroll>
          <h2 style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "4px", marginBottom: "16px" }}>
            Wall of Love
          </h2>
          <h3 style={{ fontSize: "clamp(32px, 4vw, 42px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
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
                <p style={{ color: "#f4f4f5", fontSize: "16px", lineHeight: 1.6, flexGrow: 1 }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img src={t.img} alt={t.author} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>{t.author}</div>
                    <div style={{ color: "#7a8499", fontSize: "13px" }}>{t.role}</div>
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
