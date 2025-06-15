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
	}

	// Chat state
	let messages = $state<Message[]>([]);
	let userInput = $state('');
	let isComplete = $state(false);
	let isGeneratingMemo = $state(false);
	let isGeneratingResponse = $state(false);
	let generatedMemo = $state('');
	
	// Historical memos state
	let historicalMemos = $state<MemoData[]>([]);
	let selectedMemo = $state<MemoData | null>(null);
	let showSidebar = $state(true);

	// Determine if we're in active chat mode
	let isActiveChatMode = $derived(!isComplete && !selectedMemo && messages.length > 0);

	// Initialize with first message
	$effect(() => {
		if (messages.length === 0 && !selectedMemo) {
			messages = [{
				type: 'vc',
				content: `Hello! I'm Sarah, a VC partner at Fidelity Labs, our corporate innovation incubator. I'm excited to work with you as one of our Entrepreneurs in Residence to evaluate your startup concept for potential development as a wholly owned Fidelity venture.

As we explore your idea, I'll be considering how it aligns with Fidelity's strategic priorities, leverages our unique assets, and fits within our innovation portfolio. Let's start with the fundamentals - what problem are you looking to solve, and how does your proposed solution address it?`
			}];
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
		historicalMemos = memos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}

	function startNewSession() {
		selectedMemo = null;
		messages = [{
			type: 'vc',
			content: `Hello! I'm Sarah, a VC partner at Fidelity Labs, our corporate innovation incubator. I'm excited to work with you as one of our Entrepreneurs in Residence to evaluate your startup concept for potential development as a wholly owned Fidelity venture.

As we explore your idea, I'll be considering how it aligns with Fidelity's strategic priorities, leverages our unique assets, and fits within our innovation portfolio. Let's start with the fundamentals - what problem are you looking to solve, and how does your proposed solution address it?`
		}];
		userInput = '';
		isComplete = false;
		isGeneratingMemo = false;
		isGeneratingResponse = false;
		generatedMemo = '';
	}

	function selectMemo(memo: MemoData) {
		selectedMemo = memo;
		// Reset chat state when viewing historical memo
		isComplete = true;
		generatedMemo = memo.memo;
		messages = memo.conversation || [];
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
			const conversationHistory = messages.map(msg => 
				`${msg.type === 'vc' ? 'Fidelity Labs VC Sarah' : 'EIR'}: ${msg.content}`
			).join('\n\n');

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

INSTRUCTIONS:
- Ask thoughtful, probing questions based on the EIR's responses
- Be encouraging but thorough in your evaluation
- Focus on corporate venture criteria, not traditional VC metrics
- When you have sufficient information (typically 8-12 exchanges), conclude with: "Thank you for this comprehensive discussion. I now have enough information to prepare a detailed investment evaluation memo for the Fidelity Labs leadership team. Let me generate that for you."
- Keep responses conversational and limit to 2-3 questions at a time

Current conversation:
${conversationHistory}

Entrepreneur in Residence: ${currentInput}

Respond as Fidelity Labs VC partner Sarah:`;

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
								description: 'VC Sarah\'s response to the entrepreneur'
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
			messages = [...messages, {
				type: 'vc',
				content: vcResponse.trim()
			}];

			// Check if VC is ready to generate memo
			if (vcResponse.toLowerCase().includes('investment evaluation memo for the fidelity labs leadership team') || 
				vcResponse.toLowerCase().includes('generate that for you') ||
				vcResponse.toLowerCase().includes('prepare a detailed investment evaluation memo')) {
				isComplete = true;
				setTimeout(() => {
					generateStartupMemo();
				}, 1000);
			}

		} catch (error) {
			console.error('Error generating VC response:', error);
			messages = [...messages, {
				type: 'vc',
				content: "I apologize, there was a technical issue. Could you please repeat your last response?"
			}];
		} finally {
			isGeneratingResponse = false;
		}
	}

	async function generateStartupMemo() {
		isGeneratingMemo = true;
		
		try {
			// Bundle the conversation for the memo generation
			const conversationContext = messages
				.map((msg, index) => `${msg.type === 'vc' ? 'Fidelity Labs VC Sarah' : 'EIR'}: ${msg.content}`)
				.join('\n\n');

			const prompt = `Based on the following comprehensive evaluation conversation between a Fidelity Labs VC partner and an Entrepreneur in Residence (EIR), generate a detailed professional corporate venture investment memo for the Fidelity Labs leadership team.

CONTEXT: This is a proposed wholly owned Fidelity venture being evaluated within the Fidelity Labs corporate incubator program. The EIR is proposing to build this as an internal startup.

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
14. **Investment Recommendation** - Clear recommendation with strategic rationale

Use professional corporate venture language, emphasize strategic fit with Fidelity, include specific data points from the conversation, and provide actionable next steps. Format with clear markdown headers and bullet points.

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
				title: extractTitleFromMemo(generatedMemo)
			};
			
			localStorage.setItem(`fidelity-labs-session-${Date.now()}`, JSON.stringify(memoData));
			
			// Reload historical memos
			loadHistoricalMemos();

		} catch (error) {
			console.error('Error generating memo:', error);
			generatedMemo = "**Error generating memo**\n\nI apologize, but there was an error generating your startup memo. Please try again later.";
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
	let messagesContainer: HTMLDivElement;
	$effect(() => {
		if (messagesContainer && messages.length > 0) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
</script>

<!-- Main Container with proper spacing like other pages -->
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Main Content Layout -->
	<div class="flex gap-8 h-[calc(100vh-8rem)]">
		<!-- Sidebar for Historical Memos -->
		{#if showSidebar}
			<div class="w-80 flex-shrink-0">
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
					<div class="p-4 border-b border-gray-200">
						<h2 class="text-lg font-semibold text-gray-900">Previous Evaluations</h2>
					</div>
					<div class="overflow-y-auto" style="height: calc(100% - 4rem);">
						{#if historicalMemos.length === 0}
							<div class="p-4 text-gray-500 text-sm">
								No previous evaluations yet. Complete a venture assessment to see your memos here.
							</div>
						{:else}
							{#each historicalMemos as memo}
								<button
									onclick={() => selectMemo(memo)}
									class="w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors {selectedMemo?.id === memo.id ? 'bg-indigo-50 border-indigo-200' : ''}"
								>
									<div class="font-medium text-gray-900 text-sm truncate">
										{memo.title || 'Untitled Session'}
									</div>
									<div class="text-xs text-gray-500 mt-1">
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
		<div class="flex-1 min-w-0">
			{#if generatedMemo}
				<!-- Memo Display -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
					<div class="bg-green-600 px-6 py-4 flex items-center justify-between">
						<div>
							<h2 class="text-xl font-bold text-white">Fidelity Labs Investment Evaluation</h2>
							<p class="text-green-100 mt-1">Corporate venture assessment and recommendation</p>
						</div>
						<div class="flex items-center space-x-3">
							<Button onclick={startNewSession} variant="secondary" size="sm">
								{#snippet children()}New Session{/snippet}
							</Button>
							<button 
								onclick={() => showSidebar = !showSidebar}
								class="rounded-lg bg-green-700 p-2 text-green-100 hover:bg-green-800 hover:text-white transition-colors"
								title="Toggle sidebar"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
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
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center h-full flex flex-col justify-center">
					<div class="mb-6">
						<div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
							<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">Welcome to Fidelity Labs</h3>
						<p class="text-gray-600 max-w-md mx-auto">
							Start a new venture evaluation session with Fidelity Labs VC partner Sarah, or browse your previous assessments from the sidebar.
						</p>
					</div>
					<Button onclick={startNewSession}>
						{#snippet children()}Start New Venture Evaluation{/snippet}
					</Button>
				</div>
			{:else}
				<!-- Chat Interface -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
					<div class="bg-green-600 px-6 py-4 flex-shrink-0">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<h2 class="text-xl font-bold text-white">Fidelity Labs VC Partner Sarah</h2>
								<p class="text-green-100 mt-1">Corporate venture evaluation session</p>
							</div>
							<button 
								onclick={() => showSidebar = !showSidebar}
								class="rounded-lg bg-green-700 p-2 text-green-100 hover:bg-green-800 hover:text-white transition-colors ml-4"
								title="Toggle sidebar"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
								</svg>
							</button>
						</div>
					</div>
					
					<!-- Messages Container -->
					<div 
						bind:this={messagesContainer}
						class="flex-1 overflow-y-auto p-6 space-y-4"
					>
						{#each messages as message, index (index)}
							<div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
								<div class="max-w-2xl {message.type === 'user' 
									? 'bg-green-600 text-white' 
									: 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">
										{message.type === 'user' ? 'EIR' : 'Fidelity Labs VC Sarah'}
									</div>
									<div class="whitespace-pre-wrap text-sm">{message.content}</div>
								</div>
							</div>
						{/each}

						{#if isGeneratingResponse}
							<div class="flex justify-start">
								<div class="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">Fidelity Labs VC Sarah</div>
									<div class="flex items-center space-x-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
										<span class="text-sm">Thinking...</span>
									</div>
								</div>
							</div>
						{/if}

						{#if isGeneratingMemo}
							<div class="flex justify-start">
								<div class="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">Fidelity Labs VC Sarah</div>
									<div class="flex items-center space-x-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
										<span class="text-sm">Generating your investment memo...</span>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Input Area -->
					{#if !isComplete}
						<div class="border-t bg-gray-50 p-6 flex-shrink-0">
							<div class="flex space-x-3">
								<textarea
									bind:value={userInput}
									onkeydown={handleKeydown}
									placeholder="Describe your venture concept and how it leverages Fidelity's assets..."
									class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
									rows="3"
									disabled={isGeneratingResponse}
								></textarea>
								<Button onclick={sendMessage} disabled={!userInput.trim() || isGeneratingResponse}>
									{#snippet children()}Send{/snippet}
								</Button>
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