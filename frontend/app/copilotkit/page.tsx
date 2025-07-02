"use client";

import dynamic from "next/dynamic";
import {
  useCoAgent,
  useCoAgentStateRender,
  useCopilotAction,
  useLangGraphInterrupt,
} from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useState } from "react";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import WeatherCard from "../../components/WeatherCard";

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
};

function YourMainContent({ themeColor }: { themeColor: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/coagents/shared-state
  const { state, setState, run } = useCoAgent<AgentState>({
    name: "sample_agent",
    initialState: {
      proverbs: [
        "CopilotKit may be new, but its the best thing since sliced bread.",
      ],
      agent_name: "",
      temperature: 0,
      humidity: 0,
      weather_code: -1,
      observed_steps: [],
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

  useLangGraphInterrupt({
    enabled: (event) => {
      console.log("event", event);
      console.log("event.eventValue.type", event.eventValue.type);
      return event.eventValue.type === "ask_name";
    },
    render: ({ event, resolve }) => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/20">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Agent Response Required
            </h3>
            <p className="text-gray-600 bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
              {event.value.content}
            </p>
          </div>
          <p>Temperature: {state.temperature}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resolve((e.target as HTMLFormElement).response.value);
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="text"
                name="response"
                placeholder="Enter your response"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                Submit Response
              </button>
            </div>
          </form>
        </div>
      </div>
    ),
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

  const changeAgentName = () => {
    setState({ ...state, agent_name: "test" });

    // re-run the agent and provide a hint about what's changed
    run(({ previousState, currentState }) => {
      console.log("previousState", previousState);
      console.log("currentState", currentState);
      return new TextMessage({
        role: MessageRole.User,
        content: `the language has been updated from ${previousState.agent_name} to ${currentState.agent_name}`,
      });
    });
  };

  return (
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
        <p>{state.agent_name}</p>
        <button onClick={changeAgentName}>Set Agent Name</button>
        {state.proverbs?.length === 0 && (
          <p className="text-center text-white/80 italic my-8">
            No proverbs yet. Ask the assistant to add some!
          </p>
        )}
      </div>
    </div>
  );
}
