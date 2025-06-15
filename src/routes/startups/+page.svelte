<script lang="ts">
	let { data } = $props();
	let summaries = data.summaries;
	let search = $state('');

	$inspect(summaries);

	function limitedInvestors(investors: string) {
		if (!investors) return '';
		const parts = investors.split(',').map((s) => s.trim());
		if (parts.length <= 3) return parts.join(', ');
		return parts.slice(0, 3).join(', ') + `... (+${parts.length - 3})`;
	}

	let filteredSummaries = $derived(
		summaries.filter((summary) => {
			const q = search.toLowerCase();
			if (!q) return true;
			return (
				summary.name?.toLowerCase().includes(q) ||
				summary.description?.toLowerCase().includes(q) ||
				summary.tags?.toLowerCase().includes(q) ||
				summary.target_customer?.toLowerCase().includes(q) ||
				summary.investors?.toLowerCase().includes(q) ||
				summary.hq?.toLowerCase().includes(q) ||
				String(summary.employees || '')
					.toLowerCase()
					.includes(q) ||
				String(summary.founded || '')
					.toLowerCase()
					.includes(q) ||
				(summary.funding &&
					(String(summary.funding.last_date || '')
						.toLowerCase()
						.includes(q) ||
						String(summary.funding.type || '')
							.toLowerCase()
							.includes(q) ||
						String(summary.funding.size || '')
							.toLowerCase()
							.includes(q) ||
						String(summary.funding.valuation || '')
							.toLowerCase()
							.includes(q))) ||
				(summary.competitors &&
					summary.competitors.some(
						(comp) =>
							comp.name?.toLowerCase().includes(q) || comp.website?.toLowerCase().includes(q)
					))
			);
		})
	);
</script>

<div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header Section -->
	<div class="mb-8">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Browse Startups</h1>
				<p class="text-gray-600 mt-1">
					Explore {summaries.length} startups with detailed funding and market information
				</p>
			</div>
			<div class="w-full sm:w-auto sm:max-w-md">
				<input
					type="text"
					placeholder="Search startups, tags, investors..."
					class="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors"
					bind:value={search}
				/>
			</div>
		</div>
		
		{#if search && filteredSummaries.length !== summaries.length}
			<div class="mt-4 text-sm text-gray-600">
				Showing {filteredSummaries.length} of {summaries.length} startups
			</div>
		{/if}
	</div>

	<!-- Table Header -->
	<div class="bg-white rounded-t-lg shadow-sm border border-gray-200 overflow-hidden">
		<div class="bg-gray-50 border-b border-gray-200">
			<div class="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-700">
				<div class="col-span-3 md:col-span-2">Company</div>
				<div class="col-span-3 md:col-span-2">Funding</div>
				<div class="col-span-6 md:col-span-3">Description</div>
				<div class="hidden md:block md:col-span-2">Customer</div>
				<div class="hidden md:block md:col-span-2">Tags</div>
				<div class="hidden md:block md:col-span-1">Details</div>
			</div>
		</div>

		<!-- Table Body -->
		<div class="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
			{#each filteredSummaries as summary, index}
				<div class="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors {index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}">
					<!-- Company -->
					<div class="col-span-3 md:col-span-2">
						<div class="space-y-1">
							{#if summary.website}
								<a
									href={`https://${summary.website}`}
									target="_blank"
									rel="noopener noreferrer"
									class="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-sm"
								>
									{summary.name}
								</a>
							{:else}
								<div class="font-semibold text-gray-900 text-sm">{summary.name}</div>
							{/if}
							{#if summary.linkedin}
								<a
									href={summary.linkedin}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-indigo-600 hover:text-indigo-700 block"
								>
									LinkedIn →
								</a>
							{/if}
							{#if summary.hq || summary.founded}
								<div class="text-xs text-gray-500 space-y-0.5">
									{#if summary.hq}<div>📍 {summary.hq}</div>{/if}
									{#if summary.founded}<div>🗓️ {summary.founded}</div>{/if}
								</div>
							{/if}
						</div>
					</div>

					<!-- Funding -->
					<div class="col-span-3 md:col-span-2">
						{#if summary.funding}
							<div class="space-y-1 text-xs">
								{#if summary.funding.last_date}
									<div class="font-medium text-gray-900">{summary.funding.last_date}</div>
								{/if}
								{#if summary.funding.type}
									<div class="text-indigo-600 font-medium">{summary.funding.type}</div>
								{/if}
								{#if summary.funding.size}
									<div class="text-gray-700">${summary.funding.size}M</div>
								{/if}
								{#if summary.funding.valuation}
									<div class="text-gray-600">Val: ${summary.funding.valuation}M</div>
								{/if}
							</div>
						{:else}
							<span class="text-gray-400 text-xs">No funding data</span>
						{/if}
					</div>

					<!-- Description -->
					<div class="col-span-6 md:col-span-3">
						<p class="text-sm text-gray-700 line-clamp-3">{summary.description}</p>
					</div>

					<!-- Customer (hidden on mobile) -->
					<div class="hidden md:block md:col-span-2">
						<p class="text-sm text-gray-600 line-clamp-2">{summary.target_customer || 'N/A'}</p>
					</div>

					<!-- Tags (hidden on mobile) -->
					<div class="hidden md:block md:col-span-2">
						{#if summary.tags}
							<div class="flex flex-wrap gap-1">
								{#each summary.tags
									.split(',')
									.map((t) => t.trim())
									.filter(Boolean)
									.slice(0, 2) as tag}
									<span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
										{tag}
									</span>
								{/each}
								{#if summary.tags.split(',').length > 2}
									<span class="text-xs text-gray-500">+{summary.tags.split(',').length - 2}</span>
								{/if}
							</div>
						{:else}
							<span class="text-gray-400 text-xs">No tags</span>
						{/if}
					</div>

					<!-- Details (hidden on mobile) -->
					<div class="hidden md:block md:col-span-1">
						{#if summary.investors}
							<div class="text-xs text-gray-600">
								<div class="font-medium mb-1">Investors:</div>
								<div class="text-gray-500">{limitedInvestors(summary.investors)}</div>
							</div>
						{/if}
						{#if summary.industry}
							<div class="text-xs text-gray-500 mt-2">
								{summary.industry}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	{#if filteredSummaries.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-400 mb-4">
				<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"></path>
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No startups found</h3>
			<p class="text-gray-500">Try adjusting your search terms or clear the search to see all startups.</p>
		</div>
	{/if}
</div>

<style lang="postcss">
</style>
