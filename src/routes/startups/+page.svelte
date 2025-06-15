<script lang="ts">
	let { data } = $props();
	let summaries = data.summaries;
	let search = $state('');
	let selectedTags = $state<Set<string>>(new Set<string>());

	$inspect(summaries);

	function limitedInvestors(investors: string) {
		if (!investors) return '';
		const parts = investors.split(',').map((s) => s.trim());
		if (parts.length <= 3) return parts.join(', ');
		return parts.slice(0, 3).join(', ') + `... (+${parts.length - 3})`;
	}

	function toggleTag(tag: string) {
		const newSelectedTags = new Set(selectedTags);
		if (newSelectedTags.has(tag)) {
			newSelectedTags.delete(tag);
		} else {
			newSelectedTags.add(tag);
		}
		selectedTags = newSelectedTags;
	}

	function removeTag(tag: string) {
		const newSelectedTags = new Set(selectedTags);
		newSelectedTags.delete(tag);
		selectedTags = newSelectedTags;
	}

	// Create handler functions for each tag
	function createRemoveTagHandler(tag: string) {
		return () => removeTag(tag);
	}

	function createToggleTagHandler(tag: string) {
		return () => toggleTag(tag);
	}

	let filteredSummaries = $derived(
		summaries.filter((summary) => {
			const q = search.toLowerCase();
			
			// Filter by selected tags first
			if (selectedTags.size > 0) {
				if (!summary.tags) return false;
				const summaryTags = summary.tags.split(',').map((t: string) => t.trim());
				const hasAllSelectedTags = [...selectedTags].every((selectedTag: string) =>
					summaryTags.some((summaryTag: string) => 
						summaryTag.toLowerCase() === selectedTag.toLowerCase()
					)
				);
				if (!hasAllSelectedTags) return false;
			}
			
			// Then filter by search query
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
						(comp: any) =>
							comp.name?.toLowerCase().includes(q) || comp.website?.toLowerCase().includes(q)
					))
			);
		})
	);
</script>

<div class="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header Section -->
	<div class="mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="w-full sm:w-auto sm:max-w-md">
				<input
					type="text"
					placeholder="Search startups, tags, investors..."
					class="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					bind:value={search}
				/>
			</div>
		</div>

		<!-- Selected Tags Display -->
		{#if selectedTags.size > 0}
			<div class="mt-4">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-sm font-medium text-gray-700">Filtered by:</span>
					{#each [...selectedTags] as tag}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<button
							onclick={createRemoveTagHandler(tag)}
							class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200"
						>
							{tag}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if search && filteredSummaries.length !== summaries.length}
			<div class="mt-4 text-sm text-gray-600">
				Showing {filteredSummaries.length} of {summaries.length} startups
			</div>
		{:else if selectedTags.size > 0}
			<div class="mt-4 text-sm text-gray-600">
				Showing {filteredSummaries.length} of {summaries.length} startups
			</div>
		{/if}
	</div>

	<!-- Table Header -->
	<div class="overflow-hidden rounded-t-lg border border-gray-200 bg-white shadow-sm">
		<div class="border-b border-gray-200 bg-gray-50">
			<div class="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-700">
				<div class="col-span-3 md:col-span-2">Company</div>
				<div class="col-span-3 md:col-span-2">Funding</div>
				<div class="col-span-6 md:col-span-3">Description</div>
				<div class="hidden md:col-span-2 md:block">Customer</div>
				<div class="hidden md:col-span-2 md:block">Tags</div>
				<div class="hidden md:col-span-1 md:block">Details</div>
			</div>
		</div>

		<!-- Table Body -->
		<div class="max-h-[calc(100vh-300px)] divide-y divide-gray-200 overflow-y-auto">
			{#each filteredSummaries as summary, index}
				<div
					class="grid grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-gray-50 {index % 2 ===
					0
						? 'bg-white'
						: 'bg-gray-25'}"
				>
					<!-- Company -->
					<div class="col-span-3 md:col-span-2">
						<div class="space-y-1">
							{#if summary.website}
								<a
									href={`https://${summary.website}`}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-semibold text-gray-900 transition-colors hover:text-indigo-600"
								>
									{summary.name}
								</a>
							{:else}
								<div class="text-sm font-semibold text-gray-900">{summary.name}</div>
							{/if}
							{#if summary.linkedin}
								<a
									href={summary.linkedin}
									target="_blank"
									rel="noopener noreferrer"
									class="block text-xs text-indigo-600 hover:text-indigo-700"
								>
									LinkedIn →
								</a>
							{/if}
							{#if summary.hq || summary.founded}
								<div class="space-y-0.5 text-xs text-gray-500">
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
									<div class="font-medium text-indigo-600">{summary.funding.type}</div>
								{/if}
								{#if summary.funding.size}
									<div class="text-gray-700">${summary.funding.size}M</div>
								{/if}
								{#if summary.funding.valuation}
									<div class="text-gray-600">Val: ${summary.funding.valuation}M</div>
								{/if}
							</div>
						{:else}
							<span class="text-xs text-gray-400">No funding data</span>
						{/if}
					</div>

					<!-- Description -->
					<div class="col-span-6 md:col-span-3">
						<p class="line-clamp-3 text-sm text-gray-700">{summary.description}</p>
					</div>

					<!-- Customer (hidden on mobile) -->
					<div class="hidden md:col-span-2 md:block">
						<p class="line-clamp-2 text-sm text-gray-600">{summary.target_customer || 'N/A'}</p>
					</div>

					<!-- Tags (hidden on mobile) -->
					<div class="hidden md:col-span-2 md:block">
						{#if summary.tags}
							<div class="flex flex-wrap gap-1">
								{#each summary.tags
									.split(',')
									.map((t) => t.trim())
									.filter(Boolean)
									.slice(0, 2) as tag}
									{@const isSelected = selectedTags.has(tag)}
									<!-- svelte-ignore a11y-click-events-have-key-events -->
									<!-- svelte-ignore a11y-no-static-element-interactions -->
									<button
										onclick={createToggleTagHandler(tag)}
										class="rounded px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer {isSelected 
											? 'bg-purple-200 text-purple-800' 
											: 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'}"
									>
										{tag}
									</button>
								{/each}
								{#if summary.tags.split(',').length > 2}
									<span class="text-xs text-gray-500">+{summary.tags.split(',').length - 2}</span>
								{/if}
							</div>
						{:else}
							<span class="text-xs text-gray-400">No tags</span>
						{/if}
					</div>

					<!-- Details (hidden on mobile) -->
					<div class="hidden md:col-span-1 md:block">
						{#if summary.investors}
							<div class="text-xs text-gray-600">
								<div class="mb-1 font-medium">Investors:</div>
								<div class="text-gray-500">{limitedInvestors(summary.investors)}</div>
							</div>
						{/if}
						{#if summary.industry}
							<div class="mt-2 text-xs text-gray-500">
								{summary.industry}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	{#if filteredSummaries.length === 0}
		<div class="py-12 text-center">
			<div class="mb-4 text-gray-400">
				<svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
					></path>
				</svg>
			</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900">No startups found</h3>
			<p class="text-gray-500">
				Try adjusting your search terms or clear the search to see all startups.
			</p>
		</div>
	{/if}
</div>

<style lang="postcss">
</style>
