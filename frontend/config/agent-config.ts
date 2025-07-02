// Configuration for different agent personalities/roles
export const AGENT_CONFIGS = {
  default: {
    system_prompt: "You are a helpful and knowledgeable assistant.",
    agent_name: "Jarvis",
    icon: "🤖",
    isCustom: false,
  },
  weather_expert: {
    system_prompt:
      "You are a specialized weather analysis AI. Provide detailed weather insights and recommendations.",
    agent_name: "WeatherBot",
    icon: "🌤️",
    isCustom: false,
  },
  spanish_assistant: {
    system_prompt:
      "Eres un asistente útil que habla español. Responde siempre en español.",
    agent_name: "Carlos",
    icon: "🇪🇸",
    isCustom: false,
  },
  creative_writer: {
    system_prompt:
      "You are a creative writing assistant. Help users with storytelling, poetry, and creative content.",
    agent_name: "Muse",
    icon: "✍️",
    isCustom: false,
  },
};

export type AgentConfigType = keyof typeof AGENT_CONFIGS | string; // Allow custom keys

export interface CustomAgentConfig {
  system_prompt: string;
  agent_name: string;
  icon: string;
  isCustom: true;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  system_prompt: string;
  agent_name: string;
  icon: string;
  isCustom: boolean;
}

// Available icons for custom prompts
export const AVAILABLE_ICONS = [
  "🤖",
  "🧠",
  "💡",
  "⚡",
  "🎯",
  "🚀",
  "🔥",
  "💎",
  "🌟",
  "⭐",
  "🎨",
  "✍️",
  "📝",
  "📚",
  "🎭",
  "🎪",
  "🎨",
  "🖼️",
  "🎬",
  "🎵",
  "🌤️",
  "🌦️",
  "⛈️",
  "🌈",
  "🌍",
  "🌎",
  "🌏",
  "🗺️",
  "🏔️",
  "🌋",
  "💻",
  "⌨️",
  "🖥️",
  "📱",
  "💿",
  "🔧",
  "⚙️",
  "🛠️",
  "🔬",
  "🧪",
  "🇪🇸",
  "🇫🇷",
  "🇩🇪",
  "🇮🇹",
  "🇯🇵",
  "🇰🇷",
  "🇨🇳",
  "🇷🇺",
  "🇮🇳",
  "🇧🇷",
  "🍳",
  "👨‍🍳",
  "🍕",
  "🍔",
  "🥗",
  "🍜",
  "🍱",
  "🧁",
  "🍰",
  "☕",
  "📖",
  "🎓",
  "👨‍🏫",
  "🧑‍🎓",
  "📐",
  "🔢",
  "🧮",
  "📊",
  "📈",
  "📉",
  "🎯",
  "🏆",
  "🥇",
  "🎖️",
  "🏅",
  "👑",
  "💪",
  "🚀",
  "🌟",
  "✨",
];

// LocalStorage utilities for custom prompts
export const CUSTOM_PROMPTS_KEY = "copilotkit_custom_prompts";

export function getCustomPrompts(): Record<string, CustomAgentConfig> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(CUSTOM_PROMPTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error loading custom prompts:", error);
    return {};
  }
}

export function saveCustomPrompt(
  config: Omit<CustomAgentConfig, "id" | "createdAt" | "updatedAt">
): string {
  const customPrompts = getCustomPrompts();
  const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newConfig: CustomAgentConfig = {
    ...config,
    id,
    createdAt: now,
    updatedAt: now,
    isCustom: true,
  };

  customPrompts[id] = newConfig;

  try {
    localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(customPrompts));
    return id;
  } catch (error) {
    console.error("Error saving custom prompt:", error);
    throw new Error("Failed to save custom prompt");
  }
}

export function updateCustomPrompt(
  id: string,
  updates: Partial<
    Pick<CustomAgentConfig, "system_prompt" | "agent_name" | "icon">
  >
): void {
  const customPrompts = getCustomPrompts();

  if (!customPrompts[id]) {
    throw new Error("Custom prompt not found");
  }

  customPrompts[id] = {
    ...customPrompts[id],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(customPrompts));
  } catch (error) {
    console.error("Error updating custom prompt:", error);
    throw new Error("Failed to update custom prompt");
  }
}

export function deleteCustomPrompt(id: string): void {
  const customPrompts = getCustomPrompts();
  delete customPrompts[id];

  try {
    localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(customPrompts));
  } catch (error) {
    console.error("Error deleting custom prompt:", error);
    throw new Error("Failed to delete custom prompt");
  }
}

export function getAllConfigs(): Record<
  string,
  AgentConfig | CustomAgentConfig
> {
  const builtInConfigs = Object.fromEntries(
    Object.entries(AGENT_CONFIGS).map(([key, config]) => [
      key,
      { ...config, isCustom: false },
    ])
  );

  const customConfigs = getCustomPrompts();

  return { ...builtInConfigs, ...customConfigs };
}
