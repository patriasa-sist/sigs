import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
	return (
		<div className="flex-1 w-full">
			<Card>
				<CardHeader>
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-96 mt-2" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
