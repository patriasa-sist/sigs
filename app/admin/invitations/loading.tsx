import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvitationsLoading() {
	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-10 w-32" />
				<div className="flex-1">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64 mt-2" />
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>

			<Skeleton className="h-24 w-full" />

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48 mt-2" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
