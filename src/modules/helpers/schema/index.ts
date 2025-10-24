import { z } from 'zod'

export const exchangeRateSchema = z.object({
	id: z.string(),
	baseCurrency: z.string(),
	vsCurrencies: z.object({
		usd: z.number(),
		eur: z.number(),
		uah: z.number(),
	}),
})

export type TExchangeRate = z.infer<typeof exchangeRateSchema>
