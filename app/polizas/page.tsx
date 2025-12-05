'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Policy, PolicySearchResult } from '@/types/policy';
import { generateMockPolicies, searchPolicies } from '@/utils/mockPolicies';
import { SearchBar } from '@/components/clientes/SearchBar';
import { ViewToggle, ViewMode } from '@/components/clientes/ViewToggle';
import { Pagination } from '@/components/polizas/Pagination';
import { PolicyTable } from '@/components/polizas/PolicyTable';
import { PolicyList } from '@/components/polizas/PolicyList';
import { PolicyCard } from '@/components/polizas/PolicyCard';
import { Button } from '@/components/ui/button';
import { FileText, Plus, X } from 'lucide-react';

export default function PolizasPage() {
  const router = useRouter();

  // State management
  const [allPolicies, setAllPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<(Policy | PolicySearchResult)[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | PolicySearchResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Load mock data on mount
  useEffect(() => {
    const mockData = generateMockPolicies(30);
    setAllPolicies(mockData);
    setFilteredPolicies(mockData);
    setIsLoading(false);
  }, []);

  // Handle search
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      // Reset to all policies
      setFilteredPolicies(allPolicies);
      setIsSearchMode(false);
      setCurrentPage(1);
      return;
    }

    const results = searchPolicies(allPolicies, query);
    setFilteredPolicies(results);
    setIsSearchMode(true);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Handle new policy button
  const handleNewPolicy = () => {
    router.push('/polizas/nueva');
  };

  // Handle policy click
  const handlePolicyClick = (policy: Policy | PolicySearchResult) => {
    setSelectedPolicy(policy);
  };

  // Handle close detail modal
  const handleCloseDetail = () => {
    setSelectedPolicy(null);
  };

  // Calculate pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Cargando pólizas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-gray-900">Pólizas</h1>
        </div>
        <p className="text-gray-600 ml-11">
          Gestión de pólizas de seguros y seguimiento de pagos
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Buscar por Nº póliza, cliente, CI o producto..."
        />
      </div>

      {/* View Toggle and Results Count */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <ViewToggle currentView={viewMode} onViewChange={handleViewModeChange} />
          <div className="text-sm text-gray-600">
            {isSearchMode ? (
              <span>
                <span className="font-semibold text-primary">
                  {filteredPolicies.length}
                </span>{' '}
                {filteredPolicies.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
              </span>
            ) : (
              <span>
                <span className="font-semibold">{allPolicies.length}</span> pólizas totales
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Policy Table/List */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        {viewMode === 'table' ? (
          <PolicyTable policies={paginatedPolicies} onPolicyClick={handlePolicyClick} />
        ) : (
          <div className="p-6">
            <PolicyList policies={paginatedPolicies} onPolicyClick={handlePolicyClick} />
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredPolicies.length}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Selected Policy Detail Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Detalles de la Póliza</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseDetail}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <PolicyCard policy={selectedPolicy} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - New Policy */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={handleNewPolicy}
          size="lg"
          className="h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="mr-2 h-5 w-5" />
          NUEVA PÓLIZA
        </Button>
      </div>
    </div>
  );
}
