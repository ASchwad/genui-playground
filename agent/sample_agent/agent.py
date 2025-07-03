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
from copilotkit.langgraph import copilotkit_emit_state
from langchain_tavily import TavilySearch
from datetime import datetime
from time import sleep
import aiohttp
import json
from langchain_core.tools import InjectedToolCallId
from typing import Annotated, List, Dict, Any
import asyncio
import re

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
    system_prompt: str = ""
    # Enhanced web search state
    search_plan: list[str] = []
    search_results: dict[str, Any] = {}
    # your_custom_agent_state: str = ""

async def plan_web_searches(query: str, config: RunnableConfig) -> List[str]:
    """
    Analyze a complex query and break it down into multiple specific search queries.
    Uses GPT to understand the intent and create a search plan.
    """
    planning_model = ChatOpenAI(model="gpt-4o", temperature=0)
    
    planning_prompt = f"""
    You are a web search planning assistant. Given a user query, break it down into specific, focused search queries that will help gather all the necessary information.

    Rules:
    1. Identify if the query requires multiple searches (e.g., time-series data, comparisons, different aspects)
    2. Create specific, focused search queries that will return relevant results
    3. For stock/financial queries, include specific years or timeframes
    4. For ATH (All-Time High) requests, create separate searches for each year
    5. Maximum 5 search queries to avoid overwhelming the user
    6. Return ONLY a JSON array of search query strings, nothing else

    Examples:
    Query: "Stock development for last 3 years on BMW I want to have the ATH for each year"
    Response: ["BMW stock price 2022 all time high", "BMW stock price 2023 all time high", "BMW stock price 2024 all time high", "BMW stock performance last 3 years"]

    Query: "Compare Tesla and Ford stock performance"
    Response: ["Tesla stock performance 2024", "Ford stock performance 2024", "Tesla vs Ford stock comparison"]

    Query: "Current weather in New York"
    Response: ["current weather New York"]

    User Query: {query}
    """
    
    try:
        response = await planning_model.ainvoke([SystemMessage(content=planning_prompt)])
        
        # Extract JSON from response
        content = response.content.strip()
        
        # Try to parse as JSON
        try:
            search_queries = json.loads(content)
            if isinstance(search_queries, list) and len(search_queries) > 0:
                await copilotkit_emit_state(config, {
                    "search_plan": search_queries,
                    "observed_steps": [f"Created search plan with {len(search_queries)} queries"]
                })
                return search_queries
        except json.JSONDecodeError:
            # Fallback: extract queries from text if JSON parsing fails
            lines = content.split('\n')
            queries = []
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#') and not line.startswith('//'):
                    # Remove quotes and brackets
                    clean_line = re.sub(r'^[\[\]"\']+|[\[\]"\']+$', '', line)
                    clean_line = re.sub(r'^["\']|["\']$', '', clean_line)
                    if clean_line:
                        queries.append(clean_line)
            
            if queries:
                await copilotkit_emit_state(config, {
                    "search_plan": queries,
                    "observed_steps": [f"Created search plan with {len(queries)} queries (text parsed)"]
                })
                return queries
        
        # Fallback to single query
        await copilotkit_emit_state(config, {
            "search_plan": [query],
            "observed_steps": ["Using original query as single search"]
        })
        return [query]
        
    except Exception as e:
        print(f"Error in search planning: {e}")
        await copilotkit_emit_state(config, {
            "search_plan": [query],
            "observed_steps": [f"Planning failed, using original query: {str(e)}"]
        })
        return [query]

async def execute_search_plan(search_queries: List[str], config: RunnableConfig) -> Dict[str, Any]:
    """
    Execute multiple web searches based on the search plan and synthesize results.
    """
    search = TavilySearch(
        max_results=3,  # Reduced per query to manage total results
        include_content=True,
        search_depth="basic",
    )
    
    all_results = {}
    steps = []
    
    try:
        for i, query in enumerate(search_queries, 1):
            steps.append(f"Executing search {i}/{len(search_queries)}: {query}")
            await copilotkit_emit_state(config, {"observed_steps": steps})
            
            try:
                result = await search.arun(query)
                all_results[query] = result
                steps.append(f"✓ Completed search {i}: Found {len(result) if isinstance(result, list) else 1} results")
                await copilotkit_emit_state(config, {"observed_steps": steps})
                
                # Add small delay between searches to be respectful
                await asyncio.sleep(0.5)
                
            except Exception as e:
                error_msg = f"✗ Error in search {i}: {str(e)}"
                steps.append(error_msg)
                all_results[query] = {"error": str(e)}
                await copilotkit_emit_state(config, {"observed_steps": steps})
        
        # Synthesize results
        steps.append("Synthesizing results from all searches...")
        await copilotkit_emit_state(config, {"observed_steps": steps})
        
        synthesized = await synthesize_search_results(all_results, config)
        
        steps.append("✓ Search plan completed successfully")
        await copilotkit_emit_state(config, {"observed_steps": steps})
        
        return {
            "individual_results": all_results,
            "synthesized_summary": synthesized,
            "search_plan": search_queries,
            "total_searches": len(search_queries)
        }
        
    except Exception as e:
        error_msg = f"Error executing search plan: {str(e)}"
        steps.append(error_msg)
        await copilotkit_emit_state(config, {"observed_steps": steps})
        return {"error": error_msg, "partial_results": all_results}

async def synthesize_search_results(results: Dict[str, Any], config: RunnableConfig) -> str:
    """
    Use GPT to synthesize multiple search results into a coherent summary.
    """
    synthesis_model = ChatOpenAI(model="gpt-4o", temperature=0.3)
    
    # Prepare results for synthesis
    results_text = ""
    for query, result in results.items():
        results_text += f"\n\nSearch Query: {query}\n"
        if isinstance(result, list):
            for item in result:
                if isinstance(item, dict):
                    title = item.get('title', '')
                    content = item.get('content', '')
                    url = item.get('url', '')
                    results_text += f"Title: {title}\nContent: {content[:500]}...\nURL: {url}\n\n"
        elif isinstance(result, dict) and 'error' not in result:
            results_text += f"Result: {str(result)[:500]}...\n"
        elif isinstance(result, dict) and 'error' in result:
            results_text += f"Error: {result['error']}\n"
    
    synthesis_prompt = f"""
    You are a research synthesis assistant. Analyze the following search results from multiple queries and create a comprehensive, well-organized summary.

    Instructions:
    1. Identify the main topics and themes across all searches
    2. Organize information logically (chronologically for time-series data, by category for comparisons)
    3. Highlight key findings, numbers, and dates
    4. Note any conflicting information or gaps
    5. Provide a clear, actionable summary
    6. Keep it concise but comprehensive (max 500 words)

    Search Results:
    {results_text}

    Provide a well-structured synthesis:
    """
    
    try:
        response = await synthesis_model.ainvoke([SystemMessage(content=synthesis_prompt)])
        return response.content.strip()
    except Exception as e:
        return f"Error synthesizing results: {str(e)}\n\nRaw results available in individual search results."

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
    Search the web for current information. This tool can handle both simple and complex queries.
    For complex queries requiring multiple searches (e.g., "BMW stock ATH for last 3 years"), 
    it will automatically create a search plan and execute multiple focused searches.
    """
    try:
        await copilotkit_emit_state(config, {"observed_steps": ["Analyzing search query..."]})
        
        # Plan the searches based on query complexity
        search_queries = await plan_web_searches(query, config)
        
        if len(search_queries) == 1:
            # Simple single search
            await copilotkit_emit_state(config, {"observed_steps": ["Executing single web search..."]})
            search = TavilySearch(
                max_results=5,
                include_content=True,
                search_depth="basic",
            )
            result = await search.arun(query)
            await copilotkit_emit_state(config, {"observed_steps": ["✓ Web search completed"]})
            return result
        else:
            # Complex multi-search plan
            await copilotkit_emit_state(config, {
                "observed_steps": [f"Executing multi-search plan with {len(search_queries)} queries..."]
            })
            result = await execute_search_plan(search_queries, config)
            return result
            
    except Exception as e:
        error_msg = f"Error searching the web: {e}"
        print(error_msg)
        await copilotkit_emit_state(config, {"observed_steps": [f"✗ {error_msg}"]})
        return error_msg

tools = [
    get_weather,
    web_search
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
    print("state", state)
    
    # Provide a default system prompt if none is set
    if not state.get("system_prompt"):
        state["system_prompt"] = "You are a helpful and knowledgeable assistant."
    
    print("state", state)

    # 1. Define the model
    model = ChatOpenAI(model="gpt-4o")

    # 2. Bind the tools to the model
    model_with_tools = model.bind_tools(
        [
            *state["copilotkit"]["actions"],
            *tools,
        ],

        # 2.1 Enable parallel tool calls for faster performance when making
        #     multiple tool calls simultaneously.
        parallel_tool_calls=True,
    )

    # 3. Define the system message by which the chat model will be run
    system_message = SystemMessage(
        content=f"""
        {state['system_prompt']}

        Never start your response by saying a question or idea or observation was good, great, fascinating, profound, excellent, or any other positive adjective. Skip the flattery and responds directly.
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
                "search_plan": state.get("search_plan", []),
                "search_results": state.get("search_results", {}),
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
            "search_plan": state.get("search_plan", []),
            "search_results": state.get("search_results", {}),
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
