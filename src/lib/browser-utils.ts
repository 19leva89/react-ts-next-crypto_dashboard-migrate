import { isIP } from 'net'
import { headers } from 'next/headers'
import { UAParser } from 'ua-parser-js'

export interface BrowserInfo {
	userAgent: string
	browser: string
	os: string
	device: string
}

export interface LocationInfo {
	city: string
}

export interface LoginContext {
	ipAddress: string
	browserInfo: BrowserInfo
	locationInfo: LocationInfo
}

/**
 * Extracts and validates the client's IP address from various HTTP headers
 * Checks multiple header sources including proxy headers and CDN headers like Cloudflare
 * @returns Promise resolving to a valid IP address string or 'Unknown' if no valid IP is found
 */
export async function getClientIP(): Promise<string> {
	const headersList = await headers()

	// Check various headers to get the real IP
	const xForwardedFor = headersList.get('x-forwarded-for')
	const xRealIP = headersList.get('x-real-ip')
	const xClientIP = headersList.get('x-client-ip')
	const cfConnectingIP = headersList.get('cf-connecting-ip') // Cloudflare
	const xOriginalForwardedFor = headersList.get('x-original-forwarded-for')

	/**
	 * Validates if a string is a valid IP address using Node.js built-in isIP function
	 * @param ip - The IP address string to validate
	 * @returns True if the IP is valid (IPv4 or IPv6), false otherwise
	 */
	function isValidIPAddress(ip: string): boolean {
		return isIP(ip) !== 0 // Returns 4 for IPv4, 6 for IPv6, 0 for invalid
	}

	if (xForwardedFor) {
		const ips = xForwardedFor
			.split(',')
			.map((ip) => ip.trim())
			.filter((ip) => ip.length > 0 && ip.length <= 45)

		for (const ip of ips) {
			if (isValidIPAddress(ip)) {
				return ip
			}
		}
	}

	const ipHeaderCandidates = [xRealIP, xClientIP, cfConnectingIP, xOriginalForwardedFor]

	for (const header of ipHeaderCandidates) {
		if (header && header.length <= 45 && isValidIPAddress(header.trim())) {
			return header.trim()
		}
	}

	return 'Unknown'
}

/**
 * Extracts detailed browser information from user agent string including browser, OS, and device details
 * Uses UAParser to parse the user-agent header and formats the information into readable strings
 * @returns Promise resolving to BrowserInfo object containing userAgent, browser, OS, and device information
 */
export async function getAdvancedBrowserInfo(): Promise<BrowserInfo> {
	const headersList = await headers()
	const userAgent = headersList.get('user-agent') || ''

	const parser = new UAParser(userAgent)
	const result = parser.getResult()

	// Formatting the browser name
	const browserName = result.browser.name || 'Unknown Browser'
	const browserVersion = result.browser.version || ''
	const browser = browserVersion ? `${browserName} ${browserVersion}` : browserName

	// Formatting the OS
	const osName = result.os.name || 'Unknown OS'
	const osVersion = result.os.version || ''
	const os = osVersion ? `${osName} ${osVersion}` : osName

	// Define the device
	let device = 'Desktop'
	if (result.device.type) {
		const deviceType = result.device.type
		const deviceVendor = result.device.vendor || ''
		const deviceModel = result.device.model || ''

		if (deviceType === 'mobile') {
			device = deviceVendor && deviceModel ? `${deviceVendor} ${deviceModel}` : 'Mobile Device'
		} else if (deviceType === 'tablet') {
			device = deviceVendor && deviceModel ? `${deviceVendor} ${deviceModel}` : 'Tablet'
		} else if (deviceType === 'smarttv') {
			device = 'Smart TV'
		} else if (deviceType === 'wearable') {
			device = 'Wearable Device'
		} else if (deviceType === 'console') {
			device = 'Gaming Console'
		}
	}

	return {
		userAgent,
		browser,
		os,
		device,
	}
}

/**
 * Retrieves location information for a given IP address using the ipinfo.io API
 * Skips geolocation for unknown, localhost, or private network IP addresses
 * @param ipAddress - The IP address to get location information for
 * @returns Promise resolving to LocationInfo object containing city information
 */
export async function getLocationInfo(ipAddress: string): Promise<LocationInfo> {
	// Skip geolocation for unknown or local IPs
	if (
		ipAddress === 'Unknown' ||
		ipAddress.startsWith('127.') ||
		ipAddress.startsWith('192.168.') ||
		ipAddress.startsWith('10.')
	) {
		return { city: 'Unknown' }
	}

	try {
		const response = await fetch(`https://ipinfo.io/${ipAddress}/json`, {
			// Add timeout to prevent hanging requests
			signal: AbortSignal.timeout(5000),
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()

		return {
			city: data.city || 'Unknown',
		}
	} catch (error) {
		console.warn('Failed to get location info:', error)

		return { city: 'Unknown' }
	}
}

/**
 * Gathers comprehensive login context information including IP address, browser details, and location
 * Uses Promise.allSettled to handle potential failures gracefully and return partial data if needed
 * @returns Promise resolving to LoginContext object containing IP address, browser info, and location info
 */
export async function getLoginContext(): Promise<LoginContext> {
	const results = await Promise.allSettled([getClientIP(), getAdvancedBrowserInfo()])

	const ipAddress = results[0].status === 'fulfilled' ? results[0].value : 'Unknown'
	const browserInfo =
		results[1].status === 'fulfilled'
			? results[1].value
			: { userAgent: '', browser: 'Unknown', os: 'Unknown', device: 'Unknown' }

	// Get location info based on IP
	const locationResult = await Promise.allSettled([getLocationInfo(ipAddress)])
	const locationInfo =
		locationResult[0].status === 'fulfilled' ? locationResult[0].value : { city: 'Unknown' }

	return {
		ipAddress,
		browserInfo,
		locationInfo,
	}
}

/**
 * Formats login context information into a human-readable notification message
 * Creates a security notification with timestamp, IP, location, browser, and device details
 * @param context - LoginContext object containing IP address, browser info, and location info
 * @returns Formatted string message for login notification with security warning
 */
export function formatLoginMessage(context: LoginContext): string {
	const { ipAddress, browserInfo, locationInfo } = context
	const timestamp = new Date().toLocaleString('en-US', {
		timeZone: 'UTC',
		dateStyle: 'full',
		timeStyle: 'medium',
	})

	let message =
		`You have successfully login\n` + `📅 Time: ${timestamp} (UTC)\n` + `🌐 IP Address: ${ipAddress}\n`

	// Add location if available
	if (locationInfo.city && locationInfo.city !== 'Unknown') {
		message += `📍 Location: ${locationInfo.city}\n`
	}

	message += `🖥️  Browser: ${browserInfo.browser}\n` + `⚙️  System: ${browserInfo.os}\n`

	if (browserInfo.device && browserInfo.device !== 'Desktop') {
		message += `📱 Device: ${browserInfo.device}\n`
	}

	message += `\n⚠️  If this wasn't you, please change your password immediately`

	return message
}
