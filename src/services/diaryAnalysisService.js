import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DiaryAnalysisService
 *
 * This service calls the Python LangChain module to analyze diary entries
 * using CBT (Cognitive Behavioral Therapy) or MBT (Mentalization-Based Therapy) approaches.
 */
export class DiaryAnalysisService {
    /**
     * Analyze diary entries using the Python LangChain module.
     *
     * @param {Array} entries - Array of diary entry objects with entryDate, mood, content
     * @param {string} mode - Analysis mode: 'cbt' or 'mbt'
     * @param {string} provider - LLM provider: 'gemini' or 'anthropic'
     * @returns {Promise<Object>} Analysis result from the LLM
     */
    static async analyzeDiaries(entries, mode = 'cbt', provider = 'gemini') {
        return new Promise((resolve, reject) => {
            const pythonDir = path.resolve(__dirname, '../../python');
            const pythonScript = path.join(pythonDir, 'diary_analyzer.py');
            const uvPath = 'uv';

            // Serialize entries to JSON
            const entriesJson = JSON.stringify(entries);

            // Spawn Python process using uv run
            const pythonProcess = spawn(uvPath, [
                'run',
                'python',
                pythonScript,
                '--entries', entriesJson,
                '--mode', mode,
                '--provider', provider
            ], {
                cwd: pythonDir,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1'
                }
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python process error:', stderr);
                    reject(new Error(`Analysis failed: ${stderr || 'Unknown error'}`));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseError) {
                    console.error('Failed to parse Python output:', stdout);
                    reject(new Error('Failed to parse analysis result'));
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(new Error(`Failed to start analysis: ${error.message}`));
            });
        });
    }

    /**
     * Validate if the user is eligible for diary analysis.
     * Analysis is only accessible every 30 days per user.
     *
     * @param {Date} lastAnalysisDate - The date of the user's last analysis
     * @returns {Object} { eligible: boolean, daysRemaining: number }
     */
    static checkAnalysisEligibility(lastAnalysisDate) {
        if (!lastAnalysisDate) {
            return { eligible: true, daysRemaining: 0 };
        }

        const now = new Date();
        const lastAnalysis = new Date(lastAnalysisDate);
        const diffTime = now - lastAnalysis;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const ANALYSIS_INTERVAL_DAYS = 30;

        if (diffDays >= ANALYSIS_INTERVAL_DAYS) {
            return { eligible: true, daysRemaining: 0 };
        }

        return {
            eligible: false,
            daysRemaining: ANALYSIS_INTERVAL_DAYS - diffDays
        };
    }
}

export default DiaryAnalysisService;
