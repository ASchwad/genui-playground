"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

from typing_extensions import Literal
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.prebuilt import ToolNode
from copilotkit import CopilotKitState
from langgraph.types import interrupt
from copilotkit.langgraph import copilotkit_emit_state
from langchain_tavily import TavilySearch
from datetime import datetime
from time import sleep
import aiohttp
import json
from langchain_core.tools import InjectedToolCallId
from typing import Annotated
import asyncio

async def get_city_coordinates(city_name):
    url = f"https://nominatim.openstreetmap.org/search?q={city_name}&format=json&limit=1"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response = await response.json()
    
    if response:
        data = response
        if data:
            latitude = data[0]['lat']
            longitude = data[0]['lon']
            return latitude, longitude
        else:
            return None
    else:
        return None

async def get_weather_data(coordinates, config: RunnableConfig):
    latitude, longitude = coordinates

    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,weather_code"
    # response
    # {'latitude': 49.02, 'longitude': 12.099998, 'generationtime_ms': 0.047087669372558594, 'utc_offset_seconds': 0, 'timezone': 'GMT', 'timezone_abbreviation': 'GMT', 'elevation': 351.0, 'current_units': {'time': 'iso8601', 'interval': 'seconds', 'temperature_2m': '°C', 'relative_humidity_2m': '%', 'weather_code': 'wmo code'}, 'current': {'time': '2025-07-01T20:00', 'interval': 900, 'temperature_2m': 27.8, 'relative_humidity_2m': 47, 'weather_code': 0}}
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response = await response.json()
    
    print("Weather data response: " + str(response))
    if response:
        data = response
        temperature = data.get('current', {}).get('temperature_2m')
        humidity = data.get('current', {}).get('relative_humidity_2m')
        weather_code = data.get('current', {}).get('weather_code')
        
        return {
            "temperature": temperature,
            "humidity": humidity if humidity is not None else -1,
            "weather_code": weather_code if weather_code is not None else -1,
        }
    else:
        await copilotkit_emit_state(config, {"observed_steps": ["Error fetching weather data!"]})
        return {
            "temperature": -1,
            "humidity": -1,
            "weather_code": -1,
        }

class AgentState(CopilotKitState):
    """
    Here we define the state of the agent

    In this instance, we're inheriting from CopilotKitState, which will bring in
    the CopilotKitState fields. We're also adding a custom field, `language`,
    which will be used to set the language of the agent.
    """
    observed_steps: list[str] = []
    proverbs: list[str] = []
    agent_name: str = ""
    temperature: float = 0
    humidity: float = 0
    weather_code: float = -1
    # your_custom_agent_state: str = ""

@tool
async def get_weather(
    location: str, 
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId]
):
    """
    Get the weather for a given city
    """
    # Clear any previous observed steps at the start of a new operation
    steps = []
    steps.append("Getting coordinates for " + location)
    await copilotkit_emit_state(config, {"observed_steps": steps, **config.get("state", {})})
    await asyncio.sleep(0.5)
    coordinates = await get_city_coordinates(location)
    await asyncio.sleep(1)
    steps.append("Retrieved coordinates:" + str(coordinates))
    await copilotkit_emit_state(config, {"observed_steps": steps, **config.get("state", {})})
    await asyncio.sleep(1)

    if coordinates is None:
        # Return Command with error message and no state update
        return Command(
            update={
                "messages": [ToolMessage(f"Unable to find coordinates for {location}!", tool_call_id=tool_call_id)]
            }
        )
    
    weather_data = await get_weather_data(coordinates, config)
    steps.append("Weather data retrieved successfully for " + location + " " + str(weather_data))
    # Use Command to update both the message and the state
    # Update the agent state and return the weather data to the frontend
    return Command(
        update={
            "temperature": weather_data["temperature"],
            "humidity": weather_data["humidity"], 
            "weather_code": weather_data["weather_code"],
            "observed_steps": steps,
            "messages": [ToolMessage(
                content=json.dumps(weather_data),  # Convert to proper JSON string
                tool_call_id=tool_call_id
            )]
        }
    )

@tool
async def web_search(query: str, config: RunnableConfig):
    """
    Search the web for current information, use this to get the latest news, weather or just newest information on a topic.
    """
    # use tavily api to search the web
    search = TavilySearch(
        max_results=5,
        include_content=True,
        search_depth="basic",
    )
    try:
        # Include the content of the search in the response
        await copilotkit_emit_state(config, {"observed_steps": ["Searching the web for " + query]})
        return await search.arun(query)
    except Exception as e:
        print(f"Error searching the web: {e}")
        return f"Error searching the web: {e}"

tools = [
    get_weather,
    # web_search
    # your_tool_here
]

async def chat_node(state: AgentState, config: RunnableConfig) -> Command[Literal["tool_node", "__end__"]]:
    """
    Standard chat node based on the ReAct design pattern. It handles:
    - The model to use (and binds in CopilotKit actions and the tools defined above)
    - The system prompt
    - Getting a response from the model
    - Handling tool calls

    For more about the ReAct design pattern, see: 
    https://www.perplexity.ai/search/react-agents-NcXLQhreS0WDzpVaS4m9Cg
    """
    #if not state.get("agent_name"):
        # Interrupt and wait for the user to respond with a name
    #    state["agent_name"] = interrupt({"type": "ask_name", "content": "Before we start, what would you like to call me?"}) 

    # 1. Define the model
    model = ChatOpenAI(model="gpt-4o")

    # 2. Bind the tools to the model
    model_with_tools = model.bind_tools(
        [
            *state["copilotkit"]["actions"],
            get_weather,
            # web_search,
            # your_tool_here
        ],

        # 2.1 Enable parallel tool calls for faster performance when making
        #     multiple tool calls simultaneously.
        parallel_tool_calls=True,
    )

    # 3. Define the system message by which the chat model will be run
    system_message = SystemMessage(
        content=f"""
        You are a helpful assistant. Talk in {state.get('language', 'english')}. 
        Never start your response by saying a question or idea or observation was good, great, fascinating, profound, excellent, or any other positive adjective. Skip the flattery and responds directly.
        {state['agent_name'] if state['agent_name'] else "Jarvis"} is your name, include it in your response by speaking your thoughts in third person. 
        
        Current date and time is {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""
    )

    # 4. Run the model to generate a response
    response = await model_with_tools.ainvoke([
        system_message,
        *state["messages"]
    ], config)

    # 5. Check for tool calls in the response and handle them. We ignore
    #    CopilotKit actions, as they are handled by CopilotKit.
    if isinstance(response, AIMessage) and response.tool_calls:
        actions = state["copilotkit"]["actions"]

        # 5.1 Check for any non-copilotkit actions in the response and
        #     if there are none, go to the tool node.
        if not any(
            action.get("name") == response.tool_calls[0].get("name")
            for action in actions
        ):
            return Command(goto="tool_node", update={
                "messages": response,
                "observed_steps": state["observed_steps"],
                "agent_name": state["agent_name"],
                "temperature": state["temperature"],
                "humidity": state["humidity"],
                "weather_code": state["weather_code"],
            })

    # 6. We've handled all tool calls, so we can end the graph.
    return Command(
        goto=END,
        update={
            "messages": response,
            "agent_name": state["agent_name"],
            "temperature": state["temperature"],
            "humidity": state["humidity"],
            "weather_code": state["weather_code"],
        }
    )

# Define the workflow graph
workflow = StateGraph(AgentState)
workflow.add_node("chat_node", chat_node)
workflow.add_node("tool_node", ToolNode(tools=tools))
workflow.add_edge("tool_node", "chat_node")
workflow.set_entry_point("chat_node")

# Compile the workflow graph
graph = workflow.compile()
