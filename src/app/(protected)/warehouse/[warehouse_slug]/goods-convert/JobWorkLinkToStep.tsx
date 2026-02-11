"use client";

import { useState, useMemo } from "react";
import { IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface JobWorkLinkToStepProps {
  selectedJobWorkId: string | null;
  onSelectJobWork: (jobWorkId: string, outputProductId: string) => void;
}

// Dummy job work data for MVP
const dummyJobWorks = [
  {
    id: "dummy-jw-1",
    sequence_number: 1,
    job_type: "Dyeing",
    vendor_name: "ABC Dyeing House",
    output_product: { id: "prod-dye-1", name: "Red Cotton Roll" },
    status: "in_progress" as const,
  },
  {
    id: "dummy-jw-2",
    sequence_number: 2,
    job_type: "Embroidery",
    vendor_name: "XYZ Embroidery Works",
    output_product: { id: "prod-emb-1", name: "Embroidered Silk Fabric" },
    status: "in_progress" as const,
  },
  {
    id: "dummy-jw-3",
    sequence_number: 3,
    job_type: "Printing",
    vendor_name: "Print Masters Ltd",
    output_product: { id: "prod-print-1", name: "Printed Cotton Fabric" },
    status: "in_progress" as const,
  },
  {
    id: "dummy-jw-4",
    sequence_number: 4,
    job_type: "Dyeing",
    vendor_name: "Royal Dye Works",
    output_product: { id: "prod-dye-2", name: "Blue Polyester Fabric" },
    status: "in_progress" as const,
  },
];

export function JobWorkLinkToStep({
  selectedJobWorkId,
  onSelectJobWork,
}: JobWorkLinkToStepProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter job works based on search query
  const filteredJobWorks = useMemo(() => {
    if (!searchQuery.trim()) return dummyJobWorks;

    const query = searchQuery.toLowerCase();
    return dummyJobWorks.filter(
      (jw) =>
        jw.job_type.toLowerCase().includes(query) ||
        jw.vendor_name.toLowerCase().includes(query) ||
        jw.output_product.name.toLowerCase().includes(query) ||
        `jw-${jw.sequence_number}`.includes(query),
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Link to job work (optional)
        </h3>
        <p className="text-sm text-gray-500">
          Select a job work to auto-fill output product
        </p>
      </div>

      {/* Search bar */}
      <div className="p-4 border-b border-border shrink-0">
        <Input
          placeholder="Search by job work number, type, or vendor"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Job Work List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {filteredJobWorks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "No job works found matching your search"
                : "No active job works found"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredJobWorks.map((jobWork) => {
              const isSelected = jobWork.id === selectedJobWorkId;

              return (
                <button
                  key={jobWork.id}
                  onClick={() =>
                    onSelectJobWork(jobWork.id, jobWork.output_product.id)
                  }
                  className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    {/* Job Work Number and Type */}
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium text-gray-700">
                        JW-{jobWork.sequence_number}
                      </p>
                      <Badge variant="default" className="text-xs">
                        {jobWork.job_type}
                      </Badge>
                    </div>

                    {/* Vendor and Output Product */}
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {jobWork.vendor_name} • {jobWork.output_product.name}
                    </p>
                  </div>

                  {/* Selection Checkmark */}
                  {isSelected && (
                    <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                      <IconCheck className="size-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
