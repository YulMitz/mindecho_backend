"""Export AI chat history to plain-text .txt files.

Reads DATABASE_URL from ../.env. Read-only (SELECT only).
One .txt per ChatSession. Default output dir: ./exports/chat_logs_<ts>/

Usage:
    uv run python export_chat_history.py
    uv run python export_chat_history.py --user-id <User.id>
    uv run python export_chat_history.py --session-id <ChatSession.sessionId>
    uv run python export_chat_history.py --out /tmp/chats
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

LIBPQ_ALLOWED = {
    "host", "hostaddr", "port", "dbname", "user", "password", "sslmode",
    "connect_timeout", "application_name", "options", "channel_binding",
    "gssencmode", "sslrootcert", "sslcert", "sslkey", "target_session_attrs",
}


def clean_db_url(url: str) -> str:
    p = urlsplit(url)
    pruned = [(k, v) for k, v in parse_qsl(p.query) if k in LIBPQ_ALLOWED]
    return urlunsplit((p.scheme, p.netloc, p.path, urlencode(pruned), p.fragment))


def safe_name(s: str, max_len: int = 60) -> str:
    s = re.sub(r"[^\w\-]+", "_", s, flags=re.UNICODE).strip("_")
    return s[:max_len] or "untitled"


def fetch_sessions(cur, user_id, session_id):
    sql = """
        SELECT cs."sessionId", cs."userId", u.email, u.name,
               cs.title, cs."chatbotType", cs.provider, cs."isActive",
               cs."createdAt", cs."updatedAt"
        FROM chat_sessions cs
        LEFT JOIN users u ON u.id = cs."userId"
        {where}
        ORDER BY cs."userId", cs."createdAt"
    """
    clauses, params = [], []
    if user_id:
        clauses.append('cs."userId" = %s'); params.append(user_id)
    if session_id:
        clauses.append('cs."sessionId" = %s'); params.append(session_id)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    cur.execute(sql.format(where=where), params)
    return cur.fetchall()


def fetch_messages(cur, session_id):
    cur.execute(
        '''SELECT "messageType", "chatbotType", provider, content, timestamp
           FROM messages WHERE "sessionId" = %s ORDER BY timestamp ASC''',
        (session_id,),
    )
    return cur.fetchall()


def render_session(session_row, messages) -> str:
    sid, uid, email, name, title, ctype, provider, active, created, updated = session_row
    lines = [
        "=" * 72,
        f"Session ID    : {sid}",
        f"User          : {name or '-'} <{email or '-'}> ({uid})",
        f"Title         : {title or '-'}",
        f"Chatbot Type  : {ctype}",
        f"Provider      : {provider}",
        f"Active        : {active}",
        f"Created       : {created}",
        f"Updated       : {updated}",
        f"Message Count : {len(messages)}",
        "=" * 72,
        "",
    ]
    for mtype, mctype, mprov, content, ts in messages:
        ts_str = ts.isoformat(sep=" ", timespec="seconds") if ts else "-"
        speaker = "USER" if mtype == "USER" else "AI"
        meta_bits = [mctype]
        if mprov:
            meta_bits.append(mprov)
        meta = " / ".join(b for b in meta_bits if b)
        lines.append(f"[{ts_str}] {speaker} ({meta})")
        lines.append((content or "").rstrip())
        lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Export AI chat history to .txt files.")
    ap.add_argument("--user-id", help="Filter to a single user (User.id)")
    ap.add_argument("--session-id", help="Filter to a single ChatSession.sessionId")
    ap.add_argument("--out", help="Output directory")
    args = ap.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("ERROR: DATABASE_URL not set in .env")
    db_url = clean_db_url(db_url)

    out_dir = Path(args.out) if args.out else (
        Path.cwd() / "exports" / f"chat_logs_{datetime.now():%Y%m%d_%H%M%S}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Connecting to database (read-only)...")
    written = 0
    skipped_empty = 0
    with psycopg.connect(db_url) as conn:
        conn.read_only = True
        with conn.cursor() as cur:
            sessions = fetch_sessions(cur, args.user_id, args.session_id)
            print(f"Found {len(sessions)} sessions")
            for srow in sessions:
                sid = srow[0]
                msgs = fetch_messages(cur, sid)
                if not msgs:
                    skipped_empty += 1
                    continue
                created = srow[8]
                date_part = created.strftime("%Y%m%d") if created else "nodate"
                title = srow[4] or srow[5]  # fall back to chatbotType
                fname = f"{date_part}_{safe_name(srow[1])}_{safe_name(title)}_{sid[-8:]}.txt"
                (out_dir / fname).write_text(render_session(srow, msgs), encoding="utf-8")
                written += 1

    print(f"\n✓ Wrote {written} .txt files to {out_dir}")
    if skipped_empty:
        print(f"  (skipped {skipped_empty} empty sessions)")


if __name__ == "__main__":
    main()
