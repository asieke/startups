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

	// VC Questions - exactly 20 as specified
	const VC_QUESTIONS = [
		"What is the problem you are solving?",
		"Who is the target customer?",
		"Why is this problem urgent or important for them?",
		"How are they solving it today?",
		"What makes your solution better or different?",
		"What is your product or service concept?",
		"Will customers pay to solve this problem?",
		"How much do you think they would pay?",
		"How many customers exist (TAM)?",
		"Is this a one-time, subscription, or usage-based model?",
		"What is your estimated customer acquisition cost (CAC)?",
		"What channels would you use to acquire customers?",
		"Who are the main competitors or alternatives?",
		"What's your moat or defensibility?",
		"Why is now the right time to build this?",
		"What is the fastest way to test or prototype this?",
		"What Fidelity assets give us an advantage (data, brand, relationships, etc.)?",
		"Are there internal dependencies or blockers inside Fidelity?",
		"Does this align with Fidelity's strategy and brand?",
		"Could this realistically be a $100M+ business?"
	];

	// Chat state
	let currentQuestionIndex = $state(0);
	let messages = $state<Message[]>([]);
	let userInput = $state('');
	let isComplete = $state(false);
	let isGeneratingMemo = $state(false);
	let generatedMemo = $state('');
	
	// Historical memos state
	let historicalMemos = $state<MemoData[]>([]);
	let selectedMemo = $state<MemoData | null>(null);
	let showSidebar = $state(true);

	// Determine if we're in active chat mode
	let isActiveChatMode = $derived(!isComplete && !selectedMemo && messages.length > 0);

	// Initialize with first question
	$effect(() => {
		if (messages.length === 0 && !selectedMemo) {
			messages = [{
				type: 'vc',
				content: `Hello! I'm a VC partner and I'd like to understand your startup idea. I have 20 questions that will help us both evaluate the potential of your business. Let's start:\n\n${VC_QUESTIONS[0]}`
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
			if (key?.startsWith('vc-session-')) {
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
		currentQuestionIndex = 0;
		messages = [{
			type: 'vc',
			content: `Hello! I'm a VC partner and I'd like to understand your startup idea. I have 20 questions that will help us both evaluate the potential of your business. Let's start:\n\n${VC_QUESTIONS[0]}`
		}];
		userInput = '';
		isComplete = false;
		isGeneratingMemo = false;
		generatedMemo = '';
	}

	function selectMemo(memo: MemoData) {
		selectedMemo = memo;
		// Reset chat state when viewing historical memo
		isComplete = true;
		generatedMemo = memo.memo;
		messages = memo.conversation || [];
	}

	function sendMessage() {
		if (!userInput.trim()) return;

		// Add user message
		messages = [...messages, {
			type: 'user',
			content: userInput.trim()
		}];

		// Move to next question or finish
		currentQuestionIndex++;
		
		if (currentQuestionIndex < VC_QUESTIONS.length) {
			// Add next VC question
			setTimeout(() => {
				messages = [...messages, {
					type: 'vc',
					content: VC_QUESTIONS[currentQuestionIndex]
				}];
			}, 500);
		} else {
			// All questions done
			isComplete = true;
			setTimeout(() => {
				messages = [...messages, {
					type: 'vc',
					content: "Excellent! That completes our evaluation session. I'm now generating a comprehensive startup memo based on our conversation..."
				}];
				generateStartupMemo();
			}, 500);
		}

		userInput = '';
	}

	function handleDontKnow() {
		messages = [...messages, {
			type: 'user',
			content: "I don't know"
		}];

		currentQuestionIndex++;
		
		if (currentQuestionIndex < VC_QUESTIONS.length) {
			setTimeout(() => {
				messages = [...messages, {
					type: 'vc',
					content: `That's okay. Let's move on to the next question:\n\n${VC_QUESTIONS[currentQuestionIndex]}`
				}];
			}, 500);
		} else {
			isComplete = true;
			setTimeout(() => {
				messages = [...messages, {
					type: 'vc',
					content: "That completes our evaluation session. I'm now generating a comprehensive startup memo based on our conversation..."
				}];
				generateStartupMemo();
			}, 500);
		}
	}

	function handleHelpWithResearch() {
		messages = [...messages, {
			type: 'user',
			content: "Help with Research"
		}];

		setTimeout(() => {
			messages = [...messages, {
				type: 'vc',
				content: `I understand you'd like help researching this aspect. For now, let's continue with what you know and we can revisit this during the memo generation. Moving to the next question:\n\n${VC_QUESTIONS[currentQuestionIndex + 1] || "That was our final question."}`
			}];
		}, 500);

		currentQuestionIndex++;
		
		if (currentQuestionIndex >= VC_QUESTIONS.length) {
			isComplete = true;
			setTimeout(() => {
				generateStartupMemo();
			}, 1000);
		}
	}

	async function generateStartupMemo() {
		isGeneratingMemo = true;
		
		try {
			// Bundle the conversation for the grounding endpoint
			const conversationContext = messages
				.map((msg, index) => `${msg.type === 'vc' ? 'VC' : 'Entrepreneur'}: ${msg.content}`)
				.join('\n\n');

			const prompt = `Based on the following VC evaluation session with an entrepreneur, generate a comprehensive 2-page startup memo that outlines the business described. The memo should be professional, analytical, and follow standard VC memo format with sections for:

1. Executive Summary
2. Problem & Opportunity
3. Solution & Product
4. Market & Competition
5. Business Model
6. Go-to-Market Strategy
7. Team & Execution
8. Financial Projections
9. Risks & Mitigation
10. Investment Recommendation

Here is the conversation:

${conversationContext}

Please format this as a professional startup evaluation memo that a VC would present to their investment committee. Use markdown formatting for headers, lists, and emphasis. Start with a clear title that captures the business concept.`;

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
			
			localStorage.setItem(`vc-session-${Date.now()}`, JSON.stringify(memoData));
			
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
		if (messagesContainer && messages.length > 0 && !isComplete) {
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
						<h2 class="text-lg font-semibold text-gray-900">Historical Memos</h2>
					</div>
					<div class="overflow-y-auto" style="height: calc(100% - 4rem);">
						{#if historicalMemos.length === 0}
							<div class="p-4 text-gray-500 text-sm">
								No previous sessions yet. Complete a session to see your memos here.
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
							<h2 class="text-xl font-bold text-white">Startup Evaluation Memo</h2>
							<p class="text-green-100 mt-1">Professional investment analysis</p>
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
						<div class="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
							<svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">Welcome to VC Validation</h3>
						<p class="text-gray-600 max-w-md mx-auto">
							Start a new validation session to evaluate your startup idea, or browse your previous evaluations from the sidebar.
						</p>
					</div>
					<Button onclick={startNewSession}>
						{#snippet children()}Start New Validation Session{/snippet}
					</Button>
				</div>
			{:else}
				<!-- Chat Interface -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
					<div class="bg-indigo-600 px-6 py-4 flex-shrink-0">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<h2 class="text-xl font-bold text-white">VC Partner Discussion</h2>
								<p class="text-indigo-100 mt-1">Professional startup evaluation session</p>
							</div>
							<button 
								onclick={() => showSidebar = !showSidebar}
								class="rounded-lg bg-indigo-700 p-2 text-indigo-100 hover:bg-indigo-800 hover:text-white transition-colors ml-4"
								title="Toggle sidebar"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
								</svg>
							</button>
						</div>
						
						<!-- Progress Bar in header -->
						{#if isActiveChatMode}
							<div class="mt-3">
								<div class="flex items-center justify-between text-sm text-indigo-200 mb-2">
									<span>Progress</span>
									<span>Question {currentQuestionIndex + 1} of {VC_QUESTIONS.length}</span>
								</div>
								<div class="bg-indigo-700 h-2 rounded-full">
									<div 
										class="bg-white h-2 rounded-full transition-all duration-300" 
										style="width: {((currentQuestionIndex + 1) / VC_QUESTIONS.length) * 100}%"
									></div>
								</div>
							</div>
						{/if}
					</div>
					
					<!-- Messages Container -->
					<div 
						bind:this={messagesContainer}
						class="flex-1 overflow-y-auto p-6 space-y-4"
					>
						{#each messages as message, index (index)}
							<div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
								<div class="max-w-lg {message.type === 'user' 
									? 'bg-indigo-600 text-white' 
									: 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">
										{message.type === 'user' ? 'You' : 'VC Partner'}
									</div>
									<div class="whitespace-pre-wrap text-sm">{message.content}</div>
								</div>
							</div>
						{/each}

						{#if isGeneratingMemo}
							<div class="flex justify-start">
								<div class="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">VC Partner</div>
									<div class="flex items-center space-x-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
										<span class="text-sm">Generating your startup memo...</span>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Input Area -->
					{#if !isComplete}
						<div class="border-t bg-gray-50 p-6 flex-shrink-0">
							<div class="flex flex-col space-y-4">
								<!-- Text Input -->
								<div class="flex space-x-3">
									<textarea
										bind:value={userInput}
										onkeydown={handleKeydown}
										placeholder="Type your answer here..."
										class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
										rows="3"
									></textarea>
									<Button onclick={sendMessage} disabled={!userInput.trim()}>
										{#snippet children()}Send{/snippet}
									</Button>
								</div>

								<!-- Action Buttons -->
								<div class="flex space-x-3">
									<Button variant="outline" onclick={handleDontKnow}>
										{#snippet children()}I Don't Know{/snippet}
									</Button>
									<Button variant="outline" onclick={handleHelpWithResearch}>
										{#snippet children()}Help with Research{/snippet}
									</Button>
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
		border-left: 4px solid #6366f1;
		padding-left: 1rem;
		font-style: italic;
		color: #4b5563;
		margin: 1rem 0;
	}
</style>