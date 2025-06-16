<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Fixed Top Navigation -->
	<nav class="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo/Brand -->
				<div class="flex items-center">
					<a
						href="/"
						class="text-2xl font-bold text-indigo-600 transition-colors hover:text-indigo-700"
					>
						StartupHub
					</a>
				</div>

				<!-- Navigation Links -->
				<div class="flex items-center space-x-8">
					<a
						href="/"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-indigo-600 {$page
							.url.pathname === '/'
							? 'bg-indigo-50 text-indigo-600'
							: ''}"
					>
						Home
					</a>
					<a
						href="/search"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-indigo-600 {$page
							.url.pathname === '/search'
							? 'bg-indigo-50 text-indigo-600'
							: ''}"
					>
						Search Ideas
					</a>
					<a
						href="/startups"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-indigo-600 {$page
							.url.pathname === '/startups'
							? 'bg-indigo-50 text-indigo-600'
							: ''}"
					>
						Browse Startups
					</a>
					<a
						href="/validation"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-indigo-600 {$page
							.url.pathname === '/validation'
							? 'bg-indigo-50 text-indigo-600'
							: ''}"
					>
						VC Validation
					</a>
					<a
						href="/market-research"
						class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-indigo-600 {$page
							.url.pathname === '/market-research'
							? 'bg-indigo-50 text-indigo-600'
							: ''}"
					>
						Market Research
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content with top padding to account for fixed nav -->
	<main class="pt-16">
		{@render children()}
	</main>
</div>
