"use client";

import { Client, ClientSearchResult } from "@/types/client";
import { getStatusLabel, formatCurrency, formatDate } from "@/utils/clientHelpers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User, CreditCard, Phone, Mail } from "lucide-react";

interface ClientCardProps {
	client: Client | ClientSearchResult;
	searchMode?: boolean;
	onClick?: () => void;
}

export function ClientCard({ client, searchMode = false, onClick }: ClientCardProps) {
	const matchedFields = "matchedFields" in client ? client.matchedFields : [];

	const isFieldMatched = (fieldName: string) => {
		return matchedFields.includes(fieldName);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "activa":
				return "bg-teal-50 text-teal-800 border border-teal-200";
			case "pendiente":
				return "bg-amber-50 text-amber-800 border border-amber-200";
			case "vencida":
				return "bg-rose-50 text-rose-800 border border-rose-200";
			case "cancelada":
				return "bg-slate-100 text-slate-600 border border-slate-200";
			case "renovada":
				return "bg-sky-50 text-sky-800 border border-sky-200";
			case "anulada":
				return "bg-red-50 text-red-800 border border-red-200";
			case "rechazada":
				return "bg-orange-50 text-orange-800 border border-orange-200";
			default:
				return "bg-slate-100 text-slate-600 border border-slate-200";
		}
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader
				className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
				onClick={onClick}
			>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<User className="h-5 w-5 text-muted-foreground" />
							<h3
								className={`text-lg font-semibold ${isFieldMatched("fullName") ? "bg-amber-50 text-amber-900" : ""}`}
							>
								{client.fullName}
							</h3>
						</div>
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div
								className={`flex items-center gap-1 ${
									isFieldMatched("idNumber") ? "bg-amber-50 text-amber-900" : ""
								}`}
							>
								<CreditCard className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">CI:</span>
								<span className="font-medium">{client.idNumber}</span>
							</div>
							{client.nit && (
								<div
									className={`flex items-center gap-1 ${
										isFieldMatched("nit") ? "bg-amber-50 text-amber-900" : ""
									}`}
								>
									<span className="text-muted-foreground">NIT:</span>
									<span className="font-medium">{client.nit}</span>
								</div>
							)}
						</div>
					</div>
					<Badge variant="outline" className="ml-2">
						{client.policies.length} {client.policies.length === 1 ? "póliza" : "pólizas"}
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

				{/* Policies Accordion */}
				<div className="pt-2" onClick={(e) => e.stopPropagation()}>
					<h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase">Pólizas</h4>
					<Accordion type="single" collapsible className="w-full">
						{client.policies.map((policy) => (
							<AccordionItem key={policy.id} value={policy.id}>
								<AccordionTrigger className="hover:no-underline py-2">
									<div className="flex items-center gap-2 w-full">
										<Badge className={getStatusColor(policy.status)}>
											{getStatusLabel(policy.status).label}
										</Badge>
										<span
											className={`font-medium ${
												isFieldMatched("policyNumber") && searchMode
													? "bg-amber-50 text-amber-900"
													: ""
											}`}
										>
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
												<span className="ml-2 font-medium">{formatDate(policy.startDate)}</span>
											</div>
											<div>
												<span className="text-muted-foreground">Vencimiento:</span>
												<span className="ml-2 font-medium">
													{formatDate(policy.expirationDate)}
												</span>
											</div>
										</div>
										<div>
											<span className="text-muted-foreground">Prima:</span>
											<span className="ml-2 font-medium">
												{formatCurrency(policy.premium, policy.currency)}
											</span>
										</div>
										{policy.beneficiaryName && (
											<div
												className={
													isFieldMatched("beneficiaryName") && searchMode
														? "bg-amber-50 text-amber-900"
														: ""
												}
											>
												<span className="text-muted-foreground">Beneficiario:</span>
												<span className="ml-2 font-medium">{policy.beneficiaryName}</span>
											</div>
										)}
										{policy.coverageDetails && (
											<div className="text-muted-foreground">{policy.coverageDetails}</div>
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
