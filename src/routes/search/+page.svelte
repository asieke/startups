<script lang="ts">
	let { data, form } = $props();
	let idea = $state('');

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
	<div class="mx-auto mt-10 max-w-2xl space-y-6">
		<button
			onclick={clearResults}
			class="mb-6 rounded-xl bg-blue-100 px-6 py-2 font-semibold text-blue-700 shadow transition-all hover:bg-blue-200"
			>Search again</button
		>
		{#each form.results as summary}
			<div class="rounded-xl border border-blue-100 bg-white p-6 shadow">
				<div class="text-xl font-bold text-blue-700">{summary.name}</div>
				<div class="mt-2 text-gray-700">{summary.description}</div>
				{#if summary.tags}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each summary.tags.split(',') as tag}
							<span class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">{tag.trim()}</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
