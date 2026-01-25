#!/usr/bin/env python3
"""Generate interactive HTML view of ideas database with tag filters."""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "ideas.db"
HTML_PATH = Path(__file__).parent.parent / "ideas.html"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

# Get all ideas
ideas = conn.execute('SELECT * FROM ideas ORDER BY priority DESC, created_at DESC').fetchall()

# Convert to list of dicts for JSON
ideas_json = []
for idea in ideas:
    ideas_json.append({
        'id': idea['id'],
        'title': idea['title'],
        'description': idea['description'] or '',
        'category': idea['category'],
        'priority': idea['priority'],
        'status': idea['status'],
        'complexity': idea['complexity'] or 'Medium',
        'impact': idea['impact'] or 'Medium',
        'created_at': idea['created_at']
    })

# Get unique categories
categories = sorted(set(i['category'] for i in ideas_json))

html = f'''<!DOCTYPE html>
<html>
<head>
    <title>Feature Ideas - Job Application Workflow</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; padding: 20px; }}
        .container {{ max-width: 1600px; margin: 0 auto; }}
        h1 {{ color: #1e293b; margin-bottom: 5px; }}
        .subtitle {{ color: #64748b; margin-bottom: 20px; font-size: 14px; }}

        .filters {{ background: white; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px; }}
        .filter-row {{ display: flex; gap: 30px; flex-wrap: wrap; align-items: flex-start; }}
        .filter-group {{ }}
        .filter-label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 8px; }}
        .filter-tags {{ display: flex; gap: 6px; flex-wrap: wrap; }}
        .tag {{ padding: 4px 12px; font-size: 12px; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.15s; }}
        .tag:hover {{ border-color: #94a3b8; }}
        .tag.active {{ background: #1e293b; color: white; border-color: #1e293b; }}
        .tag.active-status-idea {{ background: #0369a1; border-color: #0369a1; }}
        .tag.active-status-planned {{ background: #b45309; border-color: #b45309; }}
        .tag.active-status-in-progress {{ background: #1d4ed8; border-color: #1d4ed8; }}
        .tag.active-status-done {{ background: #15803d; border-color: #15803d; }}
        .tag.active-status-deferred {{ background: #64748b; border-color: #64748b; }}
        .tag.active-pri {{ background: #dc2626; border-color: #dc2626; }}
        .tag.active-impact {{ background: #7c3aed; border-color: #7c3aed; }}
        .tag.active-complexity {{ background: #0891b2; border-color: #0891b2; }}
        .tag.active-category {{ background: #059669; border-color: #059669; }}

        .stats {{ display: flex; gap: 10px; margin-bottom: 15px; }}
        .stat {{ background: white; padding: 8px 16px; border: 1px solid #e2e8f0; font-size: 13px; }}
        .stat strong {{ color: #1e293b; }}

        table {{ width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; font-size: 13px; }}
        th {{ background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; cursor: pointer; user-select: none; }}
        th:hover {{ background: #f1f5f9; }}
        th.sorted-asc::after {{ content: ' ▲'; }}
        th.sorted-desc::after {{ content: ' ▼'; }}
        td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }}
        tr:hover {{ background: #f8fafc; }}
        .id {{ color: #94a3b8; font-family: monospace; font-size: 12px; }}
        .title {{ font-weight: 500; color: #1e293b; }}
        .desc {{ color: #64748b; font-size: 12px; margin-top: 3px; max-width: 500px; }}

        .badge {{ display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 500; }}
        .status-idea {{ background: #e0f2fe; color: #0369a1; }}
        .status-planned {{ background: #fef3c7; color: #b45309; }}
        .status-in-progress {{ background: #dbeafe; color: #1d4ed8; }}
        .status-done {{ background: #dcfce7; color: #15803d; }}
        .status-deferred {{ background: #f1f5f9; color: #64748b; }}
        .cat {{ background: #f1f5f9; color: #475569; }}
        .pri {{ font-family: monospace; font-weight: 600; padding: 2px 6px; }}
        .pri-5 {{ background: #fef2f2; color: #dc2626; }}
        .pri-4 {{ background: #fff7ed; color: #ea580c; }}
        .pri-3 {{ background: #fefce8; color: #ca8a04; }}
        .pri-2 {{ background: #f0fdf4; color: #15803d; }}
        .pri-1 {{ background: #f8fafc; color: #64748b; }}
        .impact-high {{ background: #f3e8ff; color: #7c3aed; }}
        .impact-medium {{ background: #faf5ff; color: #9333ea; }}
        .impact-low {{ background: #fdf4ff; color: #a855f7; }}
        .complexity-high {{ background: #fef2f2; color: #dc2626; }}
        .complexity-medium {{ background: #fefce8; color: #ca8a04; }}
        .complexity-low {{ background: #f0fdf4; color: #16a34a; }}

        .search-box {{ padding: 8px 12px; border: 1px solid #e2e8f0; width: 200px; font-size: 13px; }}
        .search-box:focus {{ outline: none; border-color: #94a3b8; }}
        .clear-btn {{ padding: 4px 12px; font-size: 12px; background: #f1f5f9; border: 1px solid #e2e8f0; cursor: pointer; margin-left: 10px; }}
        .clear-btn:hover {{ background: #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Feature Ideas Backlog</h1>
        <p class="subtitle">Job Application Workflow &bull; Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>

        <div class="filters">
            <div class="filter-row">
                <div class="filter-group">
                    <div class="filter-label">Status</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="status" data-value="all">All</span>
                        <span class="tag" data-filter="status" data-value="Idea">Idea</span>
                        <span class="tag" data-filter="status" data-value="Planned">Planned</span>
                        <span class="tag" data-filter="status" data-value="In Progress">In Progress</span>
                        <span class="tag" data-filter="status" data-value="Done">Done</span>
                        <span class="tag" data-filter="status" data-value="Deferred">Deferred</span>
                    </div>
                </div>
                <div class="filter-group">
                    <div class="filter-label">Priority</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="priority" data-value="all">All</span>
                        <span class="tag" data-filter="priority" data-value="5">P5</span>
                        <span class="tag" data-filter="priority" data-value="4">P4</span>
                        <span class="tag" data-filter="priority" data-value="3">P3</span>
                        <span class="tag" data-filter="priority" data-value="2">P2</span>
                        <span class="tag" data-filter="priority" data-value="1">P1</span>
                    </div>
                </div>
                <div class="filter-group">
                    <div class="filter-label">Impact</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="impact" data-value="all">All</span>
                        <span class="tag" data-filter="impact" data-value="High">High</span>
                        <span class="tag" data-filter="impact" data-value="Medium">Medium</span>
                        <span class="tag" data-filter="impact" data-value="Low">Low</span>
                    </div>
                </div>
                <div class="filter-group">
                    <div class="filter-label">Complexity</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="complexity" data-value="all">All</span>
                        <span class="tag" data-filter="complexity" data-value="Low">Low</span>
                        <span class="tag" data-filter="complexity" data-value="Medium">Medium</span>
                        <span class="tag" data-filter="complexity" data-value="High">High</span>
                    </div>
                </div>
                <div class="filter-group">
                    <div class="filter-label">Category</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="category" data-value="all">All</span>
                        {"".join(f'<span class="tag" data-filter="category" data-value="{cat}">{cat}</span>' for cat in categories)}
                    </div>
                </div>
            </div>
            <div class="filter-row" style="margin-top: 12px;">
                <div class="filter-group">
                    <div class="filter-label">Search</div>
                    <input type="text" class="search-box" id="search" placeholder="Filter by text...">
                    <button class="clear-btn" onclick="clearFilters()">Clear All</button>
                </div>
            </div>
        </div>

        <div class="stats">
            <div class="stat">Showing <strong id="visible-count">0</strong> of <strong>{len(ideas)}</strong> ideas</div>
        </div>

        <table id="ideas-table">
            <thead>
                <tr>
                    <th data-sort="id" style="width:50px">ID</th>
                    <th data-sort="title">Title & Description</th>
                    <th data-sort="category" style="width:110px">Category</th>
                    <th data-sort="priority" style="width:60px">Pri</th>
                    <th data-sort="impact" style="width:80px">Impact</th>
                    <th data-sort="complexity" style="width:100px">Complexity</th>
                    <th data-sort="status" style="width:100px">Status</th>
                </tr>
            </thead>
            <tbody id="ideas-body">
            </tbody>
        </table>
    </div>

    <script>
        const ideas = {json.dumps(ideas_json)};

        let filters = {{ status: 'all', priority: 'all', impact: 'all', complexity: 'all', category: 'all', search: '' }};
        let sortCol = 'priority';
        let sortDir = 'desc';

        function renderTable() {{
            let filtered = ideas.filter(idea => {{
                if (filters.status !== 'all' && idea.status !== filters.status) return false;
                if (filters.priority !== 'all' && idea.priority != filters.priority) return false;
                if (filters.impact !== 'all' && idea.impact !== filters.impact) return false;
                if (filters.complexity !== 'all' && idea.complexity !== filters.complexity) return false;
                if (filters.category !== 'all' && idea.category !== filters.category) return false;
                if (filters.search && !idea.title.toLowerCase().includes(filters.search) && !idea.description.toLowerCase().includes(filters.search)) return false;
                return true;
            }});

            filtered.sort((a, b) => {{
                let av = a[sortCol], bv = b[sortCol];
                if (typeof av === 'string') av = av.toLowerCase();
                if (typeof bv === 'string') bv = bv.toLowerCase();
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            }});

            const tbody = document.getElementById('ideas-body');
            tbody.innerHTML = filtered.map(idea => {{
                const statusClass = 'status-' + idea.status.toLowerCase().replace(' ', '-');
                const priClass = 'pri-' + idea.priority;
                const impactClass = 'impact-' + idea.impact.toLowerCase();
                const complexityClass = 'complexity-' + idea.complexity.toLowerCase();
                return `<tr>
                    <td class="id">#${{idea.id}}</td>
                    <td><div class="title">${{idea.title}}</div><div class="desc">${{idea.description}}</div></td>
                    <td><span class="badge cat">${{idea.category}}</span></td>
                    <td><span class="badge pri ${{priClass}}">P${{idea.priority}}</span></td>
                    <td><span class="badge ${{impactClass}}">${{idea.impact}}</span></td>
                    <td><span class="badge ${{complexityClass}}">${{idea.complexity}}</span></td>
                    <td><span class="badge ${{statusClass}}">${{idea.status}}</span></td>
                </tr>`;
            }}).join('');

            document.getElementById('visible-count').textContent = filtered.length;

            document.querySelectorAll('th').forEach(th => {{
                th.classList.remove('sorted-asc', 'sorted-desc');
                if (th.dataset.sort === sortCol) {{
                    th.classList.add('sorted-' + sortDir);
                }}
            }});
        }}

        document.querySelectorAll('.tag').forEach(tag => {{
            tag.addEventListener('click', () => {{
                const filter = tag.dataset.filter;
                const value = tag.dataset.value;
                filters[filter] = value;

                document.querySelectorAll(`.tag[data-filter="${{filter}}"]`).forEach(t => {{
                    t.classList.remove('active', 'active-status-idea', 'active-status-planned', 'active-status-in-progress', 'active-status-done', 'active-status-deferred', 'active-pri', 'active-impact', 'active-complexity', 'active-category');
                }});
                if (value !== 'all') {{
                    if (filter === 'status') tag.classList.add('active-status-' + value.toLowerCase().replace(' ', '-'));
                    else if (filter === 'priority') tag.classList.add('active-pri');
                    else if (filter === 'impact') tag.classList.add('active-impact');
                    else if (filter === 'complexity') tag.classList.add('active-complexity');
                    else if (filter === 'category') tag.classList.add('active-category');
                }}
                tag.classList.add('active');
                renderTable();
            }});
        }});

        document.getElementById('search').addEventListener('input', (e) => {{
            filters.search = e.target.value.toLowerCase();
            renderTable();
        }});

        document.querySelectorAll('th[data-sort]').forEach(th => {{
            th.addEventListener('click', () => {{
                const col = th.dataset.sort;
                if (sortCol === col) {{
                    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                }} else {{
                    sortCol = col;
                    sortDir = col === 'priority' ? 'desc' : 'asc';
                }}
                renderTable();
            }});
        }});

        function clearFilters() {{
            filters = {{ status: 'all', priority: 'all', impact: 'all', complexity: 'all', category: 'all', search: '' }};
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active', 'active-status-idea', 'active-status-planned', 'active-status-in-progress', 'active-status-done', 'active-status-deferred', 'active-pri', 'active-impact', 'active-complexity', 'active-category'));
            document.querySelectorAll('.tag[data-value="all"]').forEach(t => t.classList.add('active'));
            document.getElementById('search').value = '';
            renderTable();
        }}

        document.querySelectorAll('.tag[data-value="all"]').forEach(t => t.classList.add('active'));
        renderTable();
    </script>
</body>
</html>'''

with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Generated {HTML_PATH}")
conn.close()
