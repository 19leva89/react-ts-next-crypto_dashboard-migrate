'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui'
import { cn } from '@/lib'
import { TUserCoinData } from '@/modules/coins/schema'
import { useFormatValue } from '@/hooks/use-format-value'
import { useFormatUSDPrice } from '@/hooks/use-format-usd-price'
import { EditCoin } from '@/modules/coins/ui/components/edit-coin'
import { DeleteCoin } from '@/modules/coins/ui/components/delete-coin'

interface Props {
	coin: TUserCoinData
	viewMode: 'list' | 'grid'
}

export const CoinCard = ({ coin, viewMode }: Props) => {
	const formatValue = useFormatValue()
	const formatUSDPrice = useFormatUSDPrice()

	const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)

	const totalValue = coin.current_price * coin.total_quantity
	const changePercentagePrice = ((coin.current_price - coin.average_price) / coin.average_price) * 100

	return (
		<Card
			className={cn(
				'flex flex-col gap-1 py-1 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-gray-300 hover:shadow-lg dark:hover:border-gray-600',
				viewMode === 'grid'
					? 'min-h-[10rem] min-w-[19rem] shrink-0 grow sm:basis-[calc(50%-1rem)] md:basis-[calc(40%-1rem)] lg:basis-[calc(33%-1rem)] xl:basis-[calc(25%-1rem)] 2xl:basis-[calc(20%-1rem)]'
					: 'w-full gap-0',
			)}
		>
			<CardHeader className='flex flex-row items-start justify-between px-3 py-1 pb-0'>
				<div
					className={cn(
						'flex gap-1',
						viewMode === 'grid' ? 'flex-col' : 'flex-row flex-wrap items-center gap-4 sm:flex-nowrap',
					)}
				>
					<CardTitle className='flex items-center gap-2'>
						<Image
							src={coin.image || '/svg/coin-not-found.svg'}
							alt={coin.name || 'Coin image'}
							width={24}
							height={24}
							onError={(e) => (e.currentTarget.src = '/svg/coin-not-found.svg')}
							className='rounded-full'
						/>

						<Link
							href={`/coins/${coin.coinId}`}
							className='max-w-32 cursor-pointer truncate hover:text-[#397fee] dark:hover:text-[#75a6f4]'
						>
							{coin.name}
						</Link>

						<span className='hidden text-sm text-muted-foreground sm:inline'>
							({coin.symbol.toUpperCase()})
						</span>
					</CardTitle>

					<CardDescription className='flex items-center gap-2'>
						<div className={cn('flex', viewMode === 'grid' ? 'flex-col' : 'hidden flex-row gap-4 lg:flex')}>
							<span>Buy: {formatUSDPrice(coin.average_price)}</span>

							<span>Curr: {formatUSDPrice(coin.current_price)}</span>

							{coin.desired_sell_price ? <span>Sell: {formatUSDPrice(coin.desired_sell_price)}</span> : null}
						</div>

						<div
							className={cn(
								'flex h-8 items-center gap-2 rounded-full px-2 py-1 font-medium',
								coin.current_price > coin.average_price
									? 'bg-green-100 text-green-600 dark:bg-green-900/30'
									: 'bg-red-100 text-red-600 dark:bg-red-900/30',
							)}
						>
							<span>
								{changePercentagePrice > 0 && '+'}
								{changePercentagePrice.toFixed(1)}%
							</span>

							{changePercentagePrice > 0 ? (
								<TrendingUpIcon className='size-4! text-green-600' />
							) : (
								<TrendingDownIcon className='size-4! text-red-600' />
							)}
						</div>
					</CardDescription>
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
						<DropdownMenuItem
							onSelect={() => setIsDialogOpen(true)}
							className='cursor-pointer rounded-xl p-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden'
						>
							<Button variant='ghost' size='icon-lg' className='mx-2 flex items-center justify-start gap-3'>
								<PencilIcon />

								<span>Edit</span>
							</Button>
						</DropdownMenuItem>

						<DropdownMenuItem
							onSelect={() => setIsDeleteDialogOpen(true)}
							className='cursor-pointer rounded-xl p-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden'
						>
							<Button variant='ghost' size='icon-lg' className='mx-2 flex items-center justify-start gap-3'>
								<TrashIcon />

								<span>Delete</span>
							</Button>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardHeader>

			<CardContent
				className={cn(
					'flex flex-col items-start gap-0 px-3 py-1 pt-0',
					viewMode === 'list' && 'sm:flex-row sm:gap-4',
				)}
			>
				<p className='text-lg font-semibold'>Quantity: {formatValue(coin.total_quantity)}</p>

				<p className='text-lg font-semibold'>Total value: {formatUSDPrice(totalValue, false)}</p>
			</CardContent>

			{/* Edit Dialog */}
			<EditCoin coin={coin} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />

			{/* Delete Dialog */}
			<DeleteCoin coin={coin} isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} />
		</Card>
	)
}
