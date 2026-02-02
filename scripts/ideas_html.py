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
ideas = conn.execute('SELECT * FROM ideas ORDER BY priority DESC, id DESC').fetchall()

# Get all dependencies
dependencies = conn.execute('SELECT idea_id, dependency_id FROM idea_dependencies').fetchall()
prereqs_map = {}
blocking_map = {}
for dep in dependencies:
    if dep['idea_id'] not in prereqs_map:
        prereqs_map[dep['idea_id']] = []
    prereqs_map[dep['idea_id']].append(dep['dependency_id'])
    
    if dep['dependency_id'] not in blocking_map:
        blocking_map[dep['dependency_id']] = []
    blocking_map[dep['dependency_id']].append(dep['idea_id'])

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
        'created_at': idea['created_at'][:10] if idea['created_at'] else '',
        'source': idea['source'] or '',
        'source_url': idea['source_url'] if 'source_url' in idea.keys() else '',
        'sprint_group': idea['sprint_group'] or '',
        'prereqs': prereqs_map.get(idea['id'], []),
        'blocking': blocking_map.get(idea['id'], []),
    })

# Get unique categories and sprint groups
categories = sorted(list(set(i['category'] for i in ideas_json)))
sprints = sorted(list(set(i['sprint_group'] for i in ideas_json if i['sprint_group'])))

html = f'''<!DOCTYPE html>
<html>
<head>
    <title>Feature Ideas - Job Application Workflow</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        :root {{
            --bg: #111827; --bg-secondary: #1f2937; --bg-tertiary: #374151;
            --text: #d1d5db; --text-secondary: #9ca3af; --text-link: #60a5fa;
            --border: #374151; --border-hover: #4b5563;
            --header: #f9fafb;
            --tag-active: #2563eb; --tag-active-text: #fff;
        }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); padding: 20px; }}
        .container {{ max-width: 1600px; margin: 0 auto; }}
        h1 {{ color: var(--header); margin-bottom: 5px; }}
        .subtitle {{ color: var(--text-secondary); margin-bottom: 20px; font-size: 14px; }}

        .filters {{ background: var(--bg-secondary); border: 1px solid var(--border); padding: 15px; margin-bottom: 20px; }}
        .filter-row {{ display: flex; gap: 30px; flex-wrap: wrap; align-items: flex-start; }}
        .filter-group {{ }}
        .filter-label {{ font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px; }}
        .filter-tags {{ display: flex; gap: 6px; flex-wrap: wrap; }}
        .tag {{ padding: 4px 12px; font-size: 12px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text); cursor: pointer; transition: all 0.15s; }}
        .tag:hover {{ border-color: var(--border-hover); }}
        .tag.active {{ background: var(--tag-active); color: var(--tag-active-text); border-color: var(--tag-active); }}

        .stats {{ display: flex; gap: 10px; margin-bottom: 15px; }}
        .stat {{ background: var(--bg-secondary); padding: 8px 16px; border: 1px solid var(--border); font-size: 13px; }}
        .stat strong {{ color: var(--header); }}

        table {{ width: 100%; border-collapse: collapse; background: var(--bg-secondary); border: 1px solid var(--border); font-size: 13px; }}
        th {{ background: var(--bg-tertiary); text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; }}
        th:hover {{ background: var(--border-hover); }}
        th.sorted-asc::after {{ content: ' ▲'; }}
        th.sorted-desc::after {{ content: ' ▼'; }}
        td {{ padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }}
        tr:hover {{ background: #2a3647; }}
        .id {{ color: #9ca3af; font-family: monospace; font-size: 12px; }}
        .title {{ font-weight: 500; color: var(--header); }}
        .desc {{ color: var(--text-secondary); font-size: 12px; margin-top: 3px; max-width: 500px; }}

        .badge {{ display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 500; }}
        .status-idea {{ background: #1e3a8a; color: #dbeafe; }}
        .status-planned {{ background: #92400e; color: #fef3c7; }}
        .status-in-progress {{ background: #1e40af; color: #dbeafe; }}
        .status-done {{ background: #166534; color: #dcfce7; }}
        .status-deferred {{ background: #4b5563; color: #f1f5f9; }}
        .cat {{ background: #374151; color: #d1d5db; }}
        .pri {{ font-family: monospace; font-weight: 600; padding: 2px 6px; }}
        .pri-5 {{ background: #991b1b; color: #fef2f2; }}
        .pri-4 {{ background: #9a3412; color: #fff7ed; }}
        .pri-3 {{ background: #854d0e; color: #fefce8; }}
        .pri-2 {{ background: #166534; color: #f0fdf4; }}
        .pri-1 {{ background: #4b5563; color: #f8fafc; }}
        .impact-high {{ background: #5b21b6; color: #f3e8ff; }}
        .impact-medium {{ background: #6d28d9; color: #faf5ff; }}
        .impact-low {{ background: #7e22ce; color: #fdf4ff; }}
        .complexity-high {{ background: #991b1b; color: #fef2f2; }}
        .complexity-medium {{ background: #854d0e; color: #fefce8; }}
        .complexity-low {{ background: #15803d; color: #f0fdf4; }}

        .search-box {{ padding: 8px 12px; border: 1px solid var(--border); width: 200px; font-size: 13px; background: var(--bg-tertiary); color: var(--text); }}
        .search-box:focus {{ outline: none; border-color: var(--border-hover); }}
        .clear-btn {{ padding: 4px 12px; font-size: 12px; background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border); cursor: pointer; margin-left: 10px; }}
        .clear-btn:hover {{ background: var(--border-hover); }}
        .source {{ font-size: 12px; color: var(--text-secondary); }}
        .source-link {{ color: var(--text-link); text-decoration: none; }}
        .source-link:hover {{ text-decoration: underline; }}
        .date {{ font-size: 12px; color: var(--text-secondary); font-family: monospace; }}
        .deps-list {{ font-size: 11px; font-family: monospace; }}
        .deps-list a {{ color: var(--text-link); text-decoration: none; }}
        .deps-list a:hover {{ text-decoration: underline; }}
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
                    <div class="filter-label">Category</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="category" data-value="all">All</span>
                        {"".join(f'<span class="tag" data-filter="category" data-value="{cat}">{cat}</span>' for cat in categories)}
                    </div>
                </div>
                 <div class="filter-group">
                    <div class="filter-label">Sprint Group</div>
                    <div class="filter-tags">
                        <span class="tag" data-filter="sprint" data-value="all">All</span>
                        {"".join(f'<span class="tag" data-filter="sprint" data-value="{s}">{s}</span>' for s in sprints)}
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
                    <th data-sort="sprint_group" style="width:120px">Sprint</th>
                    <th data-sort="category" style="width:100px">Category</th>
                    <th data-sort="priority" style="width:50px">Pri</th>
                    <th data-sort="status" style="width:90px">Status</th>
                    <th data-sort="deps" style="width:120px">Deps</th>
                </tr>
            </thead>
            <tbody id="ideas-body">
            </tbody>
        </table>
    </div>

    <script>
        const ideas = {json.dumps(ideas_json)};
        const ideasById = ideas.reduce((acc, idea) => {{ acc[idea.id] = idea; return acc; }}, {{}});

        let filters = {{ status: [], category: [], sprint: [], search: '' }};
        let sortCol = 'priority';
        let sortDir = 'desc';

        function matchesFilter(value, filterArray) {{
            return filterArray.length === 0 || filterArray.includes(String(value));
        }}

        function renderTable() {{
            let filtered = ideas.filter(idea => {{
                if (!matchesFilter(idea.status, filters.status)) return false;
                if (!matchesFilter(idea.category, filters.category)) return false;
                if (!matchesFilter(idea.sprint_group, filters.sprint)) return false;
                if (filters.search && !idea.title.toLowerCase().includes(filters.search) && !idea.description.toLowerCase().includes(filters.search)) return false;
                return true;
            }});

            filtered.sort((a, b) => {{
                let av = a[sortCol], bv = b[sortCol];
                if (sortCol === 'deps') {{
                    av = a.prereqs.length + a.blocking.length;
                    bv = b.prereqs.length + b.blocking.length;
                }}
                if (typeof av === 'string') av = av.toLowerCase();
                if (typeof bv === 'string') bv = bv.toLowerCase();

                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return b.id - a.id; // Secondary sort
            }});

            const tbody = document.getElementById('ideas-body');
            tbody.innerHTML = filtered.map(idea => {{
                const statusClass = 'status-' + idea.status.toLowerCase().replace(' ', '-');
                const priClass = 'pri-' + idea.priority;

                const depsHtml = `
                    <div class="deps-list">
                        ${{idea.prereqs.length > 0 ? `<div>Blocks: ${{idea.prereqs.map(id => `<a href="#idea-${{id}}">#${{id}}</a>`).join(', ')}}</div>` : ''}}
                        ${{idea.blocking.length > 0 ? `<div>Blocked By: ${{idea.blocking.map(id => `<a href="#idea-${{id}}">#${{id}}</a>`).join(', ')}}</div>` : ''}}
                    </div>
                `;

                return `<tr id="idea-${{idea.id}}">
                    <td class="id">#${{idea.id}}</td>
                    <td>
                        <div class="title">${{idea.title}}</div>
                        <div class="desc">${{idea.description}}</div>
                    </td>
                    <td><span class="badge cat">${{idea.sprint_group}}</span></td>
                    <td><span class="badge cat">${{idea.category}}</span></td>
                    <td><span class="badge pri ${{priClass}}">P${{idea.priority}}</span></td>
                    <td><span class="badge ${{statusClass}}">${{idea.status}}</span></td>
                    <td>${{depsHtml}}</td>
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
                const groupTags = document.querySelectorAll(`.tag[data-filter="${{filter}}"]`);
                const allTag = document.querySelector(`.tag[data-filter="${{filter}}"][data-value="all"]`);

                if (value === 'all') {{
                    filters[filter] = [];
                    groupTags.forEach(t => t.classList.remove('active'));
                    allTag.classList.add('active');
                }} else {{
                    const idx = filters[filter].indexOf(value);
                    if (idx > -1) {{
                        filters[filter].splice(idx, 1);
                        tag.classList.remove('active');
                    }} else {{
                        filters[filter].push(value);
                        tag.classList.add('active');
                    }}
                    allTag.classList.remove('active');
                    if (filters[filter].length === 0) {{
                        allTag.classList.add('active');
                    }}
                }}
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
                    sortDir = (col === 'priority' || col === 'id') ? 'desc' : 'asc';
                }}
                renderTable();
            }});
        }});

        function clearFilters() {{
            filters = {{ status: [], category: [], sprint: [], search: '' }};
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
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
