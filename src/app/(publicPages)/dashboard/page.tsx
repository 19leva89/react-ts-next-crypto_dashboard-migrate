import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'

import { constructMetadata } from '@/lib'
import { getQueryClient, trpc } from '@/trpc/server'
import {
	DashboardView,
	DashboardViewError,
	DashboardViewLoading,
} from '@/modules/dashboard/ui/views/dashboard-view'

export const metadata = constructMetadata({ title: 'Dashboard' })

const DashboardPage = async () => {
	const queryClient = getQueryClient()

	void queryClient.prefetchQuery(trpc.dashboard.getTrending.queryOptions())
	void queryClient.prefetchQuery(trpc.dashboard.getCategories.queryOptions())
	void queryClient.prefetchQuery(trpc.dashboard.getCoinsList.queryOptions())

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DashboardViewLoading />}>
				<ErrorBoundary fallback={<DashboardViewError />}>
					<DashboardView />
				</ErrorBoundary>
			</Suspense>
		</HydrationBoundary>
	)
}

export default DashboardPage
