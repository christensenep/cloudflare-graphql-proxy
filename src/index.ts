export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		
		const storeHash = url.searchParams.get('storeHash');
		const channelId = url.searchParams.get('channelId');
		const bodyBuffer = await request.clone().arrayBuffer();
		const keyBuffer = await crypto.subtle.digest('SHA-512', bodyBuffer);
		const key = Array.from(new Uint8Array(keyBuffer)).map((b) => b.toString(16).padStart(2,'0')).join('')

		const cachedResponse = await env.GRAPHQL_PROXY.get(key);
		if (cachedResponse) {
			await sleep(500);
			return new Response(cachedResponse, { status: 200 });
		}
		else {
			const proxyUrl = `https://store-${storeHash}-${channelId}.mybigcommerce.com/graphql`

			if (!proxyUrl) {
				return new Response('Bad request: Missing `proxyUrl` query param', { status: 400 });
			}

			// make subrequests with the global `fetch()` function
			const res = await fetch(proxyUrl, request);
			const resText = await res.clone().text();
			await env.GRAPHQL_PROXY.put(key, resText);

			return res;
		}
	},
};

function sleep(ms: number) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}