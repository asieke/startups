<script lang="ts">
	let { data } = $props();
	let summaries = data.summaries;
	let search = $state('');

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

<div class="p-4">
	<div class="mx-auto mb-4 flex max-w-screen-xl items-center justify-between">
		<input
			type="text"
			placeholder="Search startups..."
			class="w-full max-w-md rounded border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
			bind:value={search}
		/>
	</div>
	<div class="overflow-x-auto">
		<table
			class="mx-auto w-full max-w-screen-xl min-w-full table-fixed divide-y divide-gray-200 rounded-lg bg-white shadow"
		>
			<thead class="bg-gray-50">
				<tr>
					<th
						class="w-40 min-w-[10rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Name</th
					>
					<th
						class="w-64 min-w-[16rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Description</th
					>
					<th
						class="w-32 min-w-[8rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Tags</th
					>
					<th
						class="w-32 min-w-[8rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Target Customer</th
					>
					<th
						class="w-40 min-w-[9rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Funding</th
					>
					<th
						class="w-40 min-w-[9rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Investors</th
					>
					<th
						class="w-32 min-w-[8rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Company Info</th
					>
					<th
						class="w-40 min-w-[9rem] bg-gray-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-gray-700 uppercase"
						>Competitors</th
					>
				</tr>
			</thead>
		</table>
		<div class="w-full" style="max-height:70vh;overflow-y:auto;">
			<table
				class="mx-auto w-full max-w-screen-xl min-w-full table-fixed divide-y divide-gray-200 bg-white"
			>
				<tbody class="block divide-y divide-gray-100" style="width:100%">
					{#each filteredSummaries as summary}
						<tr class="transition hover:bg-gray-50">
							<td
								class="overflow-hidden px-2 py-2 align-top font-bold text-ellipsis whitespace-nowrap text-blue-700"
							>
								<div>{summary.name}</div>
								<div class="mt-1 flex gap-2">
									<a
										href={'https://' + summary.website}
										class="text-blue-500 hover:underline"
										target="_blank"
										aria-label="Company website"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="inline h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 4v16m8-8H4"
											/></svg
										>
									</a>
									<a
										href={summary.linkedin}
										class="text-blue-500 hover:underline"
										target="_blank"
										aria-label="LinkedIn profile"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="inline h-4 w-4"
											fill="currentColor"
											viewBox="0 0 24 24"
											><path
												d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.968v5.699h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.844-1.563 3.043 0 3.604 2.004 3.604 4.609v5.587z"
											/></svg
										>
									</a>
								</div>
							</td>
							<td
								class="w-64 max-w-[16rem] overflow-hidden px-2 py-2 align-top text-sm break-words text-ellipsis whitespace-normal text-gray-700"
								>{summary.description}</td
							>
							<td class="px-2 py-2 align-top">
								<div class="flex flex-wrap gap-1">
									{#each summary.tags.split(',') as tag}
										<button
											class="cursor-pointer rounded bg-blue-100 px-2 py-0.5 text-xs whitespace-nowrap text-blue-800 transition hover:bg-blue-200"
											>{tag.trim()}</button
										>
									{/each}
								</div>
							</td>
							<td
								class="w-32 max-w-[8rem] px-2 py-2 align-top text-xs break-words whitespace-normal text-gray-700"
								>{summary.target_customer}</td
							>
							<td
								class="overflow-hidden px-2 py-2 align-top text-xs text-ellipsis whitespace-nowrap text-gray-700"
							>
								<div class="flex flex-col leading-tight">
									<span>{summary.funding.last_date}</span>
									<span>{summary.funding.type} (${summary.funding.size}M)</span>
									<span>${summary.funding.valuation}M Valuation</span>
								</div>
							</td>
							<td
								class="w-40 max-w-[9rem] px-2 py-2 align-top text-xs break-words whitespace-normal text-gray-600"
								title={summary.investors}>{limitedInvestors(summary.investors)}</td
							>
							<td class="px-2 py-2 align-top text-xs break-words whitespace-normal">
								<div><span class="font-semibold">HQ:</span> {summary.hq}</div>
								<div><span class="font-semibold">Employees:</span> {summary.employees}</div>
								<div><span class="font-semibold">Founded:</span> {summary.founded}</div>
							</td>
							<td
								class="w-40 max-w-[9rem] px-2 py-2 align-top text-xs break-words whitespace-normal"
							>
								{#each summary.competitors as comp}
									<div>
										<a
											href={'https://' + comp.website}
											class="text-blue-500 hover:underline"
											target="_blank">{comp.name}</a
										>
									</div>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
