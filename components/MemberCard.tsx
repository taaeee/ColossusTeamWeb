import React from 'react';
import { TeamMember } from '../types';
import { Twitch, Youtube } from 'lucide-react';
import Steam from "../logos/steam.svg?react";
import Kick from "../logos/kick.svg?react";
import Discord from "../logos/discord.svg?react";

interface MemberCardProps {
  member: TeamMember;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  return (
    <div className=" group relative overflow-hidden border border-white/10 bg-glass hover:border-white/30 transition-all duration-500 ease-out">
      {/* Image Background with Overlay */}
      <div className="aspect-3/4 relative">
        <img 
          src={member.image} 
          alt={member.name}
          className="h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 grayscale group-hover:grayscale-0"
          width="300"
         
        />
        <div className="absolute inset-0 bg-linear-to-t from-obsidian via-transparent to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-6">
        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-zinc-400 text-xs tracking-[0.2em] uppercase mb-1">{member.role}</p>
          <h3 className="text-2xl font-light tracking-tight text-white mb-4">{member.name}</h3>
          
          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
            {member.socials.steam && (
              <a href={member.socials.steam} target="_blank" className="text-zinc-400 hover:text-white transition-colors">
                <Steam size={16} />
              </a>
            )}
            {member.socials.kick && (
              <a href={member.socials.kick} target="_blank" className="text-zinc-400 hover:text-white transition-colors">
                <Kick width={15} height={15} fill="grey"/>
              </a>
            )}
            {member.socials.discord && (
              <a href={member.socials.discord} target="_blank" className="text-zinc-400 hover:text-white transition-colors">
                <Discord size={16} />
              </a>
            )}
            {member.socials.twitch && (
              <a href={member.socials.twitch} target="_blank" className="text-zinc-400 hover:text-white transition-colors">
                <Twitch size={16} />
              </a>
            )}
            {member.socials.youtube && (
              <a href={member.socials.youtube} target="_blank" className="text-zinc-400 hover:text-white transition-colors">
                <Youtube size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
      
      {/* Decorative Lines */}
      <div className="absolute top-0 right-0 w-px h-12 bg-linear-to-b from-white/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-12 h-px bg-linear-to-r from-white/40 to-transparent" />
    </div>
  );
};
