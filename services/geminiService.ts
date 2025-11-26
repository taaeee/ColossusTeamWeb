import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY;

// Initialize client lazily to ensure env var is ready if injected at runtime
let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("API_KEY not found in environment variables.");
      // We return null, caller must handle
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const createTeamChat = (): Chat | null => {
  const client = getClient();
  if (!client) return null;

  return client.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are 'Nexus', the AI analyst for Team Colossus. 
      Colossus is an elite esports and content creation team known for high-contrast aesthetics and dominance.
      
      Your style is:
      - Precise, analytical, and slightly cold but helpful.
      - Minimalist in language.
      - You emphasize data and strategy.
      
      Facts about Colossus:
      - Founded: 2024.
      - Specialization: FPS and Strategy titles.
      - Current Win Streak: 14 matches.
      
      If asked about members, mention:
      - 'Void' (Captain, Sniper)
      - 'Echo' (Support, IGL)
      - 'Flux' (Entry Fragger)
      
      Keep responses short (under 100 words) unless asked for a deep dive.`,
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "Analysis incomplete. No textual data returned.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Connection severed. Unable to reach Colossus mainframe.";
  }
};
