'use client'

import {
	AlertTriangleIcon,
	BellRingIcon,
	CheckIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	LogInIcon,
	LogOutIcon,
	PiggyBankIcon,
	TrashIcon,
	SettingsIcon,
	ShieldIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { enUS } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Switch,
	Spinner,
} from '@/components/ui'
import { cn } from '@/lib'
import { useTRPC } from '@/trpc/client'
import { TNotification } from '@/modules/notifications/schema'
import { INFINITE_SCROLL_LIMIT } from '@/constants/infinite-scroll'
import { ErrorState, InfiniteScroll, LoadingState } from '@/components/shared'

const getNotificationIcon = (type: TNotification['type']) => {
	switch (type) {
		case 'LOGIN':
			return <LogInIcon className='text-green-500' />
		case 'LOGOUT':
			return <LogOutIcon className='text-orange-500' />
		case 'PRICE_ALERT':
			return <PiggyBankIcon className='text-blue-500' />
		case 'SECURITY':
			return <ShieldIcon className='text-red-500' />
		case 'SYSTEM':
			return <SettingsIcon className='text-gray-500' />
		case 'COIN_NEWS':
			return <AlertTriangleIcon className='text-purple-500' />
		default:
			return <BellRingIcon />
	}
}

const formatNotificationMessage = (notification: TNotification) => {
	if (notification.type === 'LOGIN' && notification.ipAddress && notification.browser) {
		return (
			<div className='mt-1 flex flex-col gap-1'>
				<p className='text-xs text-muted-foreground'>{notification.message.split('\n')[0]}</p>

				<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
					{notification.ipAddress && (
						<span className='flex items-center gap-1'>🌐 {notification.ipAddress}</span>
					)}

					{notification.location && (
						<span className='flex items-center gap-1'>📍 {notification.location}</span>
					)}

					{notification.browser && <span className='flex items-center gap-1'>🖥️ {notification.browser}</span>}

					{notification.os && <span className='flex items-center gap-1'>⚙️ {notification.os}</span>}
				</div>
			</div>
		)
	}

	return <p className='mt-1 text-xs text-muted-foreground'>{notification.message}</p>
}

export const NotificationsView = () => {
	const trpc = useTRPC()
	const router = useRouter()
	const queryClient = useQueryClient()
	const setDoNotDisturbMutation = useMutation(trpc.user.setDoNotDisturb.mutationOptions())

	const queryOptions = trpc.notifications.getNotifications.infiniteQueryOptions(
		{ limit: INFINITE_SCROLL_LIMIT },
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		},
	)

	const { data: doNotDisturb } = useQuery(trpc.user.getDoNotDisturb.queryOptions())
	const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isPending } = useInfiniteQuery(queryOptions)

	// Narrow the inferred type to avoid excessively deep generic instantiation
	type NotificationsInfinitePage = { items: TNotification[]; nextCursor?: string | null }
	const pages = (data?.pages ?? []) as unknown as NotificationsInfinitePage[]
	const notifications = pages.flatMap((page) => page.items)

	const { mutate: markAsRead, isPending: isMarkingAsRead } = useMutation(
		trpc.notifications.markAsRead.mutationOptions({
			onSuccess: () => {
				// Invalidate both the notifications list and unread count
				queryClient.invalidateQueries({
					queryKey: trpc.notifications.getNotifications.infiniteQueryKey({ limit: INFINITE_SCROLL_LIMIT }),
				})
				queryClient.invalidateQueries({
					queryKey: trpc.notifications.getUnreadPriceNotifications.queryKey(),
				})
			},
		}),
	)

	const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } = useMutation(
		trpc.notifications.markAllAsRead.mutationOptions({
			onSuccess: () => {
				// Invalidate both the notifications list and unread count
				queryClient.invalidateQueries({
					queryKey: trpc.notifications.getNotifications.infiniteQueryKey({ limit: INFINITE_SCROLL_LIMIT }),
				})
				queryClient.invalidateQueries({
					queryKey: trpc.notifications.getUnreadPriceNotifications.queryKey(),
				})

				toast.success('All notifications marked as read')
			},
		}),
	)

	const { mutate: deleteNotification, isPending: isDeleting } = useMutation(
		trpc.notifications.deleteNotification.mutationOptions({
			onSuccess: () => {
				// Optimistic cache update
				queryClient.invalidateQueries({
					queryKey: trpc.notifications.getNotifications.infiniteQueryKey({ limit: INFINITE_SCROLL_LIMIT }),
				})

				toast.success('Notification deleted')
			},
		}),
	)

	const { mutate: deleteExpiredNotifications } = useMutation(
		trpc.notifications.deleteExpiredNotifications.mutationOptions(),
	)

	const handleDoNotDisturbToggle = async (checked: boolean) => {
		queryClient.setQueryData(trpc.user.getDoNotDisturb.queryKey(), checked)

		try {
			await setDoNotDisturbMutation.mutateAsync({ enabled: checked })

			await queryClient.invalidateQueries({
				queryKey: trpc.notifications.getUnreadPriceNotifications.queryKey(),
			})

			toast.success(`Do not disturb ${checked ? 'enabled' : 'disabled'}`)
		} catch (error) {
			queryClient.setQueryData(trpc.user.getDoNotDisturb.queryKey(), !checked)

			toast.error(error instanceof Error ? error.message : 'Failed to update')
		}
	}

	useEffect(() => {
		deleteExpiredNotifications()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<div className='container mx-auto max-w-2xl'>
			<Card className='gap-0 overflow-hidden py-0'>
				<CardHeader className='flex flex-row items-center justify-between border-b py-6'>
					<div className='flex items-start gap-2 sm:flex-col'>
						<div className='flex items-center gap-2'>
							<BellRingIcon className='size-5 text-primary' />

							<CardTitle className='hidden text-xl font-semibold sm:block'>Notifications</CardTitle>
						</div>

						{notifications.length > 0 && (
							<Badge variant='secondary'>{notifications.filter((n) => !n.isRead).length} unread</Badge>
						)}
					</div>

					<div className='flex items-center gap-3'>
						<label
							htmlFor='dnd'
							className='cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
						>
							Do not disturb
						</label>

						<Switch
							id='dnd'
							aria-label='Do not disturb'
							disabled={setDoNotDisturbMutation.isPending || notifications.length === 0}
							checked={doNotDisturb}
							onCheckedChange={handleDoNotDisturbToggle}
							className='cursor-pointer'
						/>
					</div>
				</CardHeader>

				<CardContent className='p-0'>
					<div className='divide-y'>
						{notifications.map((notification, i) => (
							<div
								key={`${notification.id}-${i}`}
								className='relative cursor-pointer p-4 transition-colors duration-300 ease-in-out hover:bg-muted/50'
							>
								<div className='flex items-start'>
									{!notification.isRead && <span className='absolute top-0 bottom-0 left-0 w-1 bg-primary' />}

									<div className='mr-3 text-xl'>{getNotificationIcon(notification.type)}</div>

									<div className='flex-1'>
										<div className='flex items-center justify-between'>
											<p
												className={cn(
													'text-sm',
													notification.isRead ? 'text-muted-foreground' : 'font-medium',
												)}
											>
												{notification.title}
											</p>
										</div>

										{formatNotificationMessage(notification)}

										<p className='mt-1 text-xs text-muted-foreground'>
											{formatDistanceToNow(new Date(notification.createdAt), {
												addSuffix: true,
												locale: enUS,
											})}
										</p>
									</div>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant='ghost' size='icon-lg' className='group mt-0! shrink-0 rounded-xl'>
												<div className='relative size-5 transition-transform duration-300 ease-in-out group-hover:rotate-180'>
													<EllipsisVerticalIcon className='absolute inset-0 m-auto' />
												</div>

												<span className='sr-only'>More</span>
											</Button>
										</DropdownMenuTrigger>

										<DropdownMenuContent side='right' align='start' sideOffset={0} className='rounded-xl'>
											{!notification.isRead && (
												<DropdownMenuItem
													onClick={() => markAsRead(notification.id)}
													className='cursor-pointer rounded-xl p-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden'
												>
													<Button
														variant='ghost'
														size='icon-lg'
														disabled={isMarkingAsRead}
														className='mx-2 flex items-center justify-start gap-3'
													>
														<CheckIcon />

														<span>Mark read</span>
													</Button>
												</DropdownMenuItem>
											)}

											{notification.type === 'PRICE_ALERT' && (
												<DropdownMenuItem
													onSelect={() => router.push(`/coins/${notification.coinId}`)}
													className='cursor-pointer rounded-xl p-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden'
												>
													<Button
														variant='ghost'
														size='icon-lg'
														className='mx-2 flex items-center justify-start gap-3'
													>
														<EyeIcon />

														<span>View</span>
													</Button>
												</DropdownMenuItem>
											)}

											<DropdownMenuItem
												onClick={() => deleteNotification(notification.id)}
												className='cursor-pointer rounded-xl p-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden'
											>
												<Button
													variant='ghost'
													size='icon-lg'
													disabled={isDeleting}
													className='mx-2 flex items-center justify-start gap-3'
												>
													<TrashIcon />

													<span>Delete</span>
												</Button>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						))}

						{isPending && (
							<div className='flex items-center justify-center p-10'>
								<Spinner className='size-6' />
							</div>
						)}

						{!isPending && notifications.length === 0 && (
							<div className='p-4 text-center text-sm text-muted-foreground'>No notifications yet</div>
						)}
					</div>
				</CardContent>

				{notifications.length > 0 && (
					<CardFooter className='justify-between border-t bg-muted/20 p-4'>
						<InfiniteScroll
							isManual
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							fetchNextPage={fetchNextPage}
						/>

						<Button
							variant='ghost'
							onClick={() => markAllAsRead()}
							disabled={isMarkingAllAsRead}
							className='group flex items-center gap-2 text-primary hover:bg-transparent hover:underline'
						>
							{isMarkingAllAsRead ? (
								<Spinner />
							) : (
								<CheckIcon className='transition-transform duration-300 ease-in-out group-hover:scale-110' />
							)}
							{isMarkingAllAsRead ? 'Marking all as read' : 'Mark all as read'}
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	)
}

export const NotificationsViewLoading = () => {
	return <LoadingState title='Loading notifications' description='This may take a few seconds' />
}

export const NotificationsViewError = () => {
	return <ErrorState title='Failed to load notifications' description='Please try again later' />
}
