'use client';

import { Client, ClientSearchResult } from '@/types/client';
import { ClientCard } from './ClientCard';

interface ClientListProps {
  clients: Client[] | ClientSearchResult[];
  searchMode?: boolean;
  emptyMessage?: string;
}

export function ClientList({ clients, searchMode = false, emptyMessage }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
        <p className="text-muted-foreground max-w-sm">
          {emptyMessage || 'No hay clientes que coincidan con tu búsqueda.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Mostrando {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} searchMode={searchMode} />
        ))}
      </div>
    </div>
  );
}
