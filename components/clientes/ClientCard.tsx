'use client';

import { Client, ClientSearchResult } from '@/types/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { User, Car, CreditCard, Phone, Mail, MapPin } from 'lucide-react';

interface ClientCardProps {
  client: Client | ClientSearchResult;
  searchMode?: boolean;
}

export function ClientCard({ client, searchMode = false }: ClientCardProps) {
  const matchedFields = 'matchedFields' in client ? client.matchedFields : [];

  const isFieldMatched = (fieldName: string) => {
    return matchedFields.includes(fieldName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vigente':
        return 'bg-green-500 text-white';
      case 'vencida':
        return 'bg-red-500 text-white';
      case 'cancelada':
        return 'bg-gray-500 text-white';
      case 'pendiente':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className={`text-lg font-semibold ${isFieldMatched('fullName') ? 'bg-yellow-200' : ''}`}>
                {client.fullName}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={`flex items-center gap-1 ${isFieldMatched('idNumber') ? 'bg-yellow-200' : ''}`}>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CI:</span>
                <span className="font-medium">{client.idNumber}</span>
              </div>
              {client.nit && (
                <div className={`flex items-center gap-1 ${isFieldMatched('nit') ? 'bg-yellow-200' : ''}`}>
                  <span className="text-muted-foreground">NIT:</span>
                  <span className="font-medium">{client.nit}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="ml-2">
            {client.policies.length} {client.policies.length === 1 ? 'póliza' : 'pólizas'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pb-3 border-b">
          {client.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{client.phone}</span>
            </div>
          )}
        </div>

        {/* Vehicle Information */}
        {client.carMatricula && (
          <div className={`flex items-center gap-2 p-2 bg-muted rounded-md ${isFieldMatched('carMatricula') ? 'bg-yellow-200' : ''}`}>
            <Car className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2 text-sm">
              <span className="font-semibold">{client.carMatricula}</span>
              {client.carBrand && client.carModel && (
                <span className="text-muted-foreground">
                  {client.carBrand} {client.carModel} {client.carYear ? `(${client.carYear})` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Policies Accordion */}
        <div className="pt-2">
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase">Pólizas</h4>
          <Accordion type="single" collapsible className="w-full">
            {client.policies.map((policy, index) => (
              <AccordionItem key={policy.id} value={policy.id}>
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 w-full">
                    <Badge className={getStatusColor(policy.status)}>
                      {policy.status.toUpperCase()}
                    </Badge>
                    <span className={`font-medium ${isFieldMatched('policyNumber') && searchMode ? 'bg-yellow-200' : ''}`}>
                      {policy.policyNumber}
                    </span>
                    <span className="text-sm text-muted-foreground ml-auto mr-2">
                      {policy.insuranceType}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="pl-4 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Inicio:</span>
                        <span className="ml-2 font-medium">
                          {new Date(policy.startDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vencimiento:</span>
                        <span className="ml-2 font-medium">
                          {new Date(policy.expirationDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prima:</span>
                      <span className="ml-2 font-medium">
                        Bs. {policy.premium.toLocaleString('es-ES')}
                      </span>
                    </div>
                    {policy.beneficiaryName && (
                      <div className={isFieldMatched('beneficiaryName') && searchMode ? 'bg-yellow-200' : ''}>
                        <span className="text-muted-foreground">Beneficiario:</span>
                        <span className="ml-2 font-medium">{policy.beneficiaryName}</span>
                      </div>
                    )}
                    {policy.coverageDetails && (
                      <div className="text-muted-foreground">
                        {policy.coverageDetails}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
