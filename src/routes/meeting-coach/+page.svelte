<script lang="ts">
	import Button from '$lib/components/Button.svelte';
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
		const words = text.toLowerCase().split(/\s+/);
		let count = 0;
		
		for (const word of words) {
			const cleanWord = word.replace(/[^\w\s]/g, '');
			if (fillerWords.includes(cleanWord)) {
				count++;
			}
		}
		
		// Check for multi-word filler phrases
		const textLower = text.toLowerCase();
		const multiWordFillers = ['you know', 'i mean', 'you see', 'you get', 'sort of', 'kind of'];
		for (const phrase of multiWordFillers) {
			const matches = textLower.match(new RegExp(phrase, 'g'));
			if (matches) {
				count += matches.length;
			}
		}
		
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
		console.log('Analyze clicked');
	}

	function extractSpeakerSections(transcript: string): Record<string, string> {
		const sections: Record<string, string> = {};
		const lines = transcript.split('\n');
		let currentSpeaker = '';
		let currentText = '';

		for (const line of lines) {
			// Look for speaker indicators (Speaker:, Name:, etc.)
			const speakerMatch = line.match(/^([A-Za-z0-9\s]+?):\s*(.*)$/);
			
			if (speakerMatch) {
				// Save previous speaker's text
				if (currentSpeaker && currentText) {
					sections[currentSpeaker] = (sections[currentSpeaker] || '') + ' ' + currentText;
				}
				
				// Start new speaker
				currentSpeaker = speakerMatch[1].trim();
				currentText = speakerMatch[2];
			} else if (currentSpeaker) {
				// Continue with current speaker
				currentText += ' ' + line;
			}
		}

		// Save last speaker
		if (currentSpeaker && currentText) {
			sections[currentSpeaker] = (sections[currentSpeaker] || '') + ' ' + currentText;
		}

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
			report += `- Persuasiveness: ${speaker.grades.persuasiveness}\n\n`;
			
			report += `**Filler Word Analysis:**\n`;
			report += `- Count: ${speaker.fillerWordCount}\n`;
			report += `- Score: ${speaker.fillerWordScore}\n\n`;
			
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
	<h1 class="text-3xl font-bold text-gray-900 mb-8">Meeting Coach</h1>
	
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<h2 class="text-xl font-semibold mb-4">Upload Call Transcript</h2>
		
		<textarea
			bind:value={transcriptInput}
			placeholder="Paste your call transcript here..."
			class="w-full h-64 border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-orange-500 focus:outline-none"
		></textarea>
		
		<button
			onclick={analyzeTranscript}
			class="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
		>
			Analyze Transcript
		</button>
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