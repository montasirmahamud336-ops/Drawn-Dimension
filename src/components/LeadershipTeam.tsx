import { motion } from "framer-motion";
import { Linkedin, Twitter, Facebook, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { MouseEvent, useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";

type MediaItem = {
  url: string;
  type: "image" | "video";
};

const detectMediaType = (value: string) => {
  const v = value.toLowerCase();
  if (v.includes(".mp4") || v.includes(".mov") || v.includes(".webm")) return "video";
  return "image";
};

const getMediaList = (item: any): MediaItem[] => {
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return item.media
      .filter((m: any) => typeof m?.url === "string" && m.url.length > 0)
      .map((m: any) => ({ url: m.url, type: m.type === "video" ? "video" : "image" }));
  }

  if (item?.image_url) {
    return [{ url: item.image_url, type: detectMediaType(item.image_url) }];
  }

  return [];
};

const TeamMemberMedia = ({ leader }: { leader: any }) => {
  const media = getMediaList(leader);
  const [index, setIndex] = useState(0);
  const current = media[index];
  const hasMany = media.length > 1;
  const initials = typeof leader?.name === "string"
    ? leader.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "TM";

  const prev = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i - 1 + media.length) % media.length);
  };

  const next = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + 1) % media.length);
  };

  return (
    <div className="relative mb-7">
      <div className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.18)_0%,rgba(239,68,68,0.08)_45%,transparent_72%)] opacity-55 blur-md" />
      <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-white/20 group-hover:border-primary/45 transition-colors duration-300 overflow-hidden">
        {current ? (
          current.type === "video" ? (
            <video src={current.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img src={current.url} alt={leader.name} className="w-full h-full object-cover object-[center_16%] scale-[1.03]" />
          )
        ) : (
          <div className="w-full h-full bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center">
            {initials}
          </div>
        )}
      </div>
      {hasMany && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

const LeadershipTeam = () => {
  const { data: teamMembers, loading } = useLiveData("team", {
    params: { memberType: "leadership" },
  });
  const normalizeUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  return (
    <section className="section-padding">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Meet Our Leaders
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 text-foreground">
            Our Leadership Team
          </h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {teamMembers.map((leader: any, index: number) => (
              <motion.div
                key={leader.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="glass-card relative overflow-hidden p-8 group border-border/55 bg-[linear-gradient(155deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_42%,rgba(255,255,255,0.01)_100%)] backdrop-blur-xl transition-all duration-500 hover:border-border/70 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
                <div className="flex flex-col items-center text-center relative z-10">
                  <TeamMemberMedia leader={leader} />

                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {leader.name}
                  </h3>
                  <p className="text-primary font-semibold text-sm mb-4">
                    {leader.role}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {leader.bio}
                  </p>

                  <div className="flex gap-3">
                    {[
                      { href: normalizeUrl(leader.linkedin_url), icon: Linkedin, label: "LinkedIn" },
                      { href: normalizeUrl(leader.twitter_url), icon: Twitter, label: "Twitter" },
                      { href: normalizeUrl(leader.facebook_url), icon: Facebook, label: "Facebook" },
                    ].map((social) => (
                      <a
                        key={social.label}
                        href={social.href || "#"}
                        target={social.href ? "_blank" : undefined}
                        rel={social.href ? "noopener noreferrer" : undefined}
                        aria-label={social.label}
                        className={`w-10 h-10 rounded-full border border-border/50 bg-background/35 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${social.href
                          ? "text-muted-foreground hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
                          : "text-muted-foreground/40 pointer-events-none"
                          }`}
                      >
                        <social.icon className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            {teamMembers.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground">
                No team members found.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default LeadershipTeam;
