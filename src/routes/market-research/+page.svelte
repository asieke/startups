<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	// Type definitions
	interface ResearchReport {
		id: string;
		timestamp: string;
		topic: string;
		subtopics: string[];
		researchSections: Record<string, string>;
		finalReport: string;
		title: string;
	}

	// Research state
	let researchInput = $state('');
	let isResearching = $state(false);
	let currentStep = $state<'subtopics' | 'searching' | 'assembling' | 'complete' | null>(null);
	let currentSubtopic = $state('');
	let progress = $state(0);
	let maxProgress = $state(100);
	
	// Research data
	let currentTopic = $state('');
	let subtopics = $state<string[]>([]);
	let researchSections = $state<Record<string, string>>({});
	let finalReport = $state('');
	
	// Historical reports state
	let historicalReports = $state<ResearchReport[]>([]);
	let selectedReport = $state<ResearchReport | null>(null);
	let showSidebar = $state(true);

	// Load historical reports from localStorage
	onMount(() => {
		loadHistoricalReports();
	});

	function loadHistoricalReports() {
		const reports: ResearchReport[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('market-research-report-')) {
				try {
					const data = JSON.parse(localStorage.getItem(key) || '');
					reports.push({
						id: key,
						...data
					});
				} catch (e) {
					console.error('Error parsing report:', e);
				}
			}
		}
		// Sort by timestamp, newest first
		historicalReports = reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}

	function startNewResearch() {
		selectedReport = null;
		researchInput = '';
		isResearching = false;
		currentStep = null;
		currentSubtopic = '';
		progress = 0;
		currentTopic = '';
		subtopics = [];
		researchSections = {};
		finalReport = '';
	}

	function selectReport(report: ResearchReport) {
		selectedReport = report;
		currentTopic = report.topic;
		subtopics = report.subtopics;
		researchSections = report.researchSections;
		finalReport = report.finalReport;
		currentStep = 'complete';
	}

	function deleteReport(reportId: string, event: Event) {
		event.stopPropagation(); // Prevent selecting the report when clicking delete
		
		if (confirm('Are you sure you want to delete this research report? This action cannot be undone.')) {
			// Remove from localStorage
			localStorage.removeItem(reportId);
			
			// If this was the selected report, clear the selection
			if (selectedReport?.id === reportId) {
				selectedReport = null;
				startNewResearch();
			}
			
			// Reload the historical reports list
			loadHistoricalReports();
		}
	}

	async function conductResearch() {
		if (!researchInput.trim() || isResearching) return;

		currentTopic = researchInput.trim();
		researchInput = '';
		isResearching = true;
		currentStep = 'subtopics';
		progress = 0;
		maxProgress = 100;

		try {
			// Step 1: Generate subtopics
			await generateSubtopics(currentTopic);
			
			// Step 2: Research each subtopic
			currentStep = 'searching';
			await researchAllSubtopics(currentTopic, subtopics);
			
			// Step 3: Assemble final report
			currentStep = 'assembling';
			await assembleReport(currentTopic, researchSections);
			
			// Save to localStorage
			await saveReport();
			
			currentStep = 'complete';
		} catch (error) {
			console.error('Research failed:', error);
			finalReport = `**Research Failed**\n\nThere was an error conducting the research: ${(error as Error).message}`;
			currentStep = 'complete';
		} finally {
			isResearching = false;
		}
	}

	async function generateSubtopics(topic: string): Promise<void> {
		currentSubtopic = 'Breaking down research topic...';
		progress = 10;

		const prompt = `You are a research strategist. A user wants to research the following topic: "${topic}".

Break this into 8–12 distinct subtopics that are important to cover in a comprehensive competitive market analysis. Include detailed areas like:
- Market size and growth projections
- Current market trends and dynamics
- Key competitors and market leaders
- Emerging players and disruptors
- Business models and monetization strategies
- Regulatory landscape and compliance requirements
- Technology infrastructure and technical challenges
- User adoption and demographics
- Investment landscape and funding trends
- Key risks and market barriers
- Future opportunities and growth catalysts
- Geographic market variations

Return as a numbered list with brief descriptions for each subtopic.`;

		const response = await fetch('/api/pro', {
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

		// Parse subtopics from the response
		const subtopicLines = result.text
			.split('\n')
			.filter((line: string) => line.trim().match(/^\d+\./))
			.map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
			.filter((topic: string) => topic.length > 0);

		subtopics = subtopicLines;
		progress = 20;
	}

	async function researchAllSubtopics(topic: string, subtopicList: string[]): Promise<void> {
		const sections: Record<string, string> = {};
		const progressPerSubtopic = 60 / subtopicList.length; // 60% of total progress for research phase
		
		for (let i = 0; i < subtopicList.length; i++) {
			const subtopic = subtopicList[i];
			currentSubtopic = `Researching: ${subtopic}`;
			
			const sectionContent = await searchTopic(topic, subtopic);
			sections[subtopic] = sectionContent;
			
			progress = 20 + ((i + 1) * progressPerSubtopic);
		}
		
		researchSections = sections;
	}

	async function searchTopic(topic: string, subtopic: string): Promise<string> {
		const prompt = `You are an expert market researcher conducting comprehensive analysis. SEARCH GOOGLE extensively for current, factual information about the following aspect of ${topic}:

"${subtopic}"

INSTRUCTIONS:
- SEARCH GOOGLE thoroughly for the most recent data, reports, news, and developments
- Verify all statistics, company information, and market data through multiple sources
- Include specific numbers, dates, company names, and quantitative data where available
- Reference recent industry reports, news articles, and authoritative sources
- Focus on factual, verifiable information rather than speculation
- Include market sizing data, growth rates, key players, and recent developments
- Provide a detailed, analytical overview with concrete examples and data points

This research will be used in a formal market analysis report, so accuracy and depth are critical. Make sure to search for and include the most current information available.

Write your findings in a comprehensive, analytical tone with specific details and data points. Structure your response with clear subheadings and bullet points where appropriate.`;

		const response = await fetch('/api/grounding', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ 
				prompt,
				model: 'gemini-2.5-pro-preview-06-05'
			})
		});

		const result = await response.json();
		
		if (result.error) {
			throw new Error(result.error);
		}

		return result.text;
	}

	async function assembleReport(topic: string, sections: Record<string, string>): Promise<void> {
		currentSubtopic = 'Synthesizing comprehensive final report...';
		progress = 85;

		const sectionsText = Object.entries(sections)
			.map(([subtopic, content]) => `### ${subtopic}\n\n${content}`)
			.join('\n\n---\n\n');

		const prompt = `You are a senior research analyst creating a comprehensive market research report. Based on the detailed findings below about "${topic}", write a professional, in-depth market analysis report.

**IMPORTANT: Output the report in clean MARKDOWN format with proper headers, bullet points, and formatting.**

Structure your report with these sections:
# Market Research Report: ${topic}

## Executive Summary
Provide a 3-4 paragraph executive summary covering key findings, market size, major trends, and strategic recommendations.

## Market Overview & Size
Include specific market sizing data, growth rates, and market dynamics. Reference concrete numbers and sources where available.

## Competitive Landscape
Detailed analysis of key players, market leaders, emerging companies, market share data, and competitive positioning.

## Business Models & Revenue Streams
Comprehensive analysis of how companies monetize, pricing strategies, unit economics, and financial performance where available.

## Technology & Infrastructure
Technical requirements, infrastructure challenges, technological trends, and innovation drivers.

## Regulatory Environment
Current regulations, compliance requirements, regulatory trends, and jurisdiction-specific considerations.

## Market Trends & Drivers
Key trends driving growth, adoption patterns, user behavior, and market dynamics.

## Investment & Funding Landscape
Venture capital activity, funding rounds, valuation trends, and investor sentiment.

## Challenges & Risk Factors
Major risks, barriers to entry, market challenges, and potential threats.

## Geographic Analysis
Regional market variations, international expansion opportunities, and geographic trends.

## Future Outlook & Opportunities
Growth projections, emerging opportunities, potential market evolution, and strategic recommendations.

## Key Takeaways
Bullet-pointed summary of the most important insights and recommendations.

**Source Material:**
${sectionsText}

Write in a professional, analytical tone. Include specific data points, company names, numbers, and concrete examples throughout. Use proper markdown formatting with headers, bullet points, and emphasis where appropriate. Be comprehensive and detailed while maintaining clarity and readability.`;

		const response = await fetch('/api/grounding', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ 
				prompt,
				model: 'gemini-2.5-pro-preview-06-05'
			})
		});

		const result = await response.json();
		
		if (result.error) {
			throw new Error(result.error);
		}

		finalReport = result.text;
		progress = 100;
	}

	async function saveReport(): Promise<void> {
		const reportData = {
			timestamp: new Date().toISOString(),
			topic: currentTopic,
			subtopics: subtopics,
			researchSections: researchSections,
			finalReport: finalReport,
			title: extractTitleFromReport(finalReport) || currentTopic
		};
		
		localStorage.setItem(`market-research-report-${Date.now()}`, JSON.stringify(reportData));
		
		// Reload historical reports
		loadHistoricalReports();
	}

	function extractTitleFromReport(report: string): string {
		// Try to extract the first heading or use first line
		const lines = report.split('\n');
		for (const line of lines) {
			if (line.trim().startsWith('#')) {
				return line.replace(/^#+\s*/, '').trim();
			}
		}
		// Try to extract from first few words if no heading found
		const words = report.split(' ').slice(0, 8).join(' ');
		return words || `Market Research - ${new Date().toLocaleDateString()}`;
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
			conductResearch();
		}
	}

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

	// Progress bar calculation
	let progressPercentage = $derived(Math.round((progress / maxProgress) * 100));
</script>

<!-- Main Container with proper spacing like other pages -->
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Main Content Layout -->
	<div class="flex gap-8 h-[calc(100vh-8rem)]">
		<!-- Sidebar for Historical Reports -->
		{#if showSidebar}
			<div class="w-80 flex-shrink-0">
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
					<div class="p-4 border-b border-gray-200">
						<h2 class="text-lg font-semibold text-gray-900">Previous Research</h2>
					</div>
					<div class="overflow-y-auto" style="height: calc(100% - 4rem);">
						{#if historicalReports.length === 0}
							<div class="p-4 text-gray-500 text-sm">
								No previous research reports yet. Conduct your first market research to see reports here.
							</div>
						{:else}
							{#each historicalReports as report}
								<button
									onclick={() => selectReport(report)}
									class="w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors {selectedReport?.id === report.id ? 'bg-blue-50 border-blue-200' : ''}"
								>
									<div class="font-medium text-gray-900 text-sm truncate">
										{report.title || report.topic}
									</div>
									<div class="text-xs text-gray-500 mt-1">
										{formatDate(report.timestamp)}
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
			{#if finalReport && currentStep === 'complete'}
				<!-- Report Display -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
					<div class="bg-blue-600 px-6 py-4 flex items-center justify-between">
						<div>
							<h2 class="text-xl font-bold text-white">Market Research Report</h2>
						</div>
						<div class="flex items-center space-x-3">
							{#if selectedReport}
								<button
									onclick={(event) => deleteReport(selectedReport!.id, event)}
									class="rounded-lg bg-red-600 hover:bg-red-700 p-2 text-white transition-colors"
									title="Delete this report"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
									</svg>
								</button>
							{/if}
							<Button onclick={startNewResearch} variant="secondary" size="sm">
								{#snippet children()}New Research{/snippet}
							</Button>
							<button 
								onclick={() => showSidebar = !showSidebar}
								class="rounded-lg bg-blue-700 p-2 text-blue-100 hover:bg-blue-800 hover:text-white transition-colors"
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
							{@html renderMarkdown(finalReport)}
						</div>
					</div>
				</div>
			{:else if isResearching}
				<!-- Research Progress -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
					<div class="bg-blue-600 px-6 py-4">
						<h2 class="text-xl font-bold text-white">Conducting Market Research</h2>
						<p class="text-blue-100 mt-1">Researching: {currentTopic}</p>
					</div>
					<div class="flex-1 flex flex-col justify-center items-center p-8">
						<div class="w-full max-w-md">
							<!-- Progress Steps -->
							<div class="mb-8 flex justify-center space-x-4">
								<div class="flex flex-col items-center">
									<div class="w-10 h-10 rounded-full flex items-center justify-center {currentStep === 'subtopics' || currentStep === 'searching' || currentStep === 'assembling' || currentStep === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}">
										{#if currentStep === 'subtopics'}
											<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										{:else if currentStep === 'searching' || currentStep === 'assembling' || currentStep === 'complete'}
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
											</svg>
										{:else}
											1
										{/if}
									</div>
									<span class="text-xs mt-1 text-center">Break Down<br/>Topic</span>
								</div>
								<div class="flex flex-col items-center">
									<div class="w-10 h-10 rounded-full flex items-center justify-center {currentStep === 'searching' || currentStep === 'assembling' || currentStep === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}">
										{#if currentStep === 'searching'}
											<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										{:else if currentStep === 'assembling' || currentStep === 'complete'}
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
											</svg>
										{:else}
											2
										{/if}
									</div>
									<span class="text-xs mt-1 text-center">Research<br/>Subtopics</span>
								</div>
								<div class="flex flex-col items-center">
									<div class="w-10 h-10 rounded-full flex items-center justify-center {currentStep === 'assembling' || currentStep === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}">
										{#if currentStep === 'assembling'}
											<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										{:else if currentStep === 'complete'}
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
											</svg>
										{:else}
											3
										{/if}
									</div>
									<span class="text-xs mt-1 text-center">Assemble<br/>Report</span>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="mb-6">
								<div class="flex justify-between text-sm text-gray-600 mb-2">
									<span>Progress</span>
									<span>{progressPercentage}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-3">
									<div 
										class="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
										style="width: {progressPercentage}%"
									></div>
								</div>
							</div>

							<!-- Current Status -->
							<div class="text-center">
								<div class="text-lg font-semibold text-gray-900 mb-2">
									{#if currentStep === 'subtopics'}
										Breaking Down Research Topic
									{:else if currentStep === 'searching'}
										Researching Market Data
									{:else if currentStep === 'assembling'}
										Assembling Final Report
									{/if}
								</div>
								<div class="text-gray-600">
									{currentSubtopic}
								</div>
							</div>

							{#if subtopics.length > 0}
								<div class="mt-8">
									<h3 class="text-sm font-semibold text-gray-900 mb-3">Research Areas:</h3>
									<div class="space-y-2">
										{#each subtopics as subtopic, index}
											<div class="flex items-center text-sm">
												{#if currentStep === 'searching' && currentSubtopic.includes(subtopic)}
													<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
												{:else if researchSections[subtopic]}
													<svg class="w-3 h-3 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
													</svg>
												{:else}
													<div class="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
												{/if}
												<span class="{researchSections[subtopic] ? 'text-green-700' : 'text-gray-600'}">{subtopic}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else if historicalReports.length === 0}
				<!-- Welcome state with no historical reports -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center h-full flex flex-col justify-center">
					<div class="mb-6">
						<div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
							<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">Market Research Intelligence</h3>
						<p class="text-gray-600 max-w-md mx-auto mb-6">
							Get comprehensive market research reports on any topic. Our AI researches market trends, competitors, and industry insights in real-time.
						</p>
					</div>
					
					<!-- Research Input -->
					<div class="max-w-md mx-auto w-full">
						<div class="flex space-x-3">
							<input
								bind:value={researchInput}
								onkeydown={handleKeydown}
								placeholder="Enter research topic (e.g., prediction markets, AI tools, fintech...)"
								class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								disabled={isResearching}
							/>
							<Button onclick={conductResearch} disabled={!researchInput.trim() || isResearching}>
								{#snippet children()}Research{/snippet}
							</Button>
						</div>
					</div>
				</div>
			{:else}
				<!-- Welcome state with historical reports -->
				<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center h-full flex flex-col justify-center">
					<div class="mb-6">
						<div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
							<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">Market Research Intelligence</h3>
						<p class="text-gray-600 max-w-md mx-auto mb-6">
							Start a new market research project or browse your previous reports from the sidebar.
						</p>
					</div>
					
					<!-- Research Input -->
					<div class="max-w-md mx-auto w-full">
						<div class="flex space-x-3">
							<input
								bind:value={researchInput}
								onkeydown={handleKeydown}
								placeholder="Enter research topic (e.g., prediction markets, AI tools, fintech...)"
								class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								disabled={isResearching}
							/>
							<Button onclick={conductResearch} disabled={!researchInput.trim() || isResearching}>
								{#snippet children()}Research{/snippet}
							</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom prose styles for better report formatting */
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
		border-left: 4px solid #2563eb;
		padding-left: 1rem;
		font-style: italic;
		color: #4b5563;
		margin: 1rem 0;
	}
</style>
