import { useState, useEffect } from "react";
import { Settings, ChevronDown, User, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getAllConfigs,
  CustomAgentConfig,
  AgentConfig,
} from "../config/agent-config";
import { PromptEditor } from "./PromptEditor";

interface AgentConfigSelectorProps {
  selectedConfig: string;
  onConfigChange: (config: string) => void;
  currentSystemPrompt: string;
  agentName: string;
}

export function AgentConfigSelector({
  selectedConfig,
  onConfigChange,
  currentSystemPrompt,
  agentName,
}: AgentConfigSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allConfigs, setAllConfigs] = useState<
    Record<string, AgentConfig | CustomAgentConfig>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Load all configurations (built-in + custom)
  useEffect(() => {
    setAllConfigs(getAllConfigs());
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const selectedConfigData = allConfigs[selectedConfig];

  // Separate built-in and custom configs
  const builtInConfigs = Object.entries(allConfigs).filter(
    ([, config]) => !config.isCustom
  );
  const customConfigs = Object.entries(allConfigs).filter(
    ([, config]) => config.isCustom
  );

  return (
    <>
      {/* Floating Toggle Button with Current Agent */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-40 bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg hover:bg-white/95 transition-all duration-200"
      >
        {selectedConfigData && (
          <span className="text-base mr-2">{selectedConfigData.icon}</span>
        )}
        <span className="font-medium">{agentName}</span>
        <ChevronDown
          className={`h-4 w-4 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Floating Configuration Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Configuration Card */}
          <Card className="fixed top-16 right-4 w-80 z-50 shadow-2xl border-0 bg-white/95 backdrop-blur-md max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Agent Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1">
              {/* Current Agent Display */}
              {selectedConfigData && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{selectedConfigData.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-gray-500" />
                      <span className="font-medium text-sm truncate">
                        {agentName}
                      </span>
                    </div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {selectedConfigData.isCustom
                        ? "Custom Agent"
                        : "Built-in Agent"}
                    </Badge>
                  </div>
                  {selectedConfigData.isCustom && (
                    <PromptEditor
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      }
                      existingPrompt={selectedConfigData as CustomAgentConfig}
                      onSave={handleRefresh}
                      onDelete={handleRefresh}
                    />
                  )}
                </div>
              )}

              {/* Configuration Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Switch Agent:
                </label>
                <Select value={selectedConfig} onValueChange={onConfigChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select agent configuration">
                      {selectedConfigData && (
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {selectedConfigData.icon}
                          </span>
                          <span>{selectedConfigData.agent_name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {/* Built-in Configurations */}
                    {builtInConfigs.length > 0 && (
                      <>
                        {builtInConfigs.map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span className="text-base">{config.icon}</span>
                              <span>{config.agent_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {customConfigs.length > 0 && (
                          <Separator className="my-1" />
                        )}
                      </>
                    )}

                    {/* Custom Configurations */}
                    {customConfigs.map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{config.icon}</span>
                          <span>{config.agent_name}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            Custom
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add New Custom Agent */}
              <div className="space-y-2">
                <PromptEditor
                  trigger={
                    <Button variant="outline" className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Custom Agent
                    </Button>
                  }
                  onSave={handleRefresh}
                />
              </div>

              {/* System Prompt Preview */}
              <div className="space-y-2">
                <Separator />
                <label className="text-sm font-medium text-gray-700">
                  Current System Prompt:
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border max-h-20 overflow-y-auto">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentSystemPrompt}
                  </p>
                </div>
              </div>
            </CardContent>

            <div className="p-4 pt-0">
              {/* Close Button */}
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full"
                variant="outline"
              >
                Close
              </Button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
