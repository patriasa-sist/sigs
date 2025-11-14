'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Client, ClientSearchResult } from '@/types/client';
import { generateMockClients, searchClients } from '@/utils/mockClients';
import { SearchBar } from '@/components/clientes/SearchBar';
import { ClientList } from '@/components/clientes/ClientList';
import { ClientTable } from '@/components/clientes/ClientTable';
import { ClientCard } from '@/components/clientes/ClientCard';
import { ViewToggle, ViewMode } from '@/components/clientes/ViewToggle';
import { Pagination } from '@/components/clientes/Pagination';
import { Button } from '@/components/ui/button';
import { UserPlus, X } from 'lucide-react';

export default function ClientesPage() {
  const router = useRouter();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[] | ClientSearchResult[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedClient, setSelectedClient] = useState<Client | ClientSearchResult | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Initialize with mock data
  useEffect(() => {
    const mockClients = generateMockClients();
    setAllClients(mockClients);
    // Sort by most recent (already sorted in mock data, but being explicit)
    setFilteredClients(mockClients);
    setIsLoading(false);
  }, []);

  // Calculate paginated clients
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage, pageSize]);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      // Reset to showing all clients (sorted by most recent)
      setFilteredClients(allClients);
      setIsSearchMode(false);
    } else {
      // Perform search
      const results = searchClients(allClients, query);
      setFilteredClients(results);
      setIsSearchMode(true);
    }
    // Reset to page 1 when search changes
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleNewClient = () => {
    router.push('/clientes/nuevo');
  };

  const handleClientClick = (client: Client | ClientSearchResult) => {
    setSelectedClient(client);
  };

  const handleCloseDetail = () => {
    setSelectedClient(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 relative min-h-screen pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">VENTANA CLIENTES</h1>
        <p className="text-muted-foreground">
          Gestiona y busca información de clientes y sus pólizas
        </p>
      </div>

      {/* Search Bar and View Toggle */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full">
          <SearchBar onSearch={handleSearch} />
        </div>
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Results Info */}
      {isSearchMode && filteredClients.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            Resultados de búsqueda - {filteredClients.length}{' '}
            {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </p>
        </div>
      )}

      {/* Client Display - Table or Cards */}
      <div className="mb-8">
        {viewMode === 'table' ? (
          <ClientTable
            clients={paginatedClients}
            searchMode={isSearchMode}
            onClientClick={handleClientClick}
          />
        ) : (
          <ClientList
            clients={paginatedClients}
            searchMode={isSearchMode}
            emptyMessage={
              isSearchMode
                ? 'No se encontraron clientes que coincidan con tu búsqueda. Intenta con otros términos.'
                : 'No hay clientes registrados en el sistema.'
            }
          />
        )}

        {/* Pagination */}
        {filteredClients.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredClients.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Selected Client Detail (shown when clicking a table row) */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Detalles del Cliente</h2>
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
              <ClientCard client={selectedClient} searchMode={isSearchMode} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Client Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          onClick={handleNewClient}
          size="lg"
          className="h-14 px-8 text-base font-semibold bg-pink-400 hover:bg-pink-500 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          NUEVO CLIENTE
        </Button>
      </div>
    </div>
  );
}
