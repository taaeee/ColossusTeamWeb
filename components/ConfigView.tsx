import React from 'react';
import { Download, Monitor, Mouse, Keyboard, Headphones, Cpu, Zap, Activity, Disc, Target, FolderOpen, Terminal, CheckCircle, Mic } from 'lucide-react';
import { FileTreeDemo } from './FileTreeDemo';
import { TerminalConfig } from './TerminalConfig';

export const ConfigView: React.FC = () => {
  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen animate-in fade-in duration-500">
       {/* Header */}
       <div className="mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-4">CONFIGURATION</h1>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-white text-black text-xs font-bold tracking-widest uppercase">taeyong</div>
             <div className="h-px flex-1 bg-white/20"></div>
             <div className="text-zinc-500 text-xs tracking-widest uppercase">Last Updated: Today</div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Gear & PC */}
          <div className="lg:col-span-4 space-y-8">
             {/* Gear */}
             <div className="border border-white/10 bg-zinc-900/30 p-8 backdrop-blur-sm">
                <h3 className="text-xl font-light tracking-tight text-white mb-6 flex items-center gap-2">
                   <Zap size={18} /> PERIPHERALS
                </h3>
                <div className="space-y-6">
                   <div className="group">
                      <div className="flex items-center gap-3 text-zinc-400 mb-1 group-hover:text-white transition-colors">
                         <Monitor size={14} /> <span className="text-xs tracking-widest uppercase">Monitor</span>
                      </div>
                      <div className="text-white font-medium">LG ULTRAGEAR 24'</div>
                   </div>
                   <div className="h-px bg-white/5" />
                   <div className="group">
                      <div className="flex items-center gap-3 text-zinc-400 mb-1 group-hover:text-white transition-colors">
                         <Mouse size={14} /> <span className="text-xs tracking-widest uppercase">Mouse</span>
                      </div>
                      <div className="text-white font-medium">Logitech G Pro X Superlight</div>
                   </div>
                   <div className="h-px bg-white/5" />
                   <div className="group">
                      <div className="flex items-center gap-3 text-zinc-400 mb-1 group-hover:text-white transition-colors">
                         <Keyboard size={14} /> <span className="text-xs tracking-widest uppercase">Keyboard</span>
                      </div>
                      <div className="text-white font-medium">Aula F75</div>
                   </div>
                   <div className="h-px bg-white/5" />
                   <div className="group">
                      <div className="flex items-center gap-3 text-zinc-400 mb-1 group-hover:text-white transition-colors">
                         <Headphones size={14} /> <span className="text-xs tracking-widest uppercase">Headset</span>
                      </div>
                      <div className="text-white font-medium">Logitech G733</div>
                   </div>
                   <div className="h-px bg-white/5" />
                   <div className="group">
                      <div className="flex items-center gap-3 text-zinc-400 mb-1 group-hover:text-white transition-colors">
                         <Disc size={14} /> <span className="text-xs tracking-widest uppercase">Mousepad</span>
                      </div>
                      <div className="text-white font-medium">PULSAR ES2 XL NEZUKO EDITION</div>
                   </div>
                   <div className="h-px bg-white/5" />
                   <div className="group">
                      <div className="flex items-center gap-3 text-zinc-400 mb-1 group-hover:text-white transition-colors">
                         <Mic size={14} /> <span className="text-xs tracking-widest uppercase">Microphone</span>
                      </div>
                      <div className="text-white font-medium">RAZER SEIREN V2 X</div>
                   </div>
                </div>
             </div>

             {/* PC Specs */}
             <div className="border border-white/10 bg-zinc-900/30 p-8 backdrop-blur-sm">
                <h3 className="text-xl font-light tracking-tight text-white mb-6 flex items-center gap-2">
                   <Cpu size={18} /> PC SPECS
                </h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-xs tracking-widest uppercase">CPU</span>
                      <span className="text-white font-medium">Ryzen 7 5700x</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-xs tracking-widest uppercase">GPU</span>
                      <span className="text-white font-medium">RX 7800 XT</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-xs tracking-widest uppercase">RAM</span>
                      <span className="text-white font-medium">32 GB DDR4</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Column - Settings & Config */}
          <div className="lg:col-span-8 space-y-8">
             
             {/* Mouse Settings Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="border border-white/10 bg-zinc-900/30 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Mouse size={64} />
                    </div>
                    <h3 className="text-xl font-light tracking-tight text-white mb-6">MOUSE SETTINGS</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase mb-1">DPI</div>
                            <div className="text-3xl font-bold text-white">1600</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase mb-1">Sensitivity</div>
                            <div className="text-3xl font-bold text-white">1.5</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase mb-1">eDPI</div>
                            <div className="text-3xl font-bold text-white">280</div>
                        </div>
                         <div>
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase mb-1">Polling Rate</div>
                            <div className="text-3xl font-bold text-white">1000<span className="text-sm font-normal text-zinc-500 ml-1">Hz</span></div>
                        </div>
                    </div>
                 </div>

                 <div className="border border-white/10 bg-zinc-900/30 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity size={64} />
                    </div>
                    <h3 className="text-xl font-light tracking-tight text-white mb-6">VIDEO SETTINGS</h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase">Resolution</div>
                            <div className="text-xl font-bold text-white">1920 x 1080</div>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase">Aspect Ratio</div>
                            <div className="text-xl font-bold text-white">16:9 Native</div>
                        </div>
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <div className="text-zinc-500 text-[10px] tracking-widest uppercase">Refresh Rate</div>
                            <div className="text-xl font-bold text-white">165 Hz</div>
                        </div>
                    </div>
                 </div>
             </div>

             {/* Crosshair Visualizer */}
             <div className="border border-white/10 bg-black p-8 flex flex-col items-center justify-center h-48 relative group">
                 <div className="absolute top-4 left-4 text-xs tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                    <Target size={14} /> Crosshair Preview
                 </div>
                 {/* Crosshair simulation */}
                 <div className="relative p-12">
                    <div className="w-6 h-0.5 bg-pink-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 "></div>
                    <div className="h-6 w-0.5 bg-pink-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 "></div>
                 </div>
                 <div className="absolute bottom-4 right-4 text-xs font-mono text-zinc-600 border border-zinc-800 px-2 py-1 rounded">
                    Crosshair Color
                 </div>
             </div>

             {/* Download Section */}
             <div className="border border-white/10 bg-linear-to-r from-zinc-900 to-black p-10 flex flex-col md:flex-row items-center justify-between gap-8 group">
                 <div>
                    <h3 className="text-2xl font-bold text-white mb-2">AUTOEXEC.CFG</h3>
                    <p className="text-zinc-400 text-sm font-light max-w-md">
                        Download the full configuration file including keybinds, viewmodel, crosshair settings, and network optimization commands.
                    </p>
                 </div>
                 <button 
                    className="whitespace-nowrap px-8 py-4 bg-white text-black text-sm tracking-[0.2em] font-bold hover:bg-zinc-200 transition-colors flex items-center gap-3"
                    onClick={() => window.open("https://pastebin.com/dl/vcPYTJQY", "_blank")} 
                    >
                    <Download size={16} />
                    DOWNLOAD CONFIG
                 </button>
             </div>
            <div className="border border-white/10 bg-linear-to-r from-zinc-900 to-black p-10 flex flex-col md:flex-row items-center justify-between gap-8 group">
                 <div>
                    <h3 className="text-2xl font-bold text-white mb-2">MY FONT</h3>
                    <p className="text-zinc-400 text-sm font-light max-w-md">
                        Download my L4D2 font.
                    </p>
                 </div>
                 <button 
                    className="whitespace-nowrap px-8 py-4 bg-white text-black text-sm tracking-[0.2em] font-bold hover:bg-zinc-200 transition-colors flex items-center gap-3"
                    onClick={() => window.open("https://drive.google.com/file/d/1qcyJjJr77xagU93MQZpzZ9aOj9wnpdfU/view?usp=drive_link", "_blank")} 
                    >
                    <Download size={16} />
                    DOWNLOAD FONT
                 </button>
             </div>
          </div>
       </div>
       {/* Installation Guide Section */}
       <div className="border border-white/10 bg-zinc-900/20 p-8 md:p-12 relative overflow-hidden mt-15">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
           
           <h3 className="text-xl font-light tracking-tight text-white mb-8 flex items-center gap-3 relative z-10">
               <span className="w-2 h-2 bg-white rounded-full"></span>
               HOW TO INSTALL
           </h3>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
               {/* Step 1 */}
               <div className="group">
                   <div className="text-6xl font-bold text-white/5 mb-4 group-hover:text-white/10 transition-colors">01</div>
                   <div className="flex items-center gap-3 text-white mb-2 font-bold tracking-widest text-sm uppercase">
                       <FolderOpen size={16} /> Locate Directory
                   </div>
                   <p className="text-zinc-400 text-sm font-light leading-relaxed">
                       Navigate to your local Steam game files:<br/>
                        <span className="text-green-400 font-mono text-xs block mt-2 p-2 bg-black/50 border border-white/5 rounded select-all">
                           Steam\steamapps\common\Left 4 Dead 2
                       </span>
                   </p>
               </div>

               {/* Step 2 */}
               <div className="group">
                   <div className="text-6xl font-bold text-white/5 mb-4 group-hover:text-white/10 transition-colors">02</div>
                   <div className="flex items-center gap-3 text-white mb-2 font-bold tracking-widest text-sm uppercase">
                    
                       <CheckCircle size={16} /> Deploy File
                   </div>
                   <p className="text-zinc-400 text-sm font-light leading-relaxed mb-4">
                       Move the downloaded <span className="text-white">autoexec.cfg</span> file into the  
                       <span className="text-zinc-300"> cfg</span> folder and extract 
                       <span className="text-white"> L4D2_FONT.zip</span> into the 
                       <span className="text-zinc-300"> addons</span> folder. <br />
                       <span className="text-zinc-300">Double click </span> the font file to 
                       <span className="text-zinc-300"> install</span> it on your system. <br />
                       Ensure no duplicate naming conflicts exist.
                   </p>
                   <FileTreeDemo className="mt-4"/>
               </div>

               {/* Step 3 */}
               <div className="group">
                   <div className="text-6xl font-bold text-white/5 mb-4 group-hover:text-white/10 transition-colors">03</div>
                   <div className="flex items-center gap-3 text-white mb-2 font-bold tracking-widest text-sm uppercase">
                       <Terminal size={16} /> Launch Options
                   </div>
                   <p className="text-zinc-400 text-sm font-light leading-relaxed">
                       Open Steam Properties for the game, find "Launch Options" and append the following command:
                       <span className="text-green-400 font-mono text-xs block mt-2 p-2 bg-black/50 border border-white/5 rounded select-all">
                           +exec autoexec.cfg
                       </span>
                   </p>
                   <div className="flex items-center gap-3 text-white mb-2 font-bold tracking-widest text-sm uppercase mt-7">
                       <Terminal size={16} /> Edit autoexec.cfg
                   </div>
                   <p className="text-zinc-400 text-sm font-light leading-relaxed mb-5">
                       If you only want to install the font without the full config, simply add the following lines to your existing autoexec.cfg:
                       <TerminalConfig />
                   </p>
               </div>
           </div>
       </div>
    </div>
  );
};