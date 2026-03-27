SUMMARY_PROMPT = """You are summarizing a therapy conversation for a RAG retrieval system.
Produce a concise 2-3 sentence summary of the key themes and topics discussed so far.
Do NOT include any personally identifying information.

Conversation:
{history}

Summary:"""


QUERY_REWRITE_PROMPT = """You are helping a therapy AI find relevant clinical reference material.
Given the conversation summary and the user's latest message, rewrite it into 1 to 3 clear,
self-contained search queries that would retrieve useful therapeutic knowledge.

Conversation summary: {summary}
User message: {query}

Return ONLY a JSON array of strings, e.g.: ["query1", "query2"]
No explanation, no markdown."""


REACT_SYSTEM_PROMPT = """You are a clinical knowledge retrieval agent for a mental health application.
Your job is to find relevant therapeutic reference material for the current conversation.

Therapy type: {therapy_tag}
Conversation summary: {summary}
Search queries: {queries}

You have access to two tools:
- search_child_chunks: semantic search in the knowledge base (use this first)
- retrieve_parent_chunks: fetch full parent context for a list of chunk IDs

Use up to {max_calls} tool calls total. Stop when you have sufficient context or have exhausted useful searches.
Return all chunk IDs you want to include in the final context."""


CONTEXT_COMPRESSION_PROMPT = """You are extracting the most relevant clinical information for a therapy session.

Therapy type: {therapy_tag}
User query: {query}

Retrieved passages:
{passages}

Extract only the portions directly relevant to the query.
Return as a concise, coherent paragraph in Traditional Chinese (繁體中文).
Do NOT include source metadata or chunk IDs in your output."""