<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	// Type definitions
	interface Message {
		type: 'vc' | 'user';
		content: string;
	}

	interface MemoData {
		id: string;
		timestamp: string;
		conversation: Message[];
		memo: string;
		title: string;
		researchTopics?: string[];
	}

	// Chat state
	let messages = $state<Message[]>([]);
	let userInput = $state('');
	let isComplete = $state(false);
	let isGeneratingMemo = $state(false);
	let isGeneratingResponse = $state(false);
	let generatedMemo = $state('');
	let researchTopics = $state<string[]>([]);

	// Historical memos state
	let historicalMemos = $state<MemoData[]>([]);
	let selectedMemo = $state<MemoData | null>(null);
	let showSidebar = $state(true);

	// Determine if we're in active chat mode
	let isActiveChatMode = $derived(!isComplete && !selectedMemo && messages.length > 0);

	// Initialize with first message
	$effect(() => {
		if (messages.length === 0 && !selectedMemo) {
			messages = [
				{
					type: 'vc',
					content: `Sarah, Fidelity Labs VC. What problem are you solving and how?`
				}
			];
		}
	});

	// Load historical memos from localStorage
	onMount(() => {
		loadHistoricalMemos();
	});

	function loadHistoricalMemos() {
		const memos: MemoData[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('fidelity-labs-session-')) {
				try {
					const data = JSON.parse(localStorage.getItem(key) || '');
					memos.push({
						id: key,
						...data
					});
				} catch (e) {
					console.error('Error parsing memo:', e);
				}
			}
		}
		// Sort by timestamp, newest first
		historicalMemos = memos.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	}

	function startNewSession() {
		selectedMemo = null;
		messages = [
			{
				type: 'vc',
				content: `Sarah, Fidelity Labs VC. What problem are you solving and how?`
			}
		];
		userInput = '';
		isComplete = false;
		isGeneratingMemo = false;
		isGeneratingResponse = false;
		generatedMemo = '';
		researchTopics = [];
	}

	function selectMemo(memo: MemoData) {
		selectedMemo = memo;
		// Reset chat state when viewing historical memo
		isComplete = true;
		generatedMemo = memo.memo;
		messages = memo.conversation || [];
		researchTopics = memo.researchTopics || [];
	}

	async function sendMessage() {
		if (!userInput.trim() || isGeneratingResponse) return;

		// Add user message
		const newUserMessage = {
			type: 'user' as const,
			content: userInput.trim()
		};
		messages = [...messages, newUserMessage];

		const currentInput = userInput;
		userInput = '';
		isGeneratingResponse = true;

		try {
			// Generate AI response using the conversation context
			const conversationHistory = messages
				.map((msg) => `${msg.type === 'vc' ? 'Fidelity Labs VC Sarah' : 'EIR'}: ${msg.content}`)
				.join('\n\n');

			const systemPrompt = `You are Sarah, a VC partner at Fidelity Labs, the corporate innovation incubator at Fidelity Investments. You are conducting a startup evaluation session with an Entrepreneur in Residence (EIR) who is proposing a new venture to be developed as a wholly owned Fidelity startup.

CONTEXT:
- The entrepreneur is a Fidelity EIR, not an external founder
- Any venture will be wholly owned by Fidelity, not an external investment
- You need to evaluate strategic fit with Fidelity's business and brand
- Consider how Fidelity's assets (data, customer base, brand, relationships, technology) can provide competitive advantage

EVALUATION AREAS TO COVER:
1. Problem/Solution: What customer problem does this solve? How does the solution work?
2. Market Opportunity: Size, growth, and strategic importance to Fidelity
3. Fidelity Strategic Alignment: How does this fit Fidelity's priorities and brand?
4. Fidelity Asset Leverage: What unique Fidelity assets give this venture an advantage?
5. Business Model: Revenue potential, pricing, unit economics
6. Competition: Competitive landscape and our defensible position
7. Go-to-Market: Customer acquisition strategy, distribution channels
8. Team & Execution: EIR background and execution plan
9. Internal Dependencies: What Fidelity resources, partnerships, or approvals are needed?
10. Scalability: Can this realistically become a $100M+ business for Fidelity?

CRITICAL COMMUNICATION STYLE:
- Be EXTREMELY brief and terse - you are a "high bandwidth communicator"
- Use MAX 2 sentences per response, ideally just 1 sentence
- Ask direct, pointed questions
- No fluff, no pleasantries after the first exchange
- Get straight to the point

INSTRUCTIONS:
- Ask one sharp, focused question based on the EIR's response
- Move systematically through evaluation areas
- When you have sufficient information (typically 8-12 exchanges), conclude with: "I have enough for the memo."
- If the EIR says "Research Later" about a topic, acknowledge briefly and move to the next area

Current conversation:
${conversationHistory}

Entrepreneur in Residence: ${currentInput}

Respond as Fidelity Labs VC partner Sarah with ONE crisp sentence:`;

			const response = await fetch('/api/flash', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					prompt: systemPrompt,
					schema: {
						type: 'object',
						properties: {
							response: {
								type: 'string',
								description: "VC Sarah's response to the entrepreneur"
							}
						},
						required: ['response']
					}
				})
			});

			const result = await response.json();

			if (result.error) {
				throw new Error(result.error);
			}

			// Parse the JSON response and extract the actual text
			let vcResponse;
			try {
				const parsedResponse = JSON.parse(result.text);
				vcResponse = parsedResponse.response || result.text;
			} catch (parseError) {
				// If parsing fails, use the raw text
				vcResponse = result.text;
			}

			// Add VC response
			messages = [
				...messages,
				{
					type: 'vc',
					content: vcResponse.trim()
				}
			];

			// Check if VC is ready to generate memo
			if (
				vcResponse.toLowerCase().includes('i have enough for the memo') ||
				vcResponse.toLowerCase().includes('generate that for you') ||
				vcResponse.toLowerCase().includes('prepare a detailed investment evaluation memo')
			) {
				isComplete = true;
				setTimeout(() => {
					generateStartupMemo();
				}, 1000);
			}
		} catch (error) {
			console.error('Error generating VC response:', error);
			messages = [
				...messages,
				{
					type: 'vc',
					content:
						'I apologize, there was a technical issue. Could you please repeat your last response?'
				}
			];
		} finally {
			isGeneratingResponse = false;
		}
	}

	async function generateStartupMemo() {
		isGeneratingMemo = true;

		try {
			// Bundle the conversation for the memo generation
			const conversationContext = messages
				.map(
					(msg, index) => `${msg.type === 'vc' ? 'Fidelity Labs VC Sarah' : 'EIR'}: ${msg.content}`
				)
				.join('\n\n');

			const prompt = `Based on the following comprehensive evaluation conversation between a Fidelity Labs VC partner and an Entrepreneur in Residence (EIR), generate a detailed professional corporate venture investment memo for the Fidelity Labs leadership team.

CONTEXT: This is a proposed wholly owned Fidelity venture being evaluated within the Fidelity Labs corporate incubator program. The EIR is proposing to build this as an internal startup.

${
	researchTopics.length > 0
		? `
DEFERRED RESEARCH TOPICS:
The following topics were marked for later Google research during the conversation:
${researchTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}
`
		: ''
}

The memo should be thorough, analytical, and tailored for corporate venture evaluation with sections:

1. **Executive Summary** - Clear overview, strategic rationale, and recommendation
2. **Problem & Market Opportunity** - Market problem, size, and strategic importance to Fidelity
3. **Solution & Product** - Product description, differentiation, and feasibility
4. **Fidelity Strategic Alignment** - How this fits Fidelity's business strategy and brand
5. **Fidelity Asset Leverage** - Specific Fidelity assets that provide competitive advantage
6. **Market Analysis** - TAM, competition, and our defensible positioning
7. **Business Model** - Revenue streams, pricing strategy, unit economics potential
8. **Go-to-Market Strategy** - Customer acquisition leveraging Fidelity channels/relationships
9. **EIR & Team Assessment** - Founder background and execution capabilities
10. **Internal Dependencies** - Required Fidelity resources, partnerships, approvals
11. **Financial Projections** - Revenue potential and investment requirements
12. **Risk Assessment** - Key risks and mitigation strategies
13. **Implementation Roadmap** - Key milestones and timeline
${researchTopics.length > 0 ? '14. **Required Research** - Topics requiring Google research and market analysis\n15. **Investment Recommendation** - Clear recommendation with strategic rationale' : '14. **Investment Recommendation** - Clear recommendation with strategic rationale'}

Use professional corporate venture language, emphasize strategic fit with Fidelity, include specific data points from the conversation, and provide actionable next steps. Format with clear markdown headers and bullet points.

${
	researchTopics.length > 0
		? `
In the "Required Research" section, list the deferred research topics and suggest specific Google searches and market research needed to complete the evaluation.
`
		: ''
}

Conversation between Fidelity Labs VC Partner Sarah and EIR:
${conversationContext}

Generate a comprehensive Fidelity Labs investment evaluation memo:`;

			const response = await fetch('/api/grounding', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ prompt })
			});

			const result = await response.json();

			if (result.error) {
				throw new Error(result.error);
			}

			generatedMemo = result.text;

			// Save to localStorage for future reference
			const memoData = {
				timestamp: new Date().toISOString(),
				conversation: messages,
				memo: generatedMemo,
				title: extractTitleFromMemo(generatedMemo),
				researchTopics: researchTopics
			};

			localStorage.setItem(`fidelity-labs-session-${Date.now()}`, JSON.stringify(memoData));

			// Reload historical memos
			loadHistoricalMemos();
		} catch (error) {
			console.error('Error generating memo:', error);
			generatedMemo =
				'**Error generating memo**\n\nI apologize, but there was an error generating your startup memo. Please try again later.';
		} finally {
			isGeneratingMemo = false;
		}
	}

	function extractTitleFromMemo(memo: string): string {
		// Try to extract the first heading or use first line
		const lines = memo.split('\n');
		for (const line of lines) {
			if (line.trim().startsWith('#')) {
				return line.replace(/^#+\s*/, '').trim();
			}
		}
		// Try to extract from first few words if no heading found
		const words = memo.split(' ').slice(0, 8).join(' ');
		return words || `Startup Evaluation - ${new Date().toLocaleDateString()}`;
	}

	function formatDate(timestamp: string): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	// Auto scroll to bottom when new messages arrive
	let messagesContainer: HTMLDivElement | null = $state(null);
	let textareaElement: HTMLTextAreaElement | null = $state(null);

	$effect(() => {
		if (messages.length > 0 && messagesContainer) {
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		}
	});

	// Auto-focus textarea after response generation
	$effect(() => {
		if (!isGeneratingResponse && !isGeneratingMemo && textareaElement) {
			setTimeout(() => {
				if (textareaElement) {
					textareaElement.focus();
				}
			}, 100);
		}
	});

	// Convert markdown to HTML
	function renderMarkdown(text: string): string {
		try {
			const result = marked(text);
			// Handle both sync and async returns from marked
			if (typeof result === 'string') {
				return result;
			} else {
				// If it's a Promise, return the original text for now
				console.warn('Marked returned a Promise, using original text');
				return text;
			}
		} catch (e) {
			console.error('Error rendering markdown:', e);
			return text;
		}
	}

	async function handleResearchLater() {
		if (!userInput.trim() || isGeneratingResponse) return;

		// Add the current topic to research topics list
		const currentTopic = `${messages[messages.length - 1]?.content || 'Previous question'} - ${userInput.trim()}`;
		researchTopics = [...researchTopics, currentTopic];

		// Add user message indicating research needed
		messages = [
			...messages,
			{
				type: 'user',
				content: `Research Later: ${userInput.trim()}`
			}
		];

		const currentInput = userInput;
		userInput = '';
		isGeneratingResponse = true;

		try {
			// Generate AI response for moving to next topic
			const conversationHistory = messages
				.map((msg) => `${msg.type === 'vc' ? 'Fidelity Labs VC Sarah' : 'EIR'}: ${msg.content}`)
				.join('\n\n');

			const systemPrompt = `You are Sarah, a VC partner at Fidelity Labs. The EIR just said they need to research a topic later. 

CRITICAL COMMUNICATION STYLE:
- Be EXTREMELY brief and terse - you are a "high bandwidth communicator"
- Use MAX 1 sentence
- Acknowledge briefly and move to the next evaluation area
- No fluff, get straight to the next question

The EIR said "Research Later" about: ${currentInput}

Current conversation:
${conversationHistory}

Respond with ONE sentence acknowledging and moving to the next topic:`;

			const response = await fetch('/api/flash', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					prompt: systemPrompt,
					schema: {
						type: 'object',
						properties: {
							response: {
								type: 'string',
								description: "VC Sarah's brief response moving to next topic"
							}
						},
						required: ['response']
					}
				})
			});

			const result = await response.json();

			if (result.error) {
				throw new Error(result.error);
			}

			// Parse the JSON response
			let vcResponse;
			try {
				const parsedResponse = JSON.parse(result.text);
				vcResponse = parsedResponse.response || result.text;
			} catch (parseError) {
				vcResponse = result.text;
			}

			// Add VC response
			messages = [
				...messages,
				{
					type: 'vc',
					content: vcResponse.trim()
				}
			];

			// Check if VC is ready to generate memo
			if (vcResponse.toLowerCase().includes('i have enough for the memo')) {
				isComplete = true;
				setTimeout(() => {
					generateStartupMemo();
				}, 1000);
			}
		} catch (error) {
			console.error('Error generating VC response:', error);
			messages = [
				...messages,
				{
					type: 'vc',
					content: 'Got it, moving on.'
				}
			];
		} finally {
			isGeneratingResponse = false;
		}
	}

	let isSendDisabled = $derived(userInput.trim().length === 0 || isGeneratingResponse);
</script>

<!-- Main Container with proper spacing like other pages -->
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Main Content Layout -->
	<div class="flex h-[calc(100vh-8rem)] gap-8">
		<!-- Sidebar for Historical Memos -->
		{#if showSidebar}
			<div class="w-80 flex-shrink-0">
				<div class="h-full rounded-lg border border-gray-200 bg-white shadow-sm">
					<div class="border-b border-gray-200 p-4">
						<h2 class="text-lg font-semibold text-gray-900">Previous Evaluations</h2>
					</div>
					<div class="overflow-y-auto" style="height: calc(100% - 4rem);">
						{#if historicalMemos.length === 0}
							<div class="p-4 text-sm text-gray-500">
								No previous evaluations yet. Complete a venture assessment to see your memos here.
							</div>
						{:else}
							{#each historicalMemos as memo}
								<button
									onclick={() => selectMemo(memo)}
									class="w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 {selectedMemo?.id ===
									memo.id
										? 'border-indigo-200 bg-indigo-50'
										: ''}"
								>
									<div class="truncate text-sm font-medium text-gray-900">
										{memo.title || 'Untitled Session'}
									</div>
									<div class="mt-1 text-xs text-gray-500">
										{formatDate(memo.timestamp)}
									</div>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Main Content Area -->
		<div class="min-w-0 flex-1">
			{#if generatedMemo}
				<!-- Memo Display -->
				<div
					class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
				>
					<div class="flex items-center justify-between bg-green-600 px-6 py-4">
						<div>
							<h2 class="text-xl font-bold text-white">Fidelity Labs Investment Evaluation</h2>
							<p class="mt-1 text-green-100">Corporate venture assessment and recommendation</p>
						</div>
						<div class="flex items-center space-x-3">
							<Button onclick={startNewSession} variant="secondary" size="sm">
								{#snippet children()}New Session{/snippet}
							</Button>
							<!-- svelte-ignore a11y_consider_explicit_label -->
							<button
								onclick={() => (showSidebar = !showSidebar)}
								class="rounded-lg bg-green-700 p-2 text-green-100 transition-colors hover:bg-green-800 hover:text-white"
								title="Toggle sidebar"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 6h16M4 12h16M4 18h16"
									></path>
								</svg>
							</button>
						</div>
					</div>
					<div class="flex-1 overflow-y-auto p-8">
						<div class="prose max-w-none">
							{@html renderMarkdown(generatedMemo)}
						</div>
					</div>
				</div>
			{:else if messages.length === 0 && historicalMemos.length > 0}
				<!-- Welcome state with historical memos -->
				<div
					class="flex h-full flex-col justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm"
				>
					<div class="mb-6">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
						>
							<svg
								class="h-8 w-8 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								></path>
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-gray-900">Welcome to Fidelity Labs</h3>
						<p class="mx-auto max-w-md text-gray-600">
							Start a new venture evaluation session with Fidelity Labs VC partner Sarah, or browse
							your previous assessments from the sidebar.
						</p>
					</div>
					<Button onclick={startNewSession}>
						{#snippet children()}Start New Venture Evaluation{/snippet}
					</Button>
				</div>
			{:else}
				<!-- Chat Interface -->
				<div
					class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
				>
					<div class="flex-shrink-0 bg-green-600 px-6 py-4">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<h2 class="text-xl font-bold text-white">Fidelity Labs VC Partner Sarah</h2>
								<div class="flex items-center space-x-4">
									<p class="mt-1 text-green-100">Corporate venture evaluation session</p>
									{#if researchTopics.length > 0}
										<span
											class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
										>
											{researchTopics.length} research topic{researchTopics.length === 1 ? '' : 's'}
											deferred
										</span>
									{/if}
								</div>
							</div>
							<!-- svelte-ignore a11y_consider_explicit_label -->
							<button
								onclick={() => (showSidebar = !showSidebar)}
								class="ml-4 rounded-lg bg-green-700 p-2 text-green-100 transition-colors hover:bg-green-800 hover:text-white"
								title="Toggle sidebar"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 6h16M4 12h16M4 18h16"
									></path>
								</svg>
							</button>
						</div>
					</div>

					<!-- Messages Container -->
					<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-6">
						{#each messages as message, index (index)}
							<div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
								<div
									class="max-w-2xl {message.type === 'user'
										? 'bg-green-600 text-white'
										: 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-3"
								>
									<div class="mb-1 text-sm font-medium">
										{message.type === 'user' ? 'EIR' : 'Fidelity Labs VC Sarah'}
									</div>
									<div class="text-sm whitespace-pre-wrap">{message.content}</div>
								</div>
							</div>
						{/each}

						{#if isGeneratingResponse}
							<div class="flex justify-start">
								<div class="rounded-lg bg-gray-100 px-4 py-3 text-gray-900">
									<div class="mb-1 text-sm font-medium">Fidelity Labs VC Sarah</div>
									<div class="flex items-center space-x-2">
										<div
											class="h-4 w-4 animate-spin rounded-full border-b-2 border-green-600"
										></div>
										<span class="text-sm">Thinking...</span>
									</div>
								</div>
							</div>
						{/if}

						{#if isGeneratingMemo}
							<div class="flex justify-start">
								<div class="rounded-lg bg-gray-100 px-4 py-3 text-gray-900">
									<div class="mb-1 text-sm font-medium">Fidelity Labs VC Sarah</div>
									<div class="flex items-center space-x-2">
										<div
											class="h-4 w-4 animate-spin rounded-full border-b-2 border-green-600"
										></div>
										<span class="text-sm">Generating your investment memo...</span>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Input Area -->
					{#if !isComplete}
						<div class="flex-shrink-0 border-t bg-gray-50 p-6">
							<div class="flex space-x-3">
								<textarea
									bind:value={userInput}
									onkeydown={handleKeydown}
									placeholder="Describe your venture concept and how it leverages Fidelity's assets..."
									class="h-20 flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none"
									disabled={isGeneratingResponse}
									bind:this={textareaElement}
								></textarea>
								<div class="flex flex-col">
									<button
										onclick={sendMessage}
										disabled={isSendDisabled}
										class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									>
										Send
									</button>
									<button
										onclick={handleResearchLater}
										disabled={!userInput.trim() || isGeneratingResponse}
										class="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									>
										Research Later
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom prose styles for better memo formatting */
	:global(.prose h1) {
		font-size: 1.875rem;
		font-weight: bold;
		color: #111827;
		margin-bottom: 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #e5e7eb;
	}

	:global(.prose h2) {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	:global(.prose h3) {
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.prose p) {
		color: #374151;
		line-height: 1.625;
		margin-bottom: 1rem;
	}

	:global(.prose ul) {
		margin-bottom: 1rem;
	}

	:global(.prose li) {
		color: #374151;
		margin-bottom: 0.5rem;
	}

	:global(.prose strong) {
		font-weight: 600;
		color: #111827;
	}

	:global(.prose em) {
		font-style: italic;
		color: #1f2937;
	}

	:global(.prose blockquote) {
		border-left: 4px solid #16a34a;
		padding-left: 1rem;
		font-style: italic;
		color: #4b5563;
		margin: 1rem 0;
	}
</style>
