import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InviteLoading() {
	return (
		<div className="flex justify-center items-center min-h-[400px]">
			<Card className="w-full max-w-md">
				<CardHeader>
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64 mt-2" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}
