<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Modern Top Navigation -->
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<!-- Logo/Brand -->
				<div class="flex items-center">
					<a href="/" class="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
						StartupHub
					</a>
				</div>

				<!-- Navigation Links -->
				<div class="flex items-center space-x-8">
					<a
						href="/"
						class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/' ? 'text-indigo-600 bg-indigo-50' : ''}"
					>
						Home
					</a>
					<a
						href="/search"
						class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/search' ? 'text-indigo-600 bg-indigo-50' : ''}"
					>
						Search Ideas
					</a>
					<a
						href="/startups"
						class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/startups' ? 'text-indigo-600 bg-indigo-50' : ''}"
					>
						Browse Startups
					</a>
					<a
						href="/validation"
						class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 {$page.url.pathname === '/validation' ? 'text-indigo-600 bg-indigo-50' : ''}"
					>
						VC Validation
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="flex-1">
		{@render children()}
	</main>
</div>
