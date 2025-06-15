<script lang="ts">
	import Button from '$lib/components/Button.svelte';

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
	let messages = $state([]);
	let userInput = $state('');
	let isComplete = $state(false);
	let isGeneratingMemo = $state(false);
	let generatedMemo = $state('');

	// Initialize with first question
	$effect(() => {
		if (messages.length === 0) {
			messages = [{
				type: 'vc',
				content: `Hello! I'm a VC partner and I'd like to understand your startup idea. I have 20 questions that will help us both evaluate the potential of your business. Let's start:\n\n${VC_QUESTIONS[0]}`
			}];
		}
	});

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

Please format this as a professional startup evaluation memo that a VC would present to their investment committee.`;

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
				memo: generatedMemo
			};
			
			localStorage.setItem(`vc-session-${Date.now()}`, JSON.stringify(memoData));
			
			// Show completion message
			messages = [...messages, {
				type: 'vc',
				content: "Perfect! I've generated your startup memo and saved it for future reference. You can view it below."
			}];

		} catch (error) {
			console.error('Error generating memo:', error);
			messages = [...messages, {
				type: 'vc',
				content: "I apologize, but there was an error generating your startup memo. Please try again later."
			}];
		} finally {
			isGeneratingMemo = false;
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	// Auto scroll to bottom when new messages arrive
	let messagesContainer;
	$effect(() => {
		if (messagesContainer && messages.length > 0) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 100);
		}
	});
</script>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="bg-white rounded-xl shadow-lg overflow-hidden">
			<!-- Header -->
			<div class="bg-indigo-600 px-6 py-4">
				<h1 class="text-2xl font-bold text-white">VC Validation Session</h1>
				<p class="text-indigo-100 mt-1">
					{#if !isComplete}
						Question {currentQuestionIndex + 1} of {VC_QUESTIONS.length}
					{:else}
						Session Complete
					{/if}
				</p>
			</div>

			<!-- Progress Bar -->
			{#if !isComplete}
				<div class="bg-gray-200 h-2">
					<div 
						class="bg-indigo-600 h-2 transition-all duration-300" 
						style="width: {((currentQuestionIndex + 1) / VC_QUESTIONS.length) * 100}%"
					></div>
				</div>
			{/if}

			<!-- Messages Container -->
			<div 
				bind:this={messagesContainer}
				class="h-96 overflow-y-auto p-6 space-y-4"
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
				<div class="border-t bg-gray-50 p-6">
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

		<!-- Generated Memo Display -->
		{#if generatedMemo}
			<div class="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
				<div class="bg-green-600 px-6 py-4">
					<h2 class="text-2xl font-bold text-white">Generated Startup Memo</h2>
					<p class="text-green-100 mt-1">Professional investment evaluation based on your session</p>
				</div>
				<div class="p-6">
					<div class="prose max-w-none">
						<pre class="whitespace-pre-wrap font-sans text-gray-900 leading-relaxed">{generatedMemo}</pre>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>