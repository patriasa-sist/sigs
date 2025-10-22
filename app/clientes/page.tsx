'use client';

import { useState, useEffect } from 'react';
import { Client, ClientSearchResult } from '@/types/client';
import { generateMockClients, searchClients, getRecentClients } from '@/utils/mockClients';
import { SearchBar } from '@/components/clientes/SearchBar';
import { ClientList } from '@/components/clientes/ClientList';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export default function ClientesPage() {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [displayedClients, setDisplayedClients] = useState<Client[] | ClientSearchResult[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with mock data
  useEffect(() => {
    const mockClients = generateMockClients();
    setAllClients(mockClients);
    setDisplayedClients(getRecentClients(mockClients, 20));
    setIsLoading(false);
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      // Reset to showing last 20 clients
      setDisplayedClients(getRecentClients(allClients, 20));
      setIsSearchMode(false);
    } else {
      // Perform search
      const results = searchClients(allClients, query);
      setDisplayedClients(results);
      setIsSearchMode(true);
    }
  };

  const handleNewClient = () => {
    // TODO: Implement when add/edit workflow is ready
    alert('La funcionalidad de agregar cliente estará disponible próximamente.');
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

      {/* Search Bar */}
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Client List */}
      <div className="mb-8">
        {isSearchMode && displayedClients.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              Resultados de búsqueda - {displayedClients.length}{' '}
              {displayedClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
            </p>
          </div>
        )}
        <ClientList
          clients={displayedClients}
          searchMode={isSearchMode}
          emptyMessage={
            isSearchMode
              ? 'No se encontraron clientes que coincidan con tu búsqueda. Intenta con otros términos.'
              : 'No hay clientes registrados en el sistema.'
          }
        />
      </div>

      {/* Floating Add Client Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          onClick={handleNewClient}
          size="lg"
          className="h-14 px-8 text-base font-semibold bg-pink-400 hover:bg-pink-500 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          NUEVA POLIZA
        </Button>
      </div>
    </div>
  );
}
