#!/usr/bin/env python3
"""
Ideas Management CLI

Usage:
    python scripts/ideas.py list                    # List all ideas
    python scripts/ideas.py list --status Planned   # Filter by status
    python scripts/ideas.py list --category UI      # Filter by category
    python scripts/ideas.py add                     # Add new idea (interactive)
    python scripts/ideas.py show 1                  # Show idea details
    python scripts/ideas.py update 1 --status "In Progress"
"""

import sqlite3
import argparse
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "ideas.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def list_ideas(status=None, category=None, sort_by="priority", limit=50):
    """List ideas with optional filters."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT id, title, category, complexity, impact, priority, status FROM ideas WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)
    if category:
        query += " AND category = ?"
        params.append(category)

    query += f" ORDER BY {sort_by} DESC, id LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        print("No ideas found.")
        return

    # Print header
    print(f"\n{'ID':<4} {'Title':<35} {'Category':<12} {'Cplx':<6} {'Impact':<6} {'Pri':<4} {'Status':<12}")
    print("-" * 95)

    for row in rows:
        title = row['title'][:33] + '..' if len(row['title']) > 35 else row['title']
        print(f"{row['id']:<4} {title:<35} {row['category']:<12} {row['complexity']:<6} {row['impact']:<6} {row['priority']:<4} {row['status']:<12}")

    print(f"\nTotal: {len(rows)} ideas")
    conn.close()


def show_idea(idea_id):
    """Show full details of an idea."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,))
    row = cursor.fetchone()

    if not row:
        print(f"Idea {idea_id} not found.")
        return

    print(f"\n{'='*60}")
    print(f"ID: {row['id']}")
    print(f"Title: {row['title']}")
    print(f"{'='*60}")
    print(f"Category: {row['category']}")
    print(f"Complexity: {row['complexity']}")
    print(f"Impact: {row['impact']}")
    print(f"Priority: {row['priority']}")
    print(f"Status: {row['status']}")
    print(f"Created: {row['created_at']}")
    print(f"Source: {row['source']}")
    if row['source_url']:
        print(f"Source URL: {row['source_url']}")
    print(f"\nDescription:\n{row['description']}")
    if row['notes']:
        print(f"\nNotes:\n{row['notes']}")
    print()

    conn.close()


def add_idea():
    """Add a new idea interactively."""
    print("\n=== Add New Idea ===\n")

    title = input("Title: ").strip()
    if not title:
        print("Title is required.")
        return

    description = input("Description: ").strip()

    print("\nCategories: UI, Backend, Feature, Integration, Track 3, Other")
    category = input("Category [Feature]: ").strip() or "Feature"

    print("\nComplexity: Low, Medium, High")
    complexity = input("Complexity [Medium]: ").strip() or "Medium"

    print("\nImpact: Low, Medium, High")
    impact = input("Impact [Medium]: ").strip() or "Medium"

    priority = input("Priority (1-5) [3]: ").strip() or "3"
    priority = int(priority)

    source = input("Source [Manual entry]: ").strip() or "Manual entry"
    source_url = input("Source URL (optional): ").strip() or None

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO ideas (title, description, category, complexity, impact, priority, source, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, description, category, complexity, impact, priority, source, source_url))

    conn.commit()
    idea_id = cursor.lastrowid
    conn.close()

    print(f"\n[OK] Added idea #{idea_id}: {title}")


def update_idea(idea_id, **kwargs):
    """Update an idea's fields."""
    conn = get_connection()
    cursor = conn.cursor()

    # Build update query
    updates = []
    params = []
    for key, value in kwargs.items():
        if value is not None:
            updates.append(f"{key} = ?")
            params.append(value)

    if not updates:
        print("No updates specified.")
        return

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(idea_id)

    query = f"UPDATE ideas SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)

    if cursor.rowcount == 0:
        print(f"Idea {idea_id} not found.")
    else:
        print(f"[OK] Updated idea #{idea_id}")

    conn.commit()
    conn.close()


def summary():
    """Show summary statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    print("\n=== Ideas Summary ===\n")

    # By status
    cursor.execute("SELECT status, COUNT(*) FROM ideas GROUP BY status ORDER BY COUNT(*) DESC")
    print("By Status:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # By category
    cursor.execute("SELECT category, COUNT(*) FROM ideas GROUP BY category ORDER BY COUNT(*) DESC")
    print("\nBy Category:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # High impact
    cursor.execute("SELECT COUNT(*) FROM ideas WHERE impact = 'High' AND status != 'Done'")
    print(f"\nHigh Impact (not done): {cursor.fetchone()[0]}")

    # Total
    cursor.execute("SELECT COUNT(*) FROM ideas")
    print(f"Total Ideas: {cursor.fetchone()[0]}")

    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Ideas Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # List command
    list_parser = subparsers.add_parser("list", help="List ideas")
    list_parser.add_argument("--status", help="Filter by status")
    list_parser.add_argument("--category", help="Filter by category")
    list_parser.add_argument("--sort", default="priority", help="Sort by field")
    list_parser.add_argument("--limit", type=int, default=50, help="Max results")

    # Show command
    show_parser = subparsers.add_parser("show", help="Show idea details")
    show_parser.add_argument("id", type=int, help="Idea ID")

    # Add command
    subparsers.add_parser("add", help="Add new idea")

    # Update command
    update_parser = subparsers.add_parser("update", help="Update idea")
    update_parser.add_argument("id", type=int, help="Idea ID")
    update_parser.add_argument("--status", help="New status")
    update_parser.add_argument("--priority", type=int, help="New priority")
    update_parser.add_argument("--category", help="New category")
    update_parser.add_argument("--notes", help="Add notes")

    # Summary command
    subparsers.add_parser("summary", help="Show summary")

    args = parser.parse_args()

    if args.command == "list":
        list_ideas(status=args.status, category=args.category, sort_by=args.sort, limit=args.limit)
    elif args.command == "show":
        show_idea(args.id)
    elif args.command == "add":
        add_idea()
    elif args.command == "update":
        update_idea(args.id, status=args.status, priority=args.priority,
                   category=args.category, notes=args.notes)
    elif args.command == "summary":
        summary()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
