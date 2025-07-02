interface WeatherCardProps {
  location?: string;
  themeColor: string;
  temperature?: number;
  humidity?: number;
  weather_code?: number;
  status?: string;
}

// Get the appropriate weather emoji based on weather code
function getWeatherEmoji(weatherCode?: number) {
  if (!weatherCode && weatherCode !== 0) return "☀️";

  if (weatherCode === 0) return "☀️";
  if (weatherCode >= 1 && weatherCode <= 3) return "⛅";
  if (weatherCode === 45) return "🌫️";
  if (weatherCode >= 61 && weatherCode <= 67) return "🌧️";
  if (weatherCode >= 71 && weatherCode <= 75) return "❄️";
  if (weatherCode >= 95 && weatherCode <= 99) return "⛈️";

  // Default to sun for unknown codes
  return "☀️";
}

// Get weather description based on weather code
function getWeatherDescription(weatherCode?: number) {
  if (!weatherCode && weatherCode !== 0) return "Clear skies";

  if (weatherCode === 0) return "Clear skies";
  if (weatherCode >= 1 && weatherCode <= 3) return "Partly cloudy";
  if (weatherCode === 45) return "Foggy";
  if (weatherCode >= 61 && weatherCode <= 67) return "Rainy";
  if (weatherCode >= 71 && weatherCode <= 75) return "Snowy";
  if (weatherCode >= 95 && weatherCode <= 99) return "Thunderstorms";

  return "Clear skies";
}

// Skeleton component for loading state
export function WeatherCardSkeleton({ themeColor }: { themeColor: string }) {
  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-4 w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-white/30 rounded-md w-24 animate-pulse"></div>
            <div className="h-4 bg-white/20 rounded-md w-32 animate-pulse"></div>
          </div>
          <div className="text-6xl animate-pulse">⏳</div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="h-10 bg-white/30 rounded-md w-16 animate-pulse"></div>
          <div className="h-4 bg-white/20 rounded-md w-20 animate-pulse"></div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/30">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="h-3 bg-white/20 rounded w-12 mx-auto animate-pulse"></div>
              <div className="h-4 bg-white/30 rounded w-8 mx-auto animate-pulse"></div>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-white/20 rounded w-16 mx-auto animate-pulse"></div>
              <div className="h-4 bg-white/30 rounded w-6 mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeatherCard({
  location,
  themeColor,
  temperature,
  humidity,
  weather_code,
  status,
}: WeatherCardProps) {
  if (status !== "complete") {
    return <WeatherCardSkeleton themeColor={themeColor} />;
  }

  if (
    temperature === undefined ||
    humidity === undefined ||
    weather_code === undefined
  ) {
    return <div>No weather data available</div>;
  }

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-4 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white capitalize">
              {location}
            </h3>
            <p className="text-white">Current Weather</p>
          </div>
          <div className="text-6xl">{getWeatherEmoji(weather_code)}</div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="text-3xl font-bold text-white">
            {`${temperature}°C`}
          </div>
          <div className="text-sm text-white">
            {getWeatherDescription(weather_code)}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-white text-xs">Humidity</p>
              <p className="text-white font-medium">{`${humidity}%`}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
