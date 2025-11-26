import React, { useState } from 'react';
import { Send, ChevronDown } from 'lucide-react';

export const ContactForm: React.FC = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Form submitted:', formState);
    setIsSubmitting(false);
    setFormState({ name: '', email: '', subject: 'General Inquiry', message: '' });
    alert('Transmission Sent Successfully.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 md:p-12 border border-white/10 bg-glass backdrop-blur-sm relative overflow-hidden group">
       {/* Decorative subtle gradient lines */}
       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
       <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

       <div className="mb-10 text-center">
          <h2 className="text-3xl font-light tracking-tight text-white mb-3">INITIATE CONTACT</h2>
          <div className="w-12 h-[1px] bg-white/20 mx-auto mb-3"></div>
          <p className="text-zinc-500 text-xs tracking-[0.2em] uppercase">Reach the Colossus command center</p>
       </div>

       <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 group/input">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1 group-focus-within/input:text-white transition-colors">Codename / Name</label>
              <input
                type="text"
                name="name"
                required
                value={formState.name}
                onChange={handleChange}
                className="w-full bg-zinc-900/30 border border-white/10 px-4 py-4 text-sm text-white font-light focus:outline-none focus:border-white/30 focus:bg-zinc-900/80 transition-all duration-300 placeholder-zinc-700"
                placeholder="ENTER NAME"
              />
            </div>
            <div className="space-y-2 group/input">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1 group-focus-within/input:text-white transition-colors">Frequency / Email</label>
              <input
                type="email"
                name="email"
                required
                value={formState.email}
                onChange={handleChange}
                className="w-full bg-zinc-900/30 border border-white/10 px-4 py-4 text-sm text-white font-light focus:outline-none focus:border-white/30 focus:bg-zinc-900/80 transition-all duration-300 placeholder-zinc-700"
                placeholder="ENTER EMAIL"
              />
            </div>
          </div>

          <div className="space-y-2 group/input relative">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1 group-focus-within/input:text-white transition-colors">Directive / Subject</label>
              <div className="relative">
                <select
                  name="subject"
                  value={formState.subject}
                  onChange={handleChange}
                  className="w-full bg-zinc-900/30 border border-white/10 px-4 py-4 text-sm text-white font-light focus:outline-none focus:border-white/30 focus:bg-zinc-900/80 transition-all duration-300 appearance-none cursor-pointer"
                >
                  <option value="General Inquiry" className="bg-zinc-900">GENERAL INQUIRY</option>
                  <option value="Sponsorship" className="bg-zinc-900">SPONSORSHIP</option>
                  <option value="Recruitment" className="bg-zinc-900">RECRUITMENT</option>
                  <option value="Press" className="bg-zinc-900">PRESS</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <ChevronDown size={14} />
                </div>
              </div>
          </div>

          <div className="space-y-2 group/input">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 ml-1 group-focus-within/input:text-white transition-colors">Transmission / Message</label>
            <textarea
              name="message"
              required
              value={formState.message}
              onChange={handleChange}
              rows={5}
              className="w-full bg-zinc-900/30 border border-white/10 px-4 py-4 text-sm text-white font-light focus:outline-none focus:border-white/30 focus:bg-zinc-900/80 transition-all duration-300 placeholder-zinc-700 resize-none"
              placeholder="ENTER MESSAGE DATA..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full group relative px-8 py-4 bg-white text-black text-sm tracking-[0.2em] font-medium overflow-hidden hover:text-white border border-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isSubmitting ? 'TRANSMITTING...' : 'SEND TRANSMISSION'} 
              {!isSubmitting && <Send size={14} className="group-hover:translate-x-1 transition-transform" />}
            </span>
            <div className="absolute inset-0 bg-zinc-900 transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
          </button>
       </form>
    </div>
  );
};