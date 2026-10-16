import asyncio
import httpx
from ddgs import DDGS
from mcp.server.fastmcp import Context
from AI_Platform_MCP.app import mcp

try:
    from src.core.logging import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    
    class SmartFallbackLogger:
        """Acts as a shim to make standard logging swallow structlog key=val syntax"""
        def __init__(self, name):
            self._log = logging.getLogger(name)
            
        def _process(self, log_fn, msg, kwargs):
            std_keys = {'exc_info', 'stack_info', 'stacklevel', 'extra'}
            std_kwargs = {k: kwargs.pop(k) for k in list(kwargs.keys()) if k in std_keys}
            
            if kwargs:
                extras = " | ".join(f"{k}={v}" for k, v in kwargs.items())
                msg = f"{msg} [{extras}]"
                
            log_fn(msg, **std_kwargs)

        def info(self, msg, **kw): self._process(self._log.info, msg, kw)
        def warning(self, msg, **kw): self._process(self._log.warning, msg, kw)
        def error(self, msg, **kw): self._process(self._log.error, msg, kw)
        def debug(self, msg, **kw): self._process(self._log.debug, msg, kw)

    logger = SmartFallbackLogger(__name__)

@mcp.tool()
async def web_search(query: str, ctx: Context = None) -> str:
    """
    Perform a general web search using search engines.

    Args:
        query: The search query string.
    """
    logger.info("web_search called", query=query)
    try:
        def run_search():
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=5))

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, run_search)

        if not results:
            return f"No search results found for '{query}'."

        formatted_results = []
        for i, r in enumerate(results, 1):
            formatted_results.append(
                f"[{i}] {r.get('title')}\nURL: {r.get('href')}\nSnippet: {r.get('body')}\n"
            )
        return "\n".join(formatted_results)
    except Exception as e:
        logger.error("web_search failed", error=str(e))
        return f"Error performing search: {str(e)}"

WMO_CODE_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Drizzle: Light intensity",
    53: "Drizzle: Moderate intensity",
    55: "Drizzle: Dense intensity",
    61: "Rain: Slight intensity",
    63: "Rain: Moderate intensity",
    65: "Rain: Heavy intensity",
    71: "Snow fall: Slight intensity",
    73: "Snow fall: Moderate intensity",
    75: "Snow fall: Heavy intensity",
    80: "Rain showers: Slight",
    81: "Rain showers: Moderate",
    82: "Rain showers: Violent",
    95: "Thunderstorm: Slight or moderate",
}

@mcp.tool()
async def get_current_weather(location: str, date: str = None, ctx: Context = None) -> str:
    """
    Retrieve the weather conditions for a specific location.

    Args:
        location: The location or city to query the weather for.
        date: Optional date to query weather for, formatted as YYYY-MM-DD (e.g. 2026-06-24). Defaults to today.
    """
    logger.info("get_current_weather called", location=location, date=date)
    try:
        # 1. Parse target date
        import datetime as dt
        today = dt.date.today()
        if date:
            try:
                target_date = dt.datetime.strptime(date.strip(), "%Y-%m-%d").date()
            except ValueError:
                return f"Invalid date format '{date}'. Please use YYYY-MM-DD format (e.g., 2026-06-24)."
        else:
            target_date = today

        # 2. Geocode location to coordinates using Open-Meteo Geocoding API
        async with httpx.AsyncClient(timeout=15.0) as client:
            geo_response = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": location, "count": 1, "language": "en", "format": "json"}
            )
            geo_data = geo_response.json()
            results = geo_data.get("results")
            if not results:
                return f"Could not find coordinates or locate location '{location}'."

            city_info = results[0]
            name = city_info.get("name")
            lat = city_info.get("latitude")
            lon = city_info.get("longitude")
            country = city_info.get("country", "")

            # 3. Route based on target date
            is_past = target_date < today
            
            if is_past:
                # Query historical archive API
                weather_response = await client.get(
                    "https://archive-api.open-meteo.com/v1/archive",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "start_date": target_date.isoformat(),
                        "end_date": target_date.isoformat(),
                        "daily": "temperature_2m_max,temperature_2m_min,weather_code",
                        "timezone": "auto"
                    }
                )
                weather_data = weather_response.json()
                daily = weather_data.get("daily")
                if not daily or "time" not in daily or len(daily["time"]) == 0:
                    return f"Failed to retrieve historical weather data for {name}, {country} on {target_date.isoformat()}."
                
                date_str = daily["time"][0]
                max_temp = daily["temperature_2m_max"][0]
                min_temp = daily["temperature_2m_min"][0]
                code = daily["weather_code"][0]
                condition = WMO_CODE_MAP.get(code, f"Unknown code ({code})")
                
                return (
                    f"Historical weather details for {name}, {country} on {date_str}:\n"
                    f"- Conditions: {condition}\n"
                    f"- Temperature Range: {min_temp}°C to {max_temp}°C"
                )
            else:
                # Query forecast API
                # Max forecast limit is 16 days
                days_diff = (target_date - today).days
                if days_diff > 16:
                    return f"Forecast limit exceeded. Open-Meteo forecast API only supports up to 16 days from today."
                
                # Fetch target date weather
                weather_response = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "start_date": target_date.isoformat(),
                        "end_date": target_date.isoformat(),
                        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code" if target_date == today else None,
                        "daily": "temperature_2m_max,temperature_2m_min,weather_code",
                        "timezone": "auto"
                    }
                )
                weather_data = weather_response.json()
                current = weather_data.get("current")
                daily = weather_data.get("daily")

                report = ""
                if target_date == today and current:
                    temp = current.get("temperature_2m")
                    humidity = current.get("relative_humidity_2m")
                    feels_like = current.get("apparent_temperature")
                    wind_speed = current.get("wind_speed_10m")
                    code = current.get("weather_code")
                    time_str = current.get("time", "").replace("T", " ")
                    condition = WMO_CODE_MAP.get(code, f"Unknown code ({code})")

                    report = (
                        f"Current weather details for {name}, {country} (as of {time_str} UTC):\n"
                        f"- Conditions: {condition}\n"
                        f"- Temperature: {temp}°C (Feels like: {feels_like}°C)\n"
                        f"- Humidity: {humidity}%\n"
                        f"- Wind Speed: {wind_speed} km/h\n\n"
                    )

                if daily and "time" in daily and len(daily["time"]) > 0:
                    date_str = daily["time"][0]
                    max_temp = daily["temperature_2m_max"][0]
                    min_temp = daily["temperature_2m_min"][0]
                    code = daily["weather_code"][0]
                    condition = WMO_CODE_MAP.get(code, f"Unknown code ({code})")
                    
                    report += (
                        f"Forecasted weather for {name}, {country} on {date_str}:\n"
                        f"- Conditions: {condition}\n"
                        f"- Temperature Range: {min_temp}°C to {max_temp}°C"
                    )
                return report
    except Exception as e:
        logger.error("get_current_weather failed", error=str(e))
        return f"Error retrieving weather for '{location}' on '{date}': {str(e)}"
