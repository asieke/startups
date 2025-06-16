<script lang="ts">
	let {
		variant = 'primary',
		size = 'md',
		href = undefined,
		onclick = undefined,
		disabled = $bindable(false),
		class: className = '',
		children
	} = $props();

	const baseClasses =
		'font-semibold transition-colors duration-200 focus:ring-2 focus:outline-none';

	const variantClasses = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200',
		secondary: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-200',
		outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-200',
		ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-200'
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm rounded-md',
		md: 'px-4 py-2 text-sm rounded-lg',
		lg: 'px-6 py-3 text-base rounded-lg'
	};

	const classes =
		`${baseClasses} ${variantClasses[variant as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`.trim();
</script>

{#if href}
	<a {href} class={classes}>
		{@render children()}
	</a>
{:else}
	<button {onclick} {disabled} class={classes}>
		{@render children()}
	</button>
{/if}
