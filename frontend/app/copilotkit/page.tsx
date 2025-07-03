"use client";

import dynamic from "next/dynamic";
import {
  useCoAgent,
  useCoAgentStateRender,
  useCopilotAction,
  useCopilotReadable,
} from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import WeatherCard from "../../components/WeatherCard";
import { AGENT_CONFIGS, getAllConfigs } from "../../config/agent-config";
import { AgentConfigSelector } from "../../components/AgentConfigSelector";

// Disable SSR to prevent hydration mismatches
const CopilotKitPageNoSSR = dynamic(
  () => Promise.resolve({ default: CopilotKitPageImpl }),
  {
    ssr: false,
  }
);

export default function CopilotKitPage() {
  return <CopilotKitPageNoSSR />;
}

function CopilotKitPageImpl() {
  const [themeColor, setThemeColor] = useState("#6366f1");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/guides/frontend-actions
  useCopilotAction({
    name: "setThemeColor",
    parameters: [
      {
        name: "themeColor",
        description: "The theme color to set. Make sure to pick nice colors.",
        required: true,
      },
    ],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  return (
    <main
      style={
        { "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties
      }
    >
      <YourMainContent themeColor={themeColor} />
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen={true}
        labels={{
          title: "Popup Assistant",
          initial:
            '👋 Hi, there! You\'re chatting with an agent. This agent comes with a few tools to get you started.\n\nFor example you can try:\n- **Frontend Tools**: "Set the theme to orange"\n- **Shared State**: "Write a proverb about AI"\n- **Generative UI**: "Get the weather in SF"\n\nAs you interact with the agent, you\'ll see the UI update in real-time to reflect the agent\'s **state**, **tool calls**, and **progress**.',
        }}
      />
    </main>
  );
}

// State of the agent, make sure this aligns with your agent's state.
type AgentState = {
  proverbs: string[];
  agent_name: string;
  temperature: number;
  humidity: number;
  weather_code: number;
  observed_steps: string[];
  system_prompt: string;
  // Confirmation state
  pending_confirmation: boolean;
  confirmation_message: string;
  confirmation_context: string;
  user_response: string;
};

function YourMainContent({ themeColor }: { themeColor: string }) {
  const [selectedConfig, setSelectedConfig] = useState<string>("default");

  // Get configuration data
  const getConfigData = (configKey: string) => {
    const allConfigs = getAllConfigs();
    return allConfigs[configKey] || AGENT_CONFIGS.default;
  };

  // 🪁 Shared State: https://docs.copilotkit.ai/coagents/shared-state
  const { state, setState } = useCoAgent<AgentState>({
    name: "sample_agent",
    initialState: {
      proverbs: [
        "CopilotKit may be new, but its the best thing since sliced bread.",
      ],
      // Use the selected configuration
      agent_name: getConfigData(selectedConfig).agent_name,
      temperature: 0,
      humidity: 0,
      weather_code: -1,
      observed_steps: [],
      system_prompt: getConfigData(selectedConfig).system_prompt,
      // Confirmation state
      pending_confirmation: false,
      confirmation_message: "",
      confirmation_context: "",
      user_response: "",
    },
  });

  // Combined state renderer for chat UI - removed observed steps since they're now shown in tool context
  useCoAgentStateRender({
    name: "sample_agent",
    render: ({}) => {
      // We can add other global state displays here if needed
      return null;
    },
  });

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/coagents/frontend-actions
  useCopilotAction({
    name: "addProverb",
    parameters: [
      {
        name: "proverb",
        description: "The proverb to add. Make it witty, short and concise.",
        required: true,
      },
    ],
    handler: ({ proverb }) => {
      setState({
        ...state,
        system_prompt: "",
        proverbs: [...state.proverbs, proverb],
      });
    },
  });

  //🪁 Generative UI: https://docs.copilotkit.ai/coagents/generative-ui
  useCopilotAction({
    name: "get_weather",
    disabled: true,
    description: "Get the weather for a given location.",
    parameters: [{ name: "location", type: "string", required: true }],
    render: (props: {
      args: any;
      result:
        | {
            temperature: number;
            humidity: number;
            weather_code: number;
            observed_steps: string[];
          }
        | undefined;
      status: string;
    }) => {
      const { args, result, status } = props;

      return (
        <div className="space-y-3">
          {/* Show progress steps when executing */}
          {status === "executing" && state.observed_steps?.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-700 mb-2">
                Getting Weather Data...
              </h3>
              <ul className="text-sm text-blue-600 space-y-1">
                {state.observed_steps.map((step: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status === "complete" && result && (
            <>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-green-700">
                  🔍 Weather Data Retrieved
                </h3>
              </div>
              {/* Show weather card */}
              <WeatherCard
                status={status}
                location={args.location}
                themeColor={themeColor}
                temperature={result?.temperature}
                humidity={result?.humidity}
                weather_code={result?.weather_code}
              />
            </>
          )}
        </div>
      );
    },
  });

  //🪁 Generative UI: https://docs.copilotkit.ai/coagents/generative-ui
  useCopilotAction({
    name: "web_search",
    disabled: true,
    description:
      "Search the web for current information, use this to get the latest news or just newest information on a topic.",
    parameters: [{ name: "query", type: "string", required: true }],
    render: (props: {
      args: any;
      result:
        | {
            content: string;
            observed_steps: string[];
          }
        | undefined;
      status: string;
    }) => {
      const { result, status } = props;

      return (
        <div className="space-y-3">
          {/* Show progress steps when executing */}
          {status === "executing" && state.observed_steps?.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-700 mb-2">
                Searching the web...
              </h3>
              <ul className="text-sm text-blue-600 space-y-1">
                {state.observed_steps.map((step: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status === "complete" && result && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold text-green-700">
                🔍 Web search completed
              </h3>
            </div>
          )}
        </div>
      );
    },
  });

  //🪁 Confirmation UI: Renders Yes/No buttons when agent asks for confirmation
  useCopilotAction({
    name: "ask_user_confirmation",
    disabled: true,
    description: "Ask the user for Yes/No confirmation",
    parameters: [
      { name: "message", type: "string", required: true },
      { name: "context", type: "string", required: false },
    ],
    render: (props: {
      args: any;
      result:
        | {
            message: string;
            context: string;
            status: string;
          }
        | undefined;
      status: string;
    }) => {
      const { args, result, status } = props;
      
      const handleResponse = async (response: string) => {
        // Update the agent state with the user's response
        setState({
          ...state,
          pending_confirmation: false,
          user_response: response,
        });
        
        // Also send the response back to the agent using the action
        // This will be picked up by the agent in the next iteration
        try {
          // We'll let the agent pick up the response from the state
          console.log("User responded:", response);
        } catch (error) {
          console.error("Error sending confirmation response:", error);
        }
      };
      
      if (status === "executing" || (result && result.status === "waiting_for_response")) {
        const message = args?.message || result?.message || "Do you want to proceed?";
        const context = args?.context || result?.context || "";
        
        return (
          <div className="space-y-3">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-amber-600 text-lg">❓</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">
                    Confirmation Required
                  </h3>
                  <p className="text-amber-700 mb-3">{message}</p>
                  {context && (
                    <p className="text-amber-600 text-sm mb-3 italic">{context}</p>
                  )}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleResponse("yes")}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>✓</span>
                      <span>Yes</span>
                    </button>
                    <button
                      onClick={() => handleResponse("no")}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>✗</span>
                      <span>No</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      if (status === "complete" && result) {
        return (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-green-700">
              ✓ Response recorded
            </h3>
          </div>
        );
      }
      
      return null;
    },
  });

  // Action to handle user confirmation responses
  useCopilotAction({
    name: "respond_to_confirmation",
    description: "Handle user response to confirmation request",
    parameters: [
      { name: "response", type: "string", description: "User's response: 'yes' or 'no'", required: true },
    ],
    handler: ({ response }) => {
      setState({
        ...state,
        pending_confirmation: false,
        user_response: response,
      });
    },
  });

  const changeAgentName = () => {
    setState({ ...state, system_prompt: "Habla español" });

    // re-run the agent and provide a hint about what's changed
  };

  // Function to switch agent configuration
  const switchAgentConfig = (config: string) => {
    const newConfig = getConfigData(config);
    setSelectedConfig(config);

    setState({
      ...state,
      agent_name: newConfig.agent_name,
      system_prompt: newConfig.system_prompt,
    });
  };

  return (
    <>
      <AgentConfigSelector
        selectedConfig={selectedConfig}
        onConfigChange={switchAgentConfig}
        currentSystemPrompt={state.system_prompt}
        agentName={state.agent_name}
      />

      <div
        style={{ backgroundColor: themeColor }}
        className="h-screen w-screen flex justify-center items-center flex-col transition-colors duration-300"
      >
        <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-white mb-2 text-center">
            Proverbs
          </h1>
          <p className="text-gray-200 text-center italic mb-6">
            {state.agent_name}
          </p>
          <p className="text-gray-200 text-center italic mb-6">
            This is a demonstrative page, but it could be anything you want! 🪁
          </p>
          <hr className="border-white/20 my-6" />
          <div className="flex flex-col gap-3">
            {state.proverbs?.map((proverb, index) => (
              <div
                key={index}
                className="bg-white/15 p-4 rounded-xl text-white relative group hover:bg-white/20 transition-all"
              >
                <p className="pr-8">{proverb}</p>
                <button
                  onClick={() =>
                    setState({
                      ...state,
                      proverbs: state.proverbs?.filter((_, i) => i !== index),
                    })
                  }
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity 
                    bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p>{state.system_prompt}</p>
          <button onClick={changeAgentName}>Set System Prompt</button>
          {state.proverbs?.length === 0 && (
            <p className="text-center text-white/80 italic my-8">
              No proverbs yet. Ask the assistant to add some!
            </p>
          )}
        </div>
      </div>
    </>
  );
}
