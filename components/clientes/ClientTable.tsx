'use client';

import { Client, ClientSearchResult } from '@/types/client';
import { getActivePolicyCount } from '@/utils/mockClients';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

interface ClientTableProps {
  clients: Client[] | ClientSearchResult[];
  searchMode?: boolean;
  onClientClick?: (client: Client | ClientSearchResult) => void;
}

export function ClientTable({ clients, searchMode = false, onClientClick }: ClientTableProps) {
  const isFieldMatched = (client: Client | ClientSearchResult, fieldName: string) => {
    return searchMode && 'matchedFields' in client && client.matchedFields.includes(fieldName);
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
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
          No hay clientes que coincidan con tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Nombre</TableHead>
            <TableHead className="font-semibold">CI</TableHead>
            <TableHead className="font-semibold">NIT</TableHead>
            <TableHead className="font-semibold">Ejecutivo</TableHead>
            <TableHead className="font-semibold text-center">Pólizas Activas</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const activePolicyCount = getActivePolicyCount(client);

            return (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onClientClick?.(client)}
              >
                <TableCell className="font-medium">
                  <span className={isFieldMatched(client, 'fullName') ? 'bg-yellow-200 px-1 rounded' : ''}>
                    {client.fullName}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={isFieldMatched(client, 'idNumber') ? 'bg-yellow-200 px-1 rounded' : ''}>
                    {client.idNumber}
                  </span>
                </TableCell>
                <TableCell>
                  {client.nit ? (
                    <span className={isFieldMatched(client, 'nit') ? 'bg-yellow-200 px-1 rounded' : ''}>
                      {client.nit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {client.executiveInCharge || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={activePolicyCount > 0 ? 'default' : 'secondary'}
                    className={activePolicyCount > 0 ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {activePolicyCount}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
