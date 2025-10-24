import { NextResponse } from 'next/server'

import { makeServerReq } from '@/app/api/make-request'
import { getCgCategoriesRoute } from '@/app/api/resources'

/**
 * Handles GET requests to fetch cryptocurrency categories from CoinGecko API
 * @returns JSON response containing categories data or error message
 */
export async function GET() {
	try {
		const url = getCgCategoriesRoute()

		// Execute a request to the server
		const result = await makeServerReq(url, 'GET')

		// Check the status and return the appropriate response
		if (result.status === 200) {
			return new NextResponse(JSON.stringify(result.data), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		// If there is an error, return it
		return new NextResponse(JSON.stringify({ error: 'Failed to fetch trending data' }), {
			status: result.status,
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (error) {
		console.error('Error in GET handler:', error)

		// Returning server error
		return new NextResponse(JSON.stringify({ error: 'Server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}
