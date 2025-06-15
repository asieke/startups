<script lang="ts">
	let { data } = $props();
	let summaries = data.summaries;
	let search = $state('');

	$inspect(summaries);

	function limitedInvestors(investors: string) {
		if (!investors) return '';
		const parts = investors.split(',').map((s) => s.trim());
		if (parts.length <= 5) return parts.join(', ');
		return parts.slice(0, 5).join(', ') + '...';
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

<div class="relative h-screen w-full">
	<div class="absolute top-0 left-0 flex h-16 w-full items-center justify-center">
		<input
			type="text"
			placeholder="Search startups..."
			class="w-full max-w-md rounded border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
			bind:value={search}
		/>
	</div>
	<div
		class="absolute top-20 right-8 left-8 flex h-12 divide-x divide-gray-200 border-t border-r border-b border-l border-gray-200 bg-purple-200"
	>
		<div class="flex w-[10%] items-center justify-center">Company Name</div>
		<div class="flex w-[13%] items-center justify-center">Funding</div>
		<div class="flex w-[25%] items-center justify-center">Description</div>
		<div class="flex w-[15%] items-center justify-center">Customer</div>
		<div class="flex w-[15%] items-center justify-center">Tags</div>
		<div class="flex w-[13%] items-center justify-center">Investors</div>
		<div class="flex w-[9%] items-center justify-center">Industry</div>
	</div>
	<div class="absolute top-32 right-8 bottom-0 left-8 flex flex-col overflow-y-auto">
		{#each filteredSummaries as summary}
			<div
				class="flex w-full divide-x divide-gray-200 border-r border-b border-l border-gray-200 text-xs"
			>
				<div class="flex h-[125px] w-[10%] flex-col gap-1 overflow-hidden p-3">
					<a
						href={`https://${summary.website}`}
						target="_blank"
						rel="noopener noreferrer"
						class="font-bold"
					>
						{summary.name}
					</a>
					{#if summary.linkedin}
						<a
							href={summary.linkedin}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-blue-200 underline">LinkedIn</a
						>
					{/if}
				</div>
				<div class="flex h-[125px] w-[13%] overflow-hidden p-[5px]">
					{#if summary.funding}
						<div>
							{summary.funding.last_date}<br />
							{summary.funding.type} (${summary.funding.size}M)<br />
							Valuation: ${summary.funding.valuation}M
						</div>
					{:else}
						—
					{/if}
				</div>
				<div class="flex h-[125px] w-[25%] overflow-hidden p-[5px]">{summary.description}</div>
				<div class="flex h-[125px] w-[15%] overflow-hidden p-[5px]">{summary.target_customer}</div>
				<div class="flex h-[125px] w-[15%] flex-wrap items-center gap-1 overflow-hidden p-[5px]">
					{#if summary.tags}
						{#each summary.tags
							.split(',')
							.map((t) => t.trim())
							.filter(Boolean) as tag}
							<span
								class="mr-1 mb-1 inline-block rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-gray-800 shadow-sm transition-colors duration-200 hover:bg-gray-200"
								aria-label={`Tag: ${tag}`}>{tag}</span
							>
						{/each}
					{:else}
						<span
							class="mr-1 mb-1 inline-block rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-gray-800 shadow-sm transition-colors duration-200 hover:bg-gray-200"
							aria-label="No tags">—</span
						>
					{/if}
				</div>
				<div class="flex h-[125px] w-[13%] overflow-hidden p-[5px]">
					{limitedInvestors(summary.investors)}
				</div>
				<div class="flex h-[125px] w-[9%] overflow-hidden p-[5px]">{summary.industry}</div>
			</div>
		{/each}
	</div>
</div>

<style lang="postcss">
</style>
