#!/usr/bin/env python3
"""
Diary Analyzer Module using LangChain

This module analyzes user diary entries using LLM (Gemini or Claude)
with CBT (Cognitive Behavioral Therapy) or MBT (Mentalization-Based Therapy) approaches.

Usage:
    python diary_analyzer.py --entries '<JSON entries>' --mode cbt|mbt [--provider gemini|anthropic]
"""

import argparse
import json
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser


def get_llm(provider: str = "gemini"):
    """Get the LLM based on provider selection."""
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-sonnet-4-20250514",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            temperature=0.7,
        )
    else:
        # Default to Gemini
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.7,
        )


CBT_PROMPT = """You are a compassionate mental health assistant trained in Cognitive Behavioral Therapy (CBT).

Analyze the following diary entries from the past 30 days and provide insights based on CBT principles:

1. **Thought Patterns**: Identify recurring cognitive distortions (e.g., catastrophizing, black-and-white thinking, overgeneralization)
2. **Mood Trends**: Analyze the emotional patterns and their triggers
3. **Behavioral Patterns**: Note any connections between activities and mood changes
4. **Positive Observations**: Highlight strengths and positive coping mechanisms observed
5. **CBT Recommendations**: Provide specific, actionable CBT-based suggestions for improvement

Diary Entries:
{entries}

Respond in JSON format with the following structure:
{{
    "summary": "Brief overall summary of the analysis",
    "thought_patterns": ["pattern1", "pattern2", ...],
    "mood_trends": {{
        "overall_trend": "improving/declining/stable",
        "common_emotions": ["emotion1", "emotion2", ...],
        "triggers": ["trigger1", "trigger2", ...]
    }},
    "behavioral_patterns": ["pattern1", "pattern2", ...],
    "positive_observations": ["observation1", "observation2", ...],
    "recommendations": [
        {{
            "title": "Recommendation title",
            "description": "Detailed description",
            "exercise": "Specific CBT exercise to try"
        }}
    ],
    "risk_level": "low/moderate/high",
    "follow_up_suggested": true/false
}}

Be empathetic and constructive. If you detect signs of severe distress or risk, set risk_level appropriately."""


MBT_PROMPT = """You are a compassionate mental health assistant trained in Mentalization-Based Therapy (MBT).

Analyze the following diary entries from the past 30 days and provide insights based on MBT principles:

1. **Self-Reflection Capacity**: Assess the user's ability to understand their own mental states
2. **Emotional Awareness**: Evaluate how well the user identifies and names their emotions
3. **Interpersonal Patterns**: Analyze how the user perceives others' mental states and intentions
4. **Attachment Patterns**: Note any recurring themes in relationships and emotional regulation
5. **Mentalization Recommendations**: Provide suggestions to enhance mentalizing abilities

Diary Entries:
{entries}

Respond in JSON format with the following structure:
{{
    "summary": "Brief overall summary of the analysis",
    "self_reflection": {{
        "capacity_level": "developing/adequate/strong",
        "observations": ["observation1", "observation2", ...]
    }},
    "emotional_awareness": {{
        "identified_emotions": ["emotion1", "emotion2", ...],
        "emotional_vocabulary_richness": "limited/moderate/rich",
        "emotional_regulation": "struggling/developing/stable"
    }},
    "interpersonal_patterns": ["pattern1", "pattern2", ...],
    "attachment_observations": ["observation1", "observation2", ...],
    "recommendations": [
        {{
            "title": "Recommendation title",
            "description": "Detailed description",
            "exercise": "Specific MBT exercise to try"
        }}
    ],
    "risk_level": "low/moderate/high",
    "follow_up_suggested": true/false
}}

Be empathetic and supportive. Focus on enhancing the user's ability to understand both their own and others' mental states."""


def format_entries(entries: list) -> str:
    """Format diary entries for the prompt."""
    formatted = []
    for entry in entries:
        date = entry.get("entryDate", "Unknown date")
        if isinstance(date, str) and "T" in date:
            date = date.split("T")[0]
        mood = entry.get("mood", "Unknown")
        content = entry.get("content", "")
        formatted.append(f"Date: {date}\nMood: {mood}\nContent: {content}\n---")
    return "\n".join(formatted)


def analyze_diary(entries: list, mode: str = "cbt", provider: str = "gemini") -> dict:
    """
    Analyze diary entries using CBT or MBT approach.

    Args:
        entries: List of diary entry dictionaries with 'entryDate', 'mood', 'content'
        mode: 'cbt' for Cognitive Behavioral Therapy or 'mbt' for Mentalization-Based Therapy
        provider: 'gemini' or 'anthropic' for LLM provider

    Returns:
        Dictionary containing the analysis results
    """
    if not entries:
        return {
            "error": "No diary entries provided for analysis",
            "summary": "Unable to perform analysis without diary entries.",
            "risk_level": "unknown",
            "follow_up_suggested": False
        }

    # Select prompt based on mode
    prompt_template = CBT_PROMPT if mode.lower() == "cbt" else MBT_PROMPT

    # Format entries
    formatted_entries = format_entries(entries)

    # Create the chain
    llm = get_llm(provider)
    prompt = ChatPromptTemplate.from_template(prompt_template)
    parser = JsonOutputParser()

    chain = prompt | llm | parser

    try:
        result = chain.invoke({"entries": formatted_entries})
        result["analysis_mode"] = mode.upper()
        result["analyzed_entries_count"] = len(entries)
        result["analysis_date"] = datetime.now().isoformat()
        return result
    except Exception as e:
        return {
            "error": str(e),
            "summary": "Analysis failed due to an error.",
            "risk_level": "unknown",
            "follow_up_suggested": True,
            "analysis_mode": mode.upper(),
            "analyzed_entries_count": len(entries),
            "analysis_date": datetime.now().isoformat()
        }


def main():
    parser = argparse.ArgumentParser(description="Analyze diary entries using LangChain")
    parser.add_argument("--entries", type=str, required=True, help="JSON string of diary entries")
    parser.add_argument("--mode", type=str, default="cbt", choices=["cbt", "mbt"],
                        help="Analysis mode: cbt or mbt")
    parser.add_argument("--provider", type=str, default="gemini", choices=["gemini", "anthropic"],
                        help="LLM provider: gemini or anthropic")

    args = parser.parse_args()

    try:
        entries = json.loads(args.entries)
        result = analyze_diary(entries, args.mode, args.provider)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except json.JSONDecodeError as e:
        error_result = {
            "error": f"Invalid JSON input: {str(e)}",
            "summary": "Failed to parse diary entries.",
            "risk_level": "unknown",
            "follow_up_suggested": False
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)
    except Exception as e:
        error_result = {
            "error": str(e),
            "summary": "An unexpected error occurred.",
            "risk_level": "unknown",
            "follow_up_suggested": False
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
