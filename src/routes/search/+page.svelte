<script lang="ts">
	let { data, form } = $props();
	let idea = $state('');

	$inspect(form);

	function clearResults() {
		// Reload the page to clear form state and show the search box again
		window.location.reload();
	}
</script>

{#if !form?.results || form.results.length === 0}
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100"
	>
		<form
			method="POST"
			class="flex w-full max-w-2xl flex-col gap-8 rounded-3xl bg-white p-10 shadow-2xl"
		>
			<h1 class="text-center text-3xl font-bold text-blue-700">Share your Startup Idea</h1>
			<textarea
				class="h-40 w-full resize-none rounded-xl border-2 border-blue-200 bg-gray-50 p-5 text-lg text-gray-800 shadow transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none"
				placeholder="Describe your startup idea..."
				bind:value={idea}
				maxlength="500"
				required
				name="idea"
			></textarea>
			<button
				type="submit"
				class="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-4 text-xl font-semibold text-white shadow-lg transition-all hover:from-blue-600 hover:to-blue-700"
			>
				Search
			</button>
		</form>
	</div>
{/if}

{#if form?.results && form.results.length > 0}
	<div class="mx-auto mt-12 mb-12 max-w-6xl">
		<button
			onclick={clearResults}
			class="mb-6 rounded-xl bg-blue-100 px-6 py-2 font-semibold text-blue-700 shadow transition-all hover:bg-blue-200"
			>Search again</button
		>
		<div class="columns-1 gap-6 sm:columns-2 lg:columns-3">
			{#each form.results as summary}
				<div class="mb-6 break-inside-avoid rounded-xl border border-blue-100 bg-white p-6 shadow">
					<div class="mb-2 flex items-center gap-2 text-xl font-bold text-blue-700">
						{#if summary.website}
							<a
								href={`http://${summary.website}`}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:underline"
							>
								{summary.name}
							</a>
						{:else}
							{summary.name}
						{/if}
						{#if summary.similarity !== undefined}
							<span
								class="ml-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"
							>
								{Math.round(summary.similarity * 100)}% match
							</span>
						{/if}
					</div>
					<!-- Funding Info (per card) -->
					{#if summary.funding?.last_date || summary.funding?.type || summary.funding?.size || summary.funding?.total || summary.funding?.valuation}
						<div class="mb-3 flex flex-wrap items-center gap-4 rounded bg-blue-50 p-3">
							{#if summary.funding?.last_date || summary.funding?.type || summary.funding?.size}
								<div class="text-sm font-semibold text-blue-800">
									{#if summary.funding?.last_date}{summary.funding.last_date}{/if}
									{#if summary.funding?.type}
										{summary.funding.type}{/if}
									{#if summary.funding?.size}
										(${summary.funding.size.toLocaleString()}){/if}
								</div>
							{/if}
							{#if summary.funding?.total}
								<div class="text-sm text-blue-700">
									Total Raised: ${summary.funding.total.toLocaleString()}
								</div>
							{/if}
							{#if summary.funding?.valuation}
								<div class="text-sm text-blue-700">
									Valuation: ${summary.funding.valuation.toLocaleString()}
								</div>
							{/if}
						</div>
					{/if}
					<div class="mt-2 text-gray-700">{summary.description}</div>
					{#if summary.tags}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each summary.tags.split(',') as tag}
								<span class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">{tag.trim()}</span
								>
							{/each}
						</div>
					{/if}
					{#if summary.investors}
						<div class="mt-4">
							<div class="mb-1 font-semibold text-blue-700">Investors:</div>
							<div class="flex flex-wrap gap-2">
								{#each summary.investors.split(',') as investor}
									<span class="rounded bg-green-100 px-2 py-1 text-xs text-green-800"
										>{investor.trim()}</span
									>
								{/each}
							</div>
						</div>
					{/if}
					<div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
						{#if summary.hq}
							<div><span class="font-semibold">HQ:</span> {summary.hq}</div>
						{/if}
						{#if summary.founded}
							<div><span class="font-semibold">Founded:</span> {summary.founded}</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
