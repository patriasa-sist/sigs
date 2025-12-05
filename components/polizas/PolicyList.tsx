import { Policy, PolicySearchResult } from '@/types/policy';
import { PolicyCard } from './PolicyCard';
import { FileX } from 'lucide-react';

interface PolicyListProps {
  policies: (Policy | PolicySearchResult)[];
  onPolicyClick?: (policy: Policy | PolicySearchResult) => void;
}

export function PolicyList({ policies, onPolicyClick }: PolicyListProps) {
  if (policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <FileX className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No se encontraron pólizas
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          No hay pólizas que coincidan con tu búsqueda. Intenta con otros términos o
          limpia los filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {policies.map((policy) => (
        <PolicyCard
          key={policy.id}
          policy={policy}
          onClick={() => onPolicyClick?.(policy)}
        />
      ))}
    </div>
  );
}
