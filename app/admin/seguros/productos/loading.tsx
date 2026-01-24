import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductosLoading() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Skeleton className="h-16 w-full rounded-lg" />

      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44 mb-2" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters skeleton */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-6 w-36" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-10 w-52" />
                <Skeleton className="h-10 w-52" />
              </div>
            </div>

            {/* Table skeleton */}
            <div className="rounded-md border">
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-32 hidden lg:block" />
                    <Skeleton className="h-5 w-24 hidden md:block" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
