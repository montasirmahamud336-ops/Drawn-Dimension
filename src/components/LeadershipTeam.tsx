import { motion } from "framer-motion";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { MouseEvent, useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FacebookIcon, LinkedInIcon, TwitterIcon } from "@/components/shared/socialIcons";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

type MediaItem = {
  url: string;
  type: "image" | "video";
};

const BIO_READ_MORE_THRESHOLD = 180;

const detectMediaType = (value: string) => {
  const v = value.toLowerCase();
  if (v.includes(".mp4") || v.includes(".mov") || v.includes(".webm")) return "video";
  return "image";
};

const getMediaList = (item: any): MediaItem[] => {
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return item.media
      .filter((m: any) => typeof m?.url === "string" && m.url.length > 0)
      .map((m: any) => ({ url: resolveCmsMediaUrl(m.url), type: m.type === "video" ? "video" : "image" }));
  }

  if (item?.image_url) {
    return [{ url: resolveCmsMediaUrl(item.image_url), type: detectMediaType(item.image_url) }];
  }

  return [];
};

const getSafeText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const shouldShowReadMore = (bio: string) => bio.length > BIO_READ_MORE_THRESHOLD;

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
    <div className="relative mb-5">
      <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300 bg-muted/20">
        {current ? (
          current.type === "video" ? (
            <video src={current.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img src={current.url} alt={leader.name} className="w-full h-full object-cover object-[center_16%]" />
          )
        ) : (
          <div className="w-full h-full bg-primary/10 text-primary text-3xl font-bold flex items-center justify-center">
            {initials}
          </div>
        )}
      </div>
      {hasMany && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-background/90 border border-border/80 text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-md"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-background/90 border border-border/80 text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-md"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

type LeadershipTeamProps = {
  compact?: boolean;
};

const LeadershipTeam = ({ compact = false }: LeadershipTeamProps) => {
  const { data: teamMembers, loading } = useLiveData("team", {
    params: { memberType: "leadership" },
  });
  const [selectedLeader, setSelectedLeader] = useState<any | null>(null);

  const getLeadershipGridClass = (count: number) => {
    if (count <= 1) {
      return "grid grid-cols-1 gap-6 max-w-md mx-auto";
    }
    if (count === 2) {
      return "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto";
    }
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto";
  };

  const leadershipGridClass = getLeadershipGridClass(teamMembers.length);
  const normalizeUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  return (
    <section
      id={compact ? "leadership-team" : undefined}
      className={compact ? "py-12 md:py-14 lg:py-16" : "section-padding"}
      aria-labelledby="leadership-team-heading"
    >
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className={compact ? "text-center mb-10 md:mb-12" : "text-center mb-16"}
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
            <span>Executive Board</span>
          </span>
          <h2 id="leadership-team-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]">
            <span className="text-foreground block">Executive Steering &</span>
            <span className="text-primary font-bold block mt-1">Leadership Team</span>
          </h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className={leadershipGridClass}>
              {teamMembers.map((leader: any, index: number) => {
                const name = getSafeText(leader?.name, "Team Member");
                const role = getSafeText(leader?.role, "Leadership");
                const bio = getSafeText(leader?.bio, "Profile details will be added soon.");
                const showReadMore = shouldShowReadMore(bio);

                return (
                  <motion.div
                    key={leader.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.12 }}
                    className="relative overflow-hidden rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-primary/50 shadow-md group flex flex-col justify-between items-center text-center"
                  >
                    {/* Top Glow Line Accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="flex flex-col items-center text-center relative z-10 w-full">
                      <TeamMemberMedia leader={leader} />

                      {/* Name */}
                      <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors mb-1 line-clamp-1">
                        {name}
                      </h3>

                      {/* Role */}
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3.5">
                        {role}
                      </p>

                      {/* Bio Clamped */}
                      <div className="w-full min-h-[5.5rem] flex flex-col items-center mb-4">
                        <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-3 w-full">
                          {bio}
                        </p>
                        {showReadMore && (
                          <button
                            type="button"
                            onClick={() => setSelectedLeader({ ...leader, name, role, bio })}
                            className="mt-2 text-xs font-semibold text-primary hover:underline transition-colors"
                          >
                            Read Full Bio →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Social Links Bar */}
                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-border/60 w-full relative z-10">
                      {[
                        { href: normalizeUrl(leader.linkedin_url), icon: LinkedInIcon, label: "LinkedIn" },
                        { href: normalizeUrl(leader.twitter_url), icon: TwitterIcon, label: "Twitter" },
                        { href: normalizeUrl(leader.facebook_url), icon: FacebookIcon, label: "Facebook" },
                      ].map((social) => (
                        <a
                          key={social.label}
                          href={social.href || "#"}
                          target={social.href ? "_blank" : undefined}
                          rel={social.href ? "noopener noreferrer" : undefined}
                          aria-label={social.label}
                          className={`w-9 h-9 rounded-xl border border-border/70 bg-muted/40 flex items-center justify-center transition-all duration-200 shadow-sm ${
                            social.href
                              ? "text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground hover:scale-110"
                              : "text-muted-foreground/30 pointer-events-none opacity-40"
                          }`}
                        >
                          <social.icon className="w-4 h-4" />
                        </a>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
              {teamMembers.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground">
                  No team members found.
                </div>
              )}
            </div>

            <Dialog open={!!selectedLeader} onOpenChange={(open) => !open && setSelectedLeader(null)}>
              <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                  <DialogTitle>{selectedLeader?.name || "Team Member"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                    {selectedLeader?.role || "Leadership"}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {selectedLeader?.bio || ""}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </section>
  );
};

export default LeadershipTeam;
