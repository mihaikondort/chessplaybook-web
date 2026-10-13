import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface GamePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function GamePagination({
  currentPage,
  totalPages,
  onPageChange,
}: GamePaginationProps) {
  if (totalPages <= 1) return null;

  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start: 1 2 3 4 ... last
        pages.push(2, 3, 4);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1 ... last-3 last-2 last-1 last
        pages.push('ellipsis');
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push('ellipsis');
        pages.push(currentPage - 1, currentPage, currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = generatePageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={`cursor-pointer border-2 border-primary/50 hover:border-primary text-link font-normal ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-disabled={currentPage === 1}
          />
        </PaginationItem>

        {pages.map((page, index) => (
          <PaginationItem key={`${page}-${index}`}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => onPageChange(page)}
                isActive={currentPage === page}
                className={`cursor-pointer border-2 ${
                  currentPage === page
                    ? 'border-primary bg-primary/10 text-link font-semibold'
                    : 'border-primary/50 hover:border-primary text-link font-normal'
                }`}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            className={`cursor-pointer border-2 border-primary/50 hover:border-primary text-link font-normal ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-disabled={currentPage === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
