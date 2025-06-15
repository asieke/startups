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
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-2xl mx-auto">
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-4">Search Startup Ideas</h1>
				<p class="text-lg text-gray-600">
					Describe your startup idea and we'll find similar companies with their funding history and market details.
				</p>
			</div>
			
			<form method="POST" class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
				<div class="mb-6">
					<label for="idea" class="block text-sm font-medium text-gray-700 mb-2">
						Describe your startup idea
					</label>
					<textarea
						id="idea"
						name="idea"
						rows="6"
						class="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors resize-none"
						placeholder="e.g., An AI-powered platform that helps small businesses automate their customer service..."
						bind:value={idea}
						maxlength="500"
						required
					></textarea>
					<div class="mt-2 text-sm text-gray-500">
						{idea.length}/500 characters
					</div>
				</div>
				
				<button
					type="submit"
					class="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors duration-200"
				>
					Search Similar Startups
				</button>
			</form>
		</div>
	</div>
{/if}

{#if form?.results && form.results.length > 0}
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h2 class="text-2xl font-bold text-gray-900">Search Results</h2>
				<p class="text-gray-600 mt-1">Found {form.results.length} similar startup{form.results.length !== 1 ? 's' : ''}</p>
			</div>
			<button
				onclick={clearResults}
				class="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors"
			>
				New Search
			</button>
		</div>
		
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each form.results as summary}
				<div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
					<!-- Header -->
					<div class="flex items-start justify-between mb-4">
						<div class="flex-1">
							{#if summary.website}
								<a
									href={`http://${summary.website}`}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors"
								>
									{summary.name}
								</a>
							{:else}
								<h3 class="text-xl font-bold text-gray-900">{summary.name}</h3>
							{/if}
						</div>
						{#if summary.similarity !== undefined}
							<span class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
								{Math.round(summary.similarity * 100)}% match
							</span>
						{/if}
					</div>

					<!-- Funding Info -->
					{#if summary.funding?.last_date || summary.funding?.type || summary.funding?.size || summary.funding?.total || summary.funding?.valuation}
						<div class="bg-gray-50 rounded-lg p-4 mb-4">
							<h4 class="font-semibold text-gray-900 mb-2">Funding Details</h4>
							<div class="space-y-1 text-sm">
								{#if summary.funding?.last_date || summary.funding?.type || summary.funding?.size}
									<div class="text-gray-700">
										<span class="font-medium">Latest:</span>
										{#if summary.funding?.last_date}{summary.funding.last_date}{/if}
										{#if summary.funding?.type} {summary.funding.type}{/if}
										{#if summary.funding?.size} (${summary.funding.size.toLocaleString()}){/if}
									</div>
								{/if}
								{#if summary.funding?.total}
									<div class="text-gray-700">
										<span class="font-medium">Total Raised:</span> ${summary.funding.total.toLocaleString()}
									</div>
								{/if}
								{#if summary.funding?.valuation}
									<div class="text-gray-700">
										<span class="font-medium">Valuation:</span> ${summary.funding.valuation.toLocaleString()}
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Description -->
					<p class="text-gray-600 mb-4 line-clamp-3">{summary.description}</p>

					<!-- Tags -->
					{#if summary.tags}
						<div class="mb-4">
							<div class="flex flex-wrap gap-2">
								{#each summary.tags.split(',').slice(0, 3) as tag}
									<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
										{tag.trim()}
									</span>
								{/each}
								{#if summary.tags.split(',').length > 3}
									<span class="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
										+{summary.tags.split(',').length - 3} more
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Investors -->
					{#if summary.investors}
						<div class="mb-4">
							<h5 class="font-medium text-gray-900 mb-2 text-sm">Key Investors:</h5>
							<div class="flex flex-wrap gap-1">
								{#each summary.investors.split(',').slice(0, 3) as investor}
									<span class="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium">
										{investor.trim()}
									</span>
								{/each}
								{#if summary.investors.split(',').length > 3}
									<span class="bg-green-50 text-green-600 px-2 py-1 rounded text-xs">
										+{summary.investors.split(',').length - 3}
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Footer Info -->
					<div class="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-100">
						{#if summary.hq}
							<span>📍 {summary.hq}</span>
						{/if}
						{#if summary.founded}
							<span>🗓️ Founded {summary.founded}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
