import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ReportCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Skeleton className="h-8 w-8 rounded-md" />
					<div className="space-y-1.5">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-3.5 w-72" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-5">
				<div>
					<Skeleton className="h-3 w-12 mb-3" />
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="space-y-1.5">
								<Skeleton className="h-3.5 w-16" />
								<Skeleton className="h-9 w-full" />
							</div>
						))}
					</div>
				</div>
			</CardContent>
			<CardFooter className="justify-end border-t pt-4">
				<Skeleton className="h-9 w-32" />
			</CardFooter>
		</Card>
	);
}

export default function ReportesLoading() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			<div className="mb-8">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-72 mt-2" />
			</div>
			<div className="space-y-6">
				<ReportCardSkeleton />
				<ReportCardSkeleton />
				<ReportCardSkeleton />
			</div>
		</div>
	);
}
