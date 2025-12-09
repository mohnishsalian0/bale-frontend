import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface PaginationWrapperProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Reusable pagination component for list pages
 * Shows smart ellipsis and up to 5 page numbers at a time
 */
export function PaginationWrapper({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationWrapperProps) {
  // Don't show pagination if only 1 page
  if (totalPages <= 1) return null;

  // Wrapper function to scroll to top and then change page
  const handlePageChange = (page: number) => {
    onPageChange(page);

    // setTimeout(() => {
    const mainContent = document.getElementById("main-content");

    if (mainContent) {
      // Scroll the main content container (used in protected layout)
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Fallback to window scroll for pages without the container
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // }, 300);
  };

  return (
    <div className="flex justify-center p-4 border-t border-gray-200 shrink-0 overflow-x-auto scrollbar-hide">
      <Pagination>
        <PaginationContent>
          {/* Previous Button */}
          <PaginationItem>
            <PaginationPrevious
              onClick={() =>
                currentPage > 1 && handlePageChange(currentPage - 1)
              }
              className={
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {/* First page */}
          {currentPage > 2 && (
            <PaginationItem>
              <PaginationLink
                onClick={() => handlePageChange(1)}
                className="cursor-pointer"
              >
                1
              </PaginationLink>
            </PaginationItem>
          )}

          {/* Ellipsis before current */}
          {currentPage > 3 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {/* Previous page */}
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationLink
                onClick={() => handlePageChange(currentPage - 1)}
                className="cursor-pointer"
              >
                {currentPage - 1}
              </PaginationLink>
            </PaginationItem>
          )}

          {/* Current page */}
          <PaginationItem>
            <PaginationLink isActive className="cursor-default">
              {currentPage}
            </PaginationLink>
          </PaginationItem>

          {/* Next page */}
          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationLink
                onClick={() => handlePageChange(currentPage + 1)}
                className="cursor-pointer"
              >
                {currentPage + 1}
              </PaginationLink>
            </PaginationItem>
          )}

          {/* Ellipsis after current */}
          {currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {/* Last page */}
          {currentPage < totalPages - 1 && (
            <PaginationItem>
              <PaginationLink
                onClick={() => handlePageChange(totalPages)}
                className="cursor-pointer"
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}

          {/* Next Button */}
          <PaginationItem>
            <PaginationNext
              onClick={() =>
                currentPage < totalPages && handlePageChange(currentPage + 1)
              }
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
