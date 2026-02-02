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
    python scripts/ideas.py update 1 --set-sprint "Q3-Features"
    python scripts/ideas.py update 1 --add-prereq 2
"""

import sqlite3
import argparse
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "ideas.db"


def get_connection():
    # isolation_level=None for autocommit on DDL
    conn = sqlite3.connect(DB_PATH, isolation_level=None)
    # Enable foreign key support
    conn.execute("PRAGMA foreign_keys = 1")
    return conn


def list_ideas(status=None, category=None, sort_by="priority", limit=50):
    """List ideas with optional filters."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all dependencies to check for blocked ideas
    cursor.execute("SELECT DISTINCT idea_id FROM idea_dependencies")
    blocked_ids = {row['idea_id'] for row in cursor.fetchall()}

    query = "SELECT id, title, category, complexity, impact, priority, status, sprint_group FROM ideas WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)
    if category:
        query += " AND category = ?"
        params.append(category)

    # Allow sorting by sprint group
    if sort_by == "sprint":
        query += " ORDER BY sprint_group, priority DESC, id"
    else:
        query += f" ORDER BY {sort_by} DESC, id"

    query += " LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    if not rows:
        print("No ideas found.")
        return

    # Print header
    print(f"\n{'ID':<4} {'Title':<35} {'Category':<12} {'Cplx':<6} {'Impact':<6} {'Pri':<4} {'Status':<14} {'Sprint Group':<20}")
    print("-" * 115)

    for row in rows:
        title = row['title'][:33] + '..' if len(row['title']) > 35 else row['title']
        status = row['status']
        if row['id'] in blocked_ids:
            status = f"{status} [B]" # Blocked indicator

        sprint_group = row['sprint_group'] or ''
        print(f"{row['id']:<4} {title:<35} {row['category']:<12} {row['complexity']:<6} {row['impact']:<6} {row['priority']:<4} {status:<14} {sprint_group:<20}")

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
    print(f"Sprint Group: {row['sprint_group'] or 'None'}")
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

    # Show prerequisites
    cursor.execute("""
        SELECT i.id, i.title, i.status
        FROM ideas i
        JOIN idea_dependencies d ON i.id = d.dependency_id
        WHERE d.idea_id = ?
    """, (idea_id,))
    prereqs = cursor.fetchall()
    if prereqs:
        print("\nPrerequisites (must be completed first):")
        for p in prereqs:
            print(f"  - #{p['id']} [{p['status']}] {p['title']}")

    # Show ideas this one blocks
    cursor.execute("""
        SELECT i.id, i.title, i.status
        FROM ideas i
        JOIN idea_dependencies d ON i.id = d.idea_id
        WHERE d.dependency_id = ?
    """, (idea_id,))
    blocking = cursor.fetchall()
    if blocking:
        print("\nBlocks the following ideas:")
        for b in blocking:
            print(f"  - #{b['id']} [{b['status']}] {b['title']}")

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
    sprint_group = input("Sprint Group (optional): ").strip() or None

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
        INSERT INTO ideas (title, description, category, complexity, impact, priority, source, source_url, sprint_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, description, category, complexity, impact, priority, source, source_url, sprint_group))

    conn.commit()
    idea_id = cursor.lastrowid
    conn.close()

    print(f"\n[OK] Added idea #{idea_id}: {title}")


def update_idea(idea_id, add_prereq=None, remove_prereq=None, **kwargs):
    """Update an idea's fields and its dependencies."""
    conn = get_connection()
    cursor = conn.cursor()

    # Handle dependencies first
    if add_prereq:
        try:
            cursor.execute("INSERT INTO idea_dependencies (idea_id, dependency_id) VALUES (?, ?)", (idea_id, add_prereq))
            print(f"[OK] Added dependency: idea #{idea_id} now depends on #{add_prereq}")
        except sqlite3.IntegrityError:
            print(f"[WARN] Dependency from #{idea_id} to #{add_prereq} may already exist or IDs are invalid.")
    
    if remove_prereq:
        cursor.execute("DELETE FROM idea_dependencies WHERE idea_id = ? AND dependency_id = ?", (idea_id, remove_prereq))
        if cursor.rowcount > 0:
            print(f"[OK] Removed dependency: idea #{idea_id} no longer depends on #{remove_prereq}")
        else:
            print(f"[WARN] Dependency from #{idea_id} to #{remove_prereq} not found.")

    # Filter out None values from kwargs to avoid updating them
    update_kwargs = {k: v for k, v in kwargs.items() if v is not None}
    
    if not update_kwargs:
        conn.close()
        return

    # Build update query for other fields
    updates = [f"{key} = ?" for key in update_kwargs.keys()]
    params = list(update_kwargs.values())
    
    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(idea_id)

    query = f"UPDATE ideas SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)

    if cursor.rowcount > 0:
        print(f"[OK] Updated idea #{idea_id}")
    else:
        # This can be noisy if we only updated dependencies
        if not (add_prereq or remove_prereq):
             print(f"Idea {idea_id} not found.")

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
    
    # By sprint group
    cursor.execute("SELECT sprint_group, COUNT(*) FROM ideas WHERE sprint_group IS NOT NULL GROUP BY sprint_group ORDER BY sprint_group")
    print("\nBy Sprint Group:")
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
    list_parser.add_argument("--sort", default="priority", help="Sort by field (e.g., priority, sprint)")
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
    update_parser.add_argument("--set-sprint", dest="sprint_group", help="Assign to a sprint group")
    update_parser.add_argument("--add-prereq", type=int, help="Add a prerequisite dependency by ID")
    update_parser.add_argument("--remove-prereq", type=int, help="Remove a prerequisite dependency by ID")

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
                   category=args.category, notes=args.notes, sprint_group=args.sprint_group,
                   add_prereq=args.add_prereq, remove_prereq=args.remove_prereq)
    elif args.command == "summary":
        summary()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
