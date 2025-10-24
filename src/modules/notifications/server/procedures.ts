import { z } from 'zod'
import { TRPCError } from '@trpc/server'

import { prisma } from '@/lib/prisma'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { INTERVAL_EXPIRED_NOTIFICATIONS } from '@/constants/intervals'

export const notificationsRouter = createTRPCRouter({
	addLogoutNotification: protectedProcedure.mutation(async ({ ctx }) => {
		if (!ctx.auth?.user?.id) {
			throw new TRPCError({
				code: 'UNAUTHORIZED',
				message: 'User must be authenticated',
			})
		}

		const userId = ctx.auth.user.id

		await prisma.notification.create({
			data: {
				userId,
				type: 'LOGOUT',
				title: 'Logout',
				message: 'You have been logged out',
			},
		})
	}),

	getNotifications: protectedProcedure
		.input(
			z.object({
				cursor: z.string().nullish(),
				limit: z.number().min(1).max(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { cursor } = input
			const limit = input.limit

			const items = await prisma.notification.findMany({
				take: limit + 1,
				where: {
					userId: ctx.auth.user.id,
				},
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: {
					createdAt: 'desc',
				},
			})

			let nextCursor: typeof cursor | undefined = undefined
			if (items.length > limit) {
				const nextItem = items.pop()
				nextCursor = nextItem?.id
			}

			return {
				items,
				nextCursor,
			}
		}),

	getUnreadPriceNotifications: protectedProcedure.query(async ({ ctx }) => {
		// 1) Get the doNotDisturb flag - the minimum request
		const user = await prisma.user.findUnique({
			where: { id: ctx.auth.user.id },
			select: { doNotDisturb: true },
		})

		// 2) If doNotDisturb is enabled, return an empty list
		if (user?.doNotDisturb) {
			return []
		}

		// 3) Otherwise, return unread price alerts
		const items = await prisma.notification.findMany({
			where: {
				userId: ctx.auth.user.id,
				type: 'PRICE_ALERT',
				isRead: false,
			},
		})

		return items
	}),

	markAsRead: protectedProcedure.input(z.string()).mutation(async ({ input: notificationId, ctx }) => {
		await prisma.notification.update({
			where: {
				id: notificationId,
				userId: ctx.auth.user.id,
			},
			data: {
				isRead: true,
			},
		})
	}),

	markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
		await prisma.notification.updateMany({
			where: {
				userId: ctx.auth.user.id,
			},
			data: {
				isRead: true,
			},
		})
	}),

	deleteNotification: protectedProcedure
		.input(z.string())
		.mutation(async ({ input: notificationId, ctx }) => {
			await prisma.notification.delete({
				where: {
					id: notificationId,
					userId: ctx.auth.user.id,
				},
			})
		}),

	deleteExpiredNotifications: protectedProcedure.mutation(async ({ ctx }) => {
		const cutoff = new Date(Date.now() - INTERVAL_EXPIRED_NOTIFICATIONS)

		await prisma.notification.deleteMany({
			where: {
				userId: ctx.auth.user.id,
				createdAt: { lt: cutoff },
			},
		})
	}),
})
