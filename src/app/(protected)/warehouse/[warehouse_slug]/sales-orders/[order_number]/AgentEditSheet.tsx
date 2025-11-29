"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAgents } from "@/lib/query/hooks/partners";
import type { Tables } from "@/types/database/supabase";

type Partner = Tables<"partners">;

interface AgentEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentAgentId: string | null;
}

export function AgentEditSheet({
  open,
  onOpenChange,
  orderId,
  currentAgentId,
}: AgentEditSheetProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    currentAgentId,
  );
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  // Fetch agents using TanStack Query
  const { data: agents = [], isLoading: fetchingAgents } = useAgents();

  useEffect(() => {
    if (open) {
      setSelectedAgentId(currentAgentId);
    }
  }, [open, currentAgentId]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({ agent_id: selectedAgentId })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(selectedAgentId ? "Agent updated" : "Agent removed");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update agent",
      );
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agent: Partner) => {
    return agent.company_name || `${agent.first_name} ${agent.last_name}`;
  };

  const formContent = (
    <div className="flex flex-col gap-4 p-4 md:px-0">
      {fetchingAgents ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">Loading agents...</p>
        </div>
      ) : (
        <>
          <Select
            value={selectedAgentId || "none"}
            onValueChange={(value) =>
              setSelectedAgentId(value === "none" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No agent</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {getAgentName(agent)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAgentId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedAgentId(null)}
              className="w-full"
            >
              Clear agent
            </Button>
          )}
        </>
      )}
    </div>
  );

  const footerButtons = (
    <div className="flex gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="flex-1"
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        className="flex-1"
        disabled={loading || fetchingAgents}
      >
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Agent</DrawerTitle>
          </DrawerHeader>
          {formContent}
          <DrawerFooter>{footerButtons}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agent</DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
