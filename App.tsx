import React, { useState, useEffect } from "react";
import { MatchesList } from "./components/MatchesList";
import { MemberCard } from "./components/MemberCard";
import { AiAnalyst } from "./components/AiAnalyst";
import { ContactForm } from "./components/ContactForm";
import { TournamentsList } from "./components/TournamentsList";
import { TeamMember } from "./types";
import { Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { VideoText } from "@/components/ui/video-text";
import { ConfigView } from "./components/ConfigView";
import Steam from "./logos/steam.svg?react";
import { getTeamMembers } from "./services/dataService";

export default function App() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<"home" | "config">("home");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    const loadMembers = async () => {
      const members = await getTeamMembers();
      setTeamMembers(members);
    };
    loadMembers();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigateTo = (page: "home" | "config", sectionId?: string) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);

    if (page === "home") {
      setSelectedMember(null); // Reset selected member when going home
      if (sectionId) {
        // Wait for render then scroll
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleConfigClick = (member: TeamMember) => {
    setSelectedMember(member);
    setCurrentPage("config");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-obsidian/90 backdrop-blur-md border-b border-white/5 py-4"
            : "bg-transparent py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-[0.3em] text-white">
            COLOSSUS
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-12 text-xs tracking-[0.2em] font-light text-zinc-400">
            <button
              onClick={() => navigateTo("home", "roster")}
              className="hover:text-white transition-colors"
            >
              ROSTER
            </button>
            <button
              onClick={() => navigateTo("home", "matches")}
              className="hover:text-white transition-colors"
            >
              MATCHES
            </button>
            <button
              onClick={() => navigateTo("home", "tournaments")}
              className="hover:text-white transition-colors"
            >
              TOURNAMENTS
            </button>
            <button
              onClick={() => navigateTo("config")}
              className={`transition-colors ${
                currentPage === "config" ? "text-white" : "hover:text-white"
              }`}
            >
              CONFIG
            </button>
            <button
              onClick={() => navigateTo("home", "contact")}
              className="hover:text-white transition-colors"
            >
              CONTACT
            </button>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => window.open("https://colossus.games", "_blank")}
              className="border border-white/20 px-6 py-2 text-xs tracking-widest hover:bg-white hover:text-black transition-all duration-300"
            >
              OUR SERVERS
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
          <div className="flex flex-col gap-8 text-center text-2xl font-light tracking-widest text-zinc-400">
            <button onClick={() => navigateTo("home", "roster")}>ROSTER</button>
            <button onClick={() => navigateTo("home", "matches")}>
              MATCHES
            </button>
            <button onClick={() => navigateTo("home", "tournaments")}>
              TOURNAMENTS
            </button>
            <button onClick={() => navigateTo("config")}>CONFIG</button>
            <button onClick={() => navigateTo("home", "contact")}>
              CONTACT
            </button>
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="grow">
        {currentPage === "home" ? (
          <>
            {/* Hero Section */}
            <section className="relative h-screen flex flex-col justify-center items-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
              <div className="z-10 text-center px-4 w-3xl">
                <p className="text-zinc-500 text-sm md:text-base tracking-[0.5em] uppercase mb-6 animate-pulse">
                  Est. 2021 • Competitive Team
                </p>
                <div className="relative h-[200px] w-full flex overflow-hidden">
                  <VideoText src="/l4d2.webm" fontSize={18}>
                    COLOSSUS
                  </VideoText>
                </div>

                <p className="text-zinc-400 max-w-md mx-auto text-sm md:text-base font-light leading-relaxed mb-12">
                  Latin American e-sports team competing at the highest level in
                  Left 4 Dead 2 tournaments worldwide.
                </p>
                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                  <button
                    onClick={() => {
                      document
                        .getElementById("roster")
                        .scrollIntoView({ behavior: "smooth" });
                    }}
                    className="group relative px-8 py-3 bg-white text-black text-sm tracking-widest font-medium overflow-hidden"
                  >
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                      EXPLORE ROSTER
                    </span>
                    <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        "https://steamcommunity.com/groups/colossusl4d2",
                        "_blank"
                      )
                    }
                    className="flex items-center gap-2 text-sm tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>STEAM GROUP</span>
                    <Steam width={20} height={20} />
                  </button>
                </div>
              </div>

              {/* Bottom Decor */}
              <div className="absolute bottom-10 w-full flex justify-center animate-bounce">
                <ChevronDown className="text-zinc-700" size={24} />
              </div>
            </section>

            {/* Matches Section */}
            <section
              id="matches"
              className="py-32 relative border-y border-white/5 bg-zinc-950/50"
            >
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col items-center mb-16">
                  <h2 className="text-3xl font-light tracking-tight text-white text-center">
                    COMPETITIVE FEED
                  </h2>
                  <div className="w-12 h-px bg-white/20 mt-4"></div>
                </div>
                <MatchesList />
              </div>
            </section>

            {/* Roster Section */}
            <section id="roster" className="py-32 max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-end mb-20">
                <div>
                  <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white opacity-10 absolute -ml-4 -mt-10 pointer-events-none select-none">
                    TEAM
                  </h2>
                  <h2 className="text-3xl font-light tracking-tight relative z-10">
                    Active Roster
                  </h2>
                </div>
                <div className="h-px flex-1 bg-linear-to-r from-zinc-800 to-transparent mx-8 mb-2 hidden md:block" />
                <div className="text-zinc-500 text-sm tracking-widest">
                  SEASON 2025
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teamMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onConfigClick={handleConfigClick}
                  />
                ))}
              </div>
            </section>

            {/* Tournaments Section (Replaces Partners) */}
            <section
              id="tournaments"
              className="py-32 bg-zinc-900/30 border-t border-white/5"
            >
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col items-center mb-16">
                  <h2 className="text-3xl font-light tracking-tight text-white text-center">
                    MAJOR TOURNAMENTS
                  </h2>
                  <div className="w-12 h-px bg-white/20 mt-4"></div>
                </div>
                <TournamentsList />
              </div>
            </section>

            {/* Contact Section */}
            <section
              id="contact"
              className="py-32 relative border-t border-white/5"
            >
              <div className="max-w-7xl mx-auto px-6">
                <ContactForm />
              </div>
            </section>
          </>
        ) : (
          <ConfigView
            member={selectedMember}
            onBack={() => navigateTo("home", "roster")}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-bold tracking-[0.3em]">COLOSSUS</div>
          <div className="text-zinc-600 text-xs tracking-widest">
            © 2025 COLOSSUS TEAM. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-6 text-zinc-500">
            <a
              href="https://www.youtube.com/@ColossusPOV"
              target="_blank"
              className="hover:text-white transition-colors text-xs tracking-widest uppercase"
            >
              Youtube
            </a>
            <a
              href="https://steamcommunity.com/groups/colossusl4d2"
              target="_blank"
              className="hover:text-white transition-colors text-xs tracking-widest uppercase"
            >
              Steam
            </a>
            <a
              href="#"
              className="hover:text-white transition-colors text-xs tracking-widest uppercase"
            >
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
