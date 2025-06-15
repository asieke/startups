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

Please format this as a professional startup evaluation memo that a VC would present to their investment committee. Use markdown formatting for headers, lists, and emphasis.`;

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
		return `Session ${new Date().toLocaleDateString()}`;
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

<!-- Fixed Layout Structure -->
<div class="h-screen bg-gray-50 flex flex-col">
	<!-- Fixed Header -->
	<div class="bg-indigo-600 px-6 py-4 flex-shrink-0">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-white">VC Validation Session</h1>
				<p class="text-indigo-100 mt-1">
					{#if selectedMemo}
						Historical Session - {formatDate(selectedMemo.timestamp)}
					{:else if !isComplete}
						Question {currentQuestionIndex + 1} of {VC_QUESTIONS.length}
					{:else if generatedMemo}
						Session Complete - Memo Generated
					{:else}
						Session Complete
					{/if}
				</p>
			</div>
			<div class="flex items-center space-x-4">
				{#if selectedMemo || (isComplete && generatedMemo)}
					<Button onclick={startNewSession} variant="secondary">
						{#snippet children()}New Session{/snippet}
					</Button>
				{/if}
				<button 
					onclick={() => showSidebar = !showSidebar}
					class="text-white hover:text-indigo-200 transition-colors"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
					</svg>
				</button>
			</div>
		</div>

		<!-- Progress Bar -->
		{#if !isComplete && !selectedMemo}
			<div class="bg-indigo-700 h-2 rounded-full mt-4">
				<div 
					class="bg-white h-2 rounded-full transition-all duration-300" 
					style="width: {((currentQuestionIndex + 1) / VC_QUESTIONS.length) * 100}%"
				></div>
			</div>
		{/if}
	</div>

	<!-- Main Content Area -->
	<div class="flex-1 flex overflow-hidden">
		<!-- Sidebar for Historical Memos -->
		{#if showSidebar}
			<div class="w-80 bg-white border-r border-gray-200 flex flex-col">
				<div class="p-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">Historical Memos</h2>
				</div>
				<div class="flex-1 overflow-y-auto">
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
		{/if}

		<!-- Main Content -->
		<div class="flex-1 flex flex-col">
			{#if generatedMemo}
				<!-- Memo Display -->
				<div class="flex-1 overflow-y-auto">
					<div class="max-w-4xl mx-auto p-6">
						<div class="bg-white rounded-xl shadow-lg overflow-hidden">
							<div class="bg-green-600 px-6 py-4">
								<h2 class="text-2xl font-bold text-white">Startup Evaluation Memo</h2>
								<p class="text-green-100 mt-1">Professional investment analysis</p>
							</div>
							<div class="p-8">
								<div class="prose prose-lg max-w-none">
									{@html renderMarkdown(generatedMemo)}
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- Chat Interface -->
				<div class="flex-1 flex flex-col">
					<!-- Messages Container -->
					<div 
						bind:this={messagesContainer}
						class="flex-1 overflow-y-auto p-6 space-y-4"
					>
						{#each messages as message, index (index)}
							<div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
								<div class="max-w-3xl {message.type === 'user' 
									? 'bg-indigo-600 text-white' 
									: 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">
										{message.type === 'user' ? 'You' : 'VC Partner'}
									</div>
									<div class="whitespace-pre-wrap">{message.content}</div>
								</div>
							</div>
						{/each}

						{#if isGeneratingMemo}
							<div class="flex justify-start">
								<div class="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
									<div class="text-sm font-medium mb-1">VC Partner</div>
									<div class="flex items-center space-x-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
										<span>Generating your startup memo...</span>
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
		@apply text-3xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200;
	}
	
	:global(.prose h2) {
		@apply text-2xl font-semibold text-gray-800 mt-8 mb-4;
	}
	
	:global(.prose h3) {
		@apply text-xl font-semibold text-gray-700 mt-6 mb-3;
	}
	
	:global(.prose p) {
		@apply text-gray-700 leading-relaxed mb-4;
	}
	
	:global(.prose ul) {
		@apply space-y-2 mb-4;
	}
	
	:global(.prose li) {
		@apply text-gray-700;
	}
	
	:global(.prose strong) {
		@apply font-semibold text-gray-900;
	}
	
	:global(.prose em) {
		@apply italic text-gray-800;
	}
	
	:global(.prose blockquote) {
		@apply border-l-4 border-indigo-500 pl-4 italic text-gray-600 my-4;
	}
</style>