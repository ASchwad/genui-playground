import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  saveCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  CustomAgentConfig,
  AVAILABLE_ICONS,
} from "../config/agent-config";

interface PromptEditorProps {
  trigger: React.ReactNode;
  existingPrompt?: CustomAgentConfig;
  onSave: () => void;
  onDelete?: () => void;
}

export function PromptEditor({
  trigger,
  existingPrompt,
  onSave,
  onDelete,
}: PromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🤖");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!existingPrompt;

  useEffect(() => {
    if (existingPrompt) {
      setAgentName(existingPrompt.agent_name);
      setSystemPrompt(existingPrompt.system_prompt);
      setSelectedIcon(existingPrompt.icon);
    } else {
      setAgentName("");
      setSystemPrompt("");
      setSelectedIcon("🤖");
    }
    setError("");
  }, [existingPrompt, open]);

  const handleSave = async () => {
    if (!agentName.trim() || !systemPrompt.trim()) {
      setError("Agent name and system prompt are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEditing && existingPrompt) {
        updateCustomPrompt(existingPrompt.id, {
          agent_name: agentName.trim(),
          system_prompt: systemPrompt.trim(),
          icon: selectedIcon,
        });
      } else {
        saveCustomPrompt({
          agent_name: agentName.trim(),
          system_prompt: systemPrompt.trim(),
          icon: selectedIcon,
          isCustom: true,
        });
      }

      onSave();
      setOpen(false);

      // Reset form if creating new
      if (!isEditing) {
        setAgentName("");
        setSystemPrompt("");
        setSelectedIcon("🤖");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingPrompt || !onDelete) return;

    setLoading(true);
    setError("");

    try {
      deleteCustomPrompt(existingPrompt.id);
      onDelete();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete prompt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Agent Configuration
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create Agent Configuration
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify your custom agent configuration."
              : "Create a new custom agent with your own system prompt and personality."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              placeholder="e.g., CustomBot, MyAssistant"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label>Agent Icon</Label>
            <div className="grid grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg border max-h-32 overflow-y-auto">
              {AVAILABLE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-2 text-lg rounded-md hover:bg-gray-200 transition-colors ${
                    selectedIcon === icon
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "bg-white border border-gray-200"
                  }`}
                  disabled={loading}
                >
                  {icon}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Selected: {selectedIcon} (Click to choose a different icon)
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              placeholder="Enter your custom system prompt here..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              disabled={loading}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This prompt will define how your agent behaves and responds.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
