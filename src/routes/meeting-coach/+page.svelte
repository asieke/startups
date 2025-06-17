<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	// Type definitions
	interface SpeakerGrade {
		speaker: string;
		grades: {
			clarity: string;
			engagement: string;
			professionalism: string;
			structure: string;
			persuasiveness: string;
		};
		overallGrade: string;
		wordCount: number;
		speakingTimePercentage: number;
		pace: string;
		paceGrade: string;
		fillerWordCount: number;
		fillerWordScore: string;
		keyInsights: string[];
	}

	interface CoachingReport {
		id: string;
		timestamp: string;
		transcript: string;
		conversationName: string;
		speakerGrades: SpeakerGrade[];
		generalInsights: string;
		keyTakeaways: string[];
		improvementAreas: string[];
		fullReport: string;
	}

	// State
	let transcriptInput = $state('');
	let isAnalyzing = $state(false);
	let currentReport = $state<CoachingReport | null>(null);
	let historicalReports = $state<CoachingReport[]>([]);
	let selectedReport = $state<CoachingReport | null>(null);
	let showSidebar = $state(true);

	// Filler words list for counting
	const fillerWords = [
		'um', 'uh', 'ah', 'er', 'like', 'you know', 'actually', 'basically', 'literally', 'so',
		'well', 'right', 'okay', 'alright', 'hmm', 'mmm', 'yeah', 'yep', 'sure', 'totally',
		'absolutely', 'definitely', 'obviously', 'clearly', 'honestly', 'frankly', 'really',
		'quite', 'pretty', 'very', 'sort of', 'kind of', 'I mean', 'you see', 'you get'
	];

	// Initialize
	onMount(() => {
		loadHistoricalReports();
	});

	function loadHistoricalReports() {
		const reports: CoachingReport[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('meeting-coach-report-')) {
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
		historicalReports = reports.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	}

	function startNewAnalysis() {
		selectedReport = null;
		currentReport = null;
		transcriptInput = '';
		isAnalyzing = false;
	}

	function selectReport(report: CoachingReport) {
		selectedReport = report;
		currentReport = report;
	}

	function deleteReport(reportId: string, event: Event) {
		event.stopPropagation();

		if (
			confirm('Are you sure you want to delete this coaching report? This action cannot be undone.')
		) {
			localStorage.removeItem(reportId);

			if (selectedReport?.id === reportId) {
				selectedReport = null;
				currentReport = null;
			}

			loadHistoricalReports();
		}
	}

	function countFillerWords(text: string): number {
		if (!text || text.trim().length === 0) return 0;
		
		const textLower = text.toLowerCase();
		let count = 0;
		
		// First check for multi-word filler phrases and mark their positions
		const multiWordFillers = ['you know', 'i mean', 'you see', 'you get', 'sort of', 'kind of'];
		let markedText = textLower;
		const phraseMatches: Array<{start: number, end: number}> = [];
		
		for (const phrase of multiWordFillers) {
			const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
			let match;
			while ((match = regex.exec(textLower)) !== null) {
				phraseMatches.push({start: match.index, end: match.index + match[0].length});
				count++;
			}
		}
		
		// Sort phrase matches by position
		phraseMatches.sort((a, b) => a.start - b.start);
		
		// Now check individual words, but skip those that are part of multi-word phrases
		const words = textLower.split(/\s+/);
		let currentPos = 0;
		
		for (const word of words) {
			const cleanWord = word.replace(/[^\w]/g, '');
			if (cleanWord && fillerWords.includes(cleanWord)) {
				// Check if this word is part of a multi-word phrase we already counted
				const wordStart = textLower.indexOf(cleanWord, currentPos);
				const wordEnd = wordStart + cleanWord.length;
				
				let isPartOfPhrase = false;
				for (const phrase of phraseMatches) {
					if (wordStart >= phrase.start && wordEnd <= phrase.end) {
						isPartOfPhrase = true;
						break;
					}
				}
				
				if (!isPartOfPhrase) {
					count++;
				}
			}
			currentPos = textLower.indexOf(word, currentPos) + word.length;
		}
		
		// Debug logging
		console.log(`Filler word count for text (${text.split(/\s+/).length} words):`, count);
		console.log('Text sample:', text.substring(0, 100) + '...');
		
		return count;
	}

	function calculateFillerWordScore(fillerCount: number, wordCount: number): string {
		const ratio = fillerCount / wordCount;
		if (ratio < 0.02) return 'A';
		if (ratio < 0.04) return 'B';
		if (ratio < 0.06) return 'C';
		if (ratio < 0.08) return 'D';
		return 'F';
	}

	function calculatePaceGrade(speakingTimePercentage: number, pace: string): string {
		// Grade based on both time allocation and pace
		let score = 0;
		
		// Time allocation scoring (40% of grade)
		if (speakingTimePercentage >= 30 && speakingTimePercentage <= 60) {
			score += 40; // Excellent balance
		} else if (speakingTimePercentage >= 20 && speakingTimePercentage <= 70) {
			score += 32; // Good balance
		} else if (speakingTimePercentage >= 15 && speakingTimePercentage <= 80) {
			score += 24; // Adequate balance
		} else if (speakingTimePercentage >= 10 && speakingTimePercentage <= 90) {
			score += 16; // Poor balance
		} else {
			score += 8; // Very poor balance
		}
		
		// Pace scoring (60% of grade)
		const paceNormalized = pace.toLowerCase();
		if (paceNormalized === 'normal') {
			score += 60; // Excellent pace
		} else if (paceNormalized === 'slow') {
			score += 36; // Slow but manageable
		} else if (paceNormalized === 'fast') {
			score += 24; // Too fast
		} else {
			score += 30; // Unknown, give average
		}
		
		// Convert to letter grade
		if (score >= 90) return 'A';
		if (score >= 80) return 'B';
		if (score >= 70) return 'C';
		if (score >= 60) return 'D';
		return 'F';
	}

	function extractConversationName(transcript: string): string {
		// Try to identify the main topic or purpose from the transcript
		const lines = transcript.split('\n').slice(0, 10); // First 10 lines
		const words = transcript.split(' ').slice(0, 100); // First 100 words
		
		// Look for common meeting indicators
		const meetingKeywords = [
			'meeting', 'call', 'discussion', 'interview', 'presentation', 'pitch',
			'standup', 'review', 'planning', 'sync', 'demo', 'client', 'sales'
		];
		
		for (const line of lines) {
			for (const keyword of meetingKeywords) {
				if (line.toLowerCase().includes(keyword)) {
					// Extract a short phrase around the keyword
					const wordIndex = line.toLowerCase().indexOf(keyword);
					const start = Math.max(0, wordIndex - 20);
					const end = Math.min(line.length, wordIndex + 50);
					const phrase = line.substring(start, end).trim();
					return phrase || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Discussion`;
				}
			}
		}
		
		// Fallback: use first few words or current date
		const firstWords = words.slice(0, 8).join(' ');
		return firstWords || `Meeting - ${new Date().toLocaleDateString()}`;
	}

	async function analyzeTranscript() {
		if (!transcriptInput.trim() || isAnalyzing) return;

		isAnalyzing = true;

		try {
			// Generate conversation name
			const conversationName = extractConversationName(transcriptInput);

			const analysisPrompt = `You are an expert communication coach analyzing a meeting transcript. Provide a comprehensive coaching report card using the EXACT grading rubric below.

TRANSCRIPT TO ANALYZE:
${transcriptInput}

ANALYSIS REQUIREMENTS:

1. IDENTIFY SPEAKERS: Parse who is speaking in the conversation (look for patterns like "Speaker 1:", "John:", etc. or infer from context)

2. GRADE EACH SPEAKER using this EXACT RUBRIC (A-F):

**CLARITY RUBRIC:**
- A: Clear pronunciation, no mumbling, easy to understand, well-articulated
- B: Mostly clear with minor pronunciation issues, generally easy to follow
- C: Some unclear speech patterns, occasional difficulty understanding
- D: Frequently unclear, mumbling, hard to follow
- F: Very difficult to understand, poor articulation

**ENGAGEMENT RUBRIC:**
- A: Actively participates, asks questions, responds thoughtfully, shows genuine interest
- B: Good participation, responds when prompted, shows interest
- C: Moderate engagement, some responses but limited initiative
- D: Minimal engagement, rare participation, seems disinterested
- F: No meaningful engagement, completely passive

**PROFESSIONALISM RUBRIC:**
- A: Highly professional tone, appropriate language, respectful, courteous
- B: Generally professional with minor lapses, appropriate most of the time
- C: Adequate professionalism, some informal language but acceptable
- D: Below professional standards, inappropriate language or tone
- F: Unprofessional, inappropriate, disrespectful

**STRUCTURE RUBRIC:**
- A: Highly organized thoughts, logical flow, clear beginning/middle/end
- B: Well-structured with minor tangents, mostly logical progression
- C: Some organization but occasional rambling or unclear connections
- D: Poor structure, frequent tangents, hard to follow logic
- F: No clear structure, completely disorganized

**PERSUASIVENESS RUBRIC:**
- A: Compelling arguments, strong evidence, convincing delivery
- B: Good arguments with some supporting evidence, generally convincing
- C: Adequate points but lacking strong evidence or conviction
- D: Weak arguments, little evidence, not convincing
- F: No persuasive elements, unclear or unconvincing points

3. CALCULATE QUANTITATIVE METRICS:
- Count approximate words spoken by each speaker
- Estimate speaking time percentage for each speaker
- Note speaking pace (fast/normal/slow) based on word density

4. PROVIDE COACHING INSIGHTS for each speaker including:
- Specific strengths demonstrated
- Areas for improvement
- Communication patterns observed

5. OVERALL MEETING ANALYSIS:
- General insights about the conversation dynamics
- Key takeaways for improving future meetings
- Specific improvement areas for the group

CRITICAL: Use the EXACT rubric above. Do not deviate from these grading criteria. Be consistent and deterministic.

Return your analysis in the following JSON format:
{
  "speakerGrades": [
    {
      "speaker": "Speaker Name/ID",
      "grades": {
        "clarity": "A-F",
        "engagement": "A-F", 
        "professionalism": "A-F",
        "structure": "A-F",
        "persuasiveness": "A-F"
      },
      "overallGrade": "A-F",
      "wordCount": 123,
      "speakingTimePercentage": 45,
      "pace": "normal/fast/slow",
      "keyInsights": ["insight 1", "insight 2", ...]
    }
  ],
  "generalInsights": "Overall analysis paragraph",
  "keyTakeaways": ["takeaway 1", "takeaway 2", ...],
  "improvementAreas": ["area 1", "area 2", ...]
}

Provide detailed, actionable coaching feedback based strictly on the rubric above.`;

			const response = await fetch('/api/pro', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ prompt: analysisPrompt })
			});

			const result = await response.json();

			if (result.error) {
				throw new Error(result.error);
			}

			// Parse the AI response
			let analysisData;
			try {
				analysisData = JSON.parse(result.text);
			} catch (parseError) {
				console.error('Error parsing analysis:', parseError);
				throw new Error('Failed to parse coaching analysis');
			}

			// Process speaker sections and count filler words
			const speakerSections = extractSpeakerSections(transcriptInput);
			console.log('AI returned speakers:', analysisData.speakerGrades.map((g: any) => g.speaker));
			
			const processedGrades = analysisData.speakerGrades.map((grade: any) => {
				// Try to find matching speaker text with flexible matching
				let speakerText = '';
				const gradeSpeaker = grade.speaker.toLowerCase().trim();
				
				// Try exact match first
				if (speakerSections[grade.speaker]) {
					speakerText = speakerSections[grade.speaker];
					console.log(`Exact match found for "${grade.speaker}"`);
				} else {
					// Try flexible matching
					for (const [sectionSpeaker, text] of Object.entries(speakerSections)) {
						const sectionSpeakerLower = sectionSpeaker.toLowerCase().trim();
						if (
							sectionSpeakerLower === gradeSpeaker ||
							sectionSpeakerLower.includes(gradeSpeaker) ||
							gradeSpeaker.includes(sectionSpeakerLower) ||
							sectionSpeakerLower.replace(/[^\w\s]/g, '') === gradeSpeaker.replace(/[^\w\s]/g, '') ||
							// Try partial matching for cases like "Speaker 1" vs "Speaker1"
							sectionSpeakerLower.replace(/\s+/g, '') === gradeSpeaker.replace(/\s+/g, '') ||
							// Try matching just the name part
							sectionSpeakerLower.split(' ')[0] === gradeSpeaker.split(' ')[0]
						) {
							speakerText = text;
							console.log(`Flexible match found: "${grade.speaker}" -> "${sectionSpeaker}"`);
							break;
						}
					}
					if (!speakerText) {
						console.log(`No match found for speaker: "${grade.speaker}"`);
						console.log('Available speakers:', Object.keys(speakerSections));
						// Try one more fuzzy match - look for any speaker containing digits if grade speaker has digits
						const gradeHasDigits = /\d/.test(gradeSpeaker);
						if (gradeHasDigits) {
							for (const [sectionSpeaker, text] of Object.entries(speakerSections)) {
								if (/\d/.test(sectionSpeaker.toLowerCase())) {
									speakerText = text;
									console.log(`Digit-based match found: "${grade.speaker}" -> "${sectionSpeaker}"`);
									break;
								}
							}
						}
					}
				}
				
				// Calculate filler words
				const fillerCount = countFillerWords(speakerText);
				const actualWordCount = speakerText ? speakerText.split(/\s+/).filter(word => word.length > 0).length : 0;
				const fillerScore = actualWordCount > 0 ? calculateFillerWordScore(fillerCount, actualWordCount) : 'N/A';
				
				// Calculate pace grade based on speaking time percentage and pace
				const paceGrade = calculatePaceGrade(grade.speakingTimePercentage, grade.pace);

				console.log(`Speaker "${grade.speaker}": ${actualWordCount} words, ${fillerCount} fillers, score: ${fillerScore}`);

				return {
					...grade,
					paceGrade: paceGrade,
					fillerWordCount: fillerCount,
					fillerWordScore: fillerScore
				};
			});

			// Generate full report for display
			const fullReport = generateFullReport(analysisData, processedGrades, conversationName);

			// Create coaching report
			const report: CoachingReport = {
				id: `meeting-coach-report-${Date.now()}`,
				timestamp: new Date().toISOString(),
				transcript: transcriptInput,
				conversationName: conversationName,
				speakerGrades: processedGrades,
				generalInsights: analysisData.generalInsights,
				keyTakeaways: analysisData.keyTakeaways,
				improvementAreas: analysisData.improvementAreas,
				fullReport: fullReport
			};

			currentReport = report;

			// Save to localStorage
			localStorage.setItem(report.id, JSON.stringify(report));
			loadHistoricalReports();

		} catch (error) {
			console.error('Analysis failed:', error);
			alert('Failed to analyze transcript. Please try again.');
		} finally {
			isAnalyzing = false;
		}
	}

	function extractSpeakerSections(transcript: string): Record<string, string> {
		const sections: Record<string, string> = {};
		const lines = transcript.split('\n');
		let currentSpeaker = '';
		let currentText = '';

		for (const line of lines) {
			// Look for speaker indicators (Speaker:, Name:, etc.) - more flexible patterns
			const speakerMatch = line.match(/^([A-Za-z0-9\s]+?):\s*(.*)$/) || 
							   line.match(/^([A-Za-z0-9\s]+?)\s*-\s*(.*)$/) ||
							   line.match(/^\[([A-Za-z0-9\s]+?)\]\s*(.*)$/);
			
			if (speakerMatch) {
				// Save previous speaker's text
				if (currentSpeaker && currentText.trim()) {
					sections[currentSpeaker] = (sections[currentSpeaker] || '') + ' ' + currentText.trim();
				}
				
				// Start new speaker
				currentSpeaker = speakerMatch[1].trim();
				currentText = speakerMatch[2];
			} else if (currentSpeaker && line.trim()) {
				// Continue with current speaker if line has content
				currentText += ' ' + line.trim();
			}
		}

		// Save last speaker
		if (currentSpeaker && currentText.trim()) {
			sections[currentSpeaker] = (sections[currentSpeaker] || '') + ' ' + currentText.trim();
		}

		// Debug logging
		console.log('Extracted speaker sections:', sections);
		console.log('Speaker names:', Object.keys(sections));

		return sections;
	}

	function generateFullReport(analysisData: any, speakerGrades: SpeakerGrade[], conversationName: string): string {
		let report = `# Meeting Coaching Report: ${conversationName}\n\n`;
		report += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

		report += `## Executive Summary\n\n${analysisData.generalInsights}\n\n`;

		report += `## Individual Speaker Analysis\n\n`;

		for (const speaker of speakerGrades) {
			report += `### ${speaker.speaker}\n\n`;
			report += `**Overall Grade: ${speaker.overallGrade}**\n\n`;
			
			report += `**Performance Breakdown:**\n`;
			report += `- Clarity: ${speaker.grades.clarity}\n`;
			report += `- Engagement: ${speaker.grades.engagement}\n`;
			report += `- Professionalism: ${speaker.grades.professionalism}\n`;
			report += `- Structure: ${speaker.grades.structure}\n`;
			report += `- Persuasiveness: ${speaker.grades.persuasiveness}\n`;
			report += `- Pace: ${speaker.paceGrade}\n\n`;
			
			report += `**Quantitative Metrics:**\n`;
			report += `- Word Count: ${speaker.wordCount || 'N/A'}\n`;
			report += `- Speaking Time: ${speaker.speakingTimePercentage || 'N/A'}%\n`;
			report += `- Speaking Pace: ${speaker.pace || 'N/A'}\n\n`;
			
			report += `**Filler Word Analysis:**\n`;
			report += `- Filler Word Count: ${speaker.fillerWordCount}\n`;
			report += `- Filler Word Score: ${speaker.fillerWordScore}\n`;
			if (speaker.wordCount && speaker.fillerWordCount > 0) {
				const ratio = ((speaker.fillerWordCount / speaker.wordCount) * 100).toFixed(1);
				report += `- Filler Word Ratio: ${ratio}% of total words\n`;
			}
			report += `\n`;
			
			report += `**Key Insights:**\n`;
			for (const insight of speaker.keyInsights) {
				report += `- ${insight}\n`;
			}
			report += `\n`;
		}

		report += `## Key Takeaways\n\n`;
		for (const takeaway of analysisData.keyTakeaways) {
			report += `- ${takeaway}\n`;
		}

		report += `\n## Areas for Improvement\n\n`;
		for (const area of analysisData.improvementAreas) {
			report += `- ${area}\n`;
		}

		return report;
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
		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			analyzeTranscript();
		}
	}

	// Convert markdown to HTML
	function renderMarkdown(text: string): string {
		try {
			const result = marked(text);
			if (typeof result === 'string') {
				return result;
			} else {
				console.warn('Marked returned a Promise, using original text');
				return text;
			}
		} catch (e) {
			console.error('Error rendering markdown:', e);
			return text;
		}
	}

	let isAnalyzeDisabled = $derived(transcriptInput.trim().length === 0 || isAnalyzing);
</script>

<!-- Main Container with proper spacing like other pages -->
<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Main Content Layout -->
	<div class="flex h-[calc(100vh-8rem)] gap-8">
		<!-- Sidebar for Historical Reports -->
		{#if showSidebar}
			<div class="w-80 flex-shrink-0">
				<div class="h-full rounded-lg border border-gray-200 bg-white shadow-sm">
					<div class="border-b border-gray-200 p-4">
						<h2 class="text-lg font-semibold text-gray-900">Previous Reports</h2>
					</div>
					<div class="overflow-y-auto" style="height: calc(100% - 4rem);">
						{#if historicalReports.length === 0}
							<div class="p-4 text-sm text-gray-500">
								No previous coaching reports yet. Analyze your first call transcript to see reports here.
							</div>
						{:else}
							{#each historicalReports as report}
								<div class="border-b border-gray-100 {selectedReport?.id === report.id ? 'border-orange-200 bg-orange-50' : ''}">
									<button
										onclick={() => selectReport(report)}
										class="w-full p-4 text-left transition-colors hover:bg-gray-50"
									>
										<div class="truncate text-sm font-medium text-gray-900">
											{report.conversationName}
										</div>
										<div class="mt-1 text-xs text-gray-500">
											{formatDate(report.timestamp)}
										</div>
										<div class="mt-1 flex space-x-2">
											<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
												{report.speakerGrades.length} speaker{report.speakerGrades.length === 1 ? '' : 's'}
											</span>
										</div>
									</button>
									<div class="px-4 pb-2">
										<button
											onclick={(event) => deleteReport(report.id, event)}
											class="rounded bg-red-100 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-200"
										>
											Delete
										</button>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Main Content Area -->
		<div class="min-w-0 flex-1">
			{#if currentReport}
				<!-- Report Display -->
				<div
					class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
				>
					<div class="flex items-center justify-between bg-orange-600 px-6 py-4">
						<div>
							<h2 class="text-xl font-bold text-white">Meeting Coaching Report</h2>
							<p class="mt-1 text-orange-100">{currentReport.conversationName}</p>
						</div>
						<div class="flex items-center space-x-3">
							<button
								onclick={startNewAnalysis}
								class="rounded-md bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-colors duration-200 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
							>
								New Analysis
							</button>
							<!-- svelte-ignore a11y_consider_explicit_label -->
							<button
								onclick={() => (showSidebar = !showSidebar)}
								class="rounded-lg bg-orange-700 p-2 text-orange-100 transition-colors hover:bg-orange-800 hover:text-white"
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
							{@html renderMarkdown(currentReport.fullReport)}
						</div>
					</div>
				</div>
			{:else if historicalReports.length > 0 && !isAnalyzing}
				<!-- Welcome state with historical reports -->
				<div
					class="flex h-full flex-col justify-center rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm"
				>
					<div class="mb-6">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100"
						>
							<svg
								class="h-8 w-8 text-orange-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
								></path>
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-gray-900">Welcome to Meeting Coach</h3>
						<p class="mx-auto max-w-md text-gray-600">
							Upload a new call transcript for AI-powered coaching analysis, or browse your previous 
							coaching reports from the sidebar.
						</p>
					</div>
					<button
						onclick={startNewAnalysis}
						class="font-semibold bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-200 focus:outline-none px-4 py-2 text-sm rounded-lg transition-colors duration-200"
					>
						Start New Analysis
					</button>
				</div>
			{:else}
				<!-- Transcript Upload Interface -->
				<div
					class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
				>
					<div class="flex items-center justify-between bg-orange-600 px-6 py-4">
						<div>
							<h2 class="text-xl font-bold text-white">Meeting Coach</h2>
							<p class="mt-1 text-orange-100">Upload transcript for AI coaching analysis</p>
						</div>
						{#if historicalReports.length > 0}
							<!-- svelte-ignore a11y_consider_explicit_label -->
							<button
								onclick={() => (showSidebar = !showSidebar)}
								class="rounded-lg bg-orange-700 p-2 text-orange-100 transition-colors hover:bg-orange-800 hover:text-white"
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
						{/if}
					</div>

					{#if isAnalyzing}
						<!-- Analysis Progress -->
						<div class="flex flex-1 flex-col items-center justify-center p-8">
							<div
								class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100"
							>
								<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-600"></div>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-gray-900">Analyzing Transcript</h3>
							<p class="text-gray-600">
								AI coach is analyzing speaking patterns, grading performance, and counting filler words...
							</p>
						</div>
					{:else}
						<!-- Transcript Input -->
						<div class="flex flex-1 flex-col p-6">
							<div class="mb-4">
								<label for="transcript" class="block text-sm font-medium text-gray-700 mb-2">
									Call Transcript
								</label>
								<p class="text-sm text-gray-500 mb-4">
									Paste your call transcript below. Include speaker names (e.g., "John: Hello everyone") for best results.
								</p>
							</div>
							
							<textarea
								id="transcript"
								bind:value={transcriptInput}
								onkeydown={handleKeydown}
								placeholder="Speaker 1: Hello everyone, thanks for joining today's call.
Speaker 2: Thanks for having me. I'm excited to discuss...
Speaker 1: Great! Let's start with..."
								class="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-orange-500 focus:outline-none"
								disabled={isAnalyzing}
							></textarea>
							
							<div class="mt-6 flex items-center justify-between">
								<div class="text-sm text-gray-500">
									Press Ctrl+Enter to analyze, or click the button below
								</div>
								<button
									onclick={analyzeTranscript}
									disabled={isAnalyzeDisabled}
									class="font-semibold bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 px-4 py-2 text-sm rounded-lg transition-colors duration-200"
								>
									{#if isAnalyzing}
										<div class="flex items-center space-x-2">
											<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
											<span>Analyzing...</span>
										</div>
									{:else}
										Analyze Transcript
									{/if}
								</button>
							</div>
						</div>
					{/if}
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
</style>