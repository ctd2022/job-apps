"""
Profile Output Generator
Generates filtered outputs from your master JSON profile
Part of the job_applications workflow
"""

import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

class ProfileOutputGenerator:
    def __init__(self, profile_path: str):
        """Load the master profile JSON"""
        with open(profile_path, 'r', encoding='utf-8') as f:
            self.profile = json.load(f)
    
    def filter_by_include_in(self, items: List[Dict], output_type: str) -> List[Dict]:
        """Filter items based on include_in field"""
        if not items:
            return []
        return [item for item in items if output_type in item.get('include_in', [])]
    
    def filter_by_priority(self, items: List[Dict], min_priority: str = 'low') -> List[Dict]:
        """Filter items by priority level (high > medium > low)"""
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        min_level = priority_order.get(min_priority, 1)
        
        return [
            item for item in items 
            if priority_order.get(item.get('priority', 'low'), 1) >= min_level
        ]
    
    def filter_by_tags(self, items: List[Dict], tags: List[str]) -> List[Dict]:
        """Filter items that contain any of the specified tags"""
        if not tags:
            return items
        
        return [
            item for item in items
            if any(tag in item.get('tags', []) or tag in item.get('relevance_tags', []) 
                   for tag in tags)
        ]
    
    def generate_cv_markdown(self, focus: str = None, max_experiences: int = None) -> str:
        """Generate CV in Markdown format"""
        output = []
        
        # Header
        personal = self.profile['personal']
        output.append(f"# {personal['name']}")
        output.append(f"**{personal['title']}**\n")
        
        # Contact
        contact_parts = []
        if personal.get('email'):
            contact_parts.append(f"📧 {personal['email']}")
        if personal.get('phone'):
            contact_parts.append(f"📞 {personal['phone']}")
        if personal['links'].get('linkedin'):
            contact_parts.append(f"🔗 {personal['links']['linkedin']}")
        
        output.append(" | ".join(contact_parts))
        output.append("")
        
        # Summary
        summary = self.profile['summary']
        if focus and focus in summary.get('variants', {}):
            output.append(f"## Professional Summary\n{summary['variants'][focus]}\n")
        else:
            output.append(f"## Professional Summary\n{summary.get('long', summary.get('short', ''))}\n")
        
        # Experience
        experiences = self.filter_by_include_in(self.profile.get('experience', []), 'cv')
        if focus:
            experiences = self.filter_by_tags(experiences, [focus])
        if max_experiences:
            experiences = experiences[:max_experiences]
        
        if experiences:
            output.append("## Professional Experience\n")
            for exp in experiences:
                # Header
                output.append(f"### {exp['title']} | {exp['company']}")
                
                # Date range
                start = exp.get('start_date', '')
                end = exp.get('end_date', 'Present') if exp.get('is_current') else exp.get('end_date', '')
                output.append(f"*{start} - {end}* | {exp.get('location', '')}")
                output.append("")
                
                # Achievements (prioritise these over responsibilities)
                achievements = [a for a in exp.get('achievements', []) 
                               if isinstance(a, dict)]
                if achievements:
                    # Filter by include_in if achievement is a dict
                    achievements = [a for a in achievements if 'cv' in a.get('include_in', ['cv'])]
                    # Sort by highlight flag
                    achievements.sort(key=lambda x: x.get('highlight', False), reverse=True)
                    
                    for ach in achievements:
                        output.append(f"- {ach['text']}")
                else:
                    # Fallback to simple list
                    for ach in exp.get('achievements', []):
                        if isinstance(ach, str):
                            output.append(f"- {ach}")
                
                # Key technologies
                if exp.get('technologies'):
                    output.append(f"\n*Technologies:* {', '.join(exp['technologies'])}")
                
                output.append("")
        
        # Education
        education = self.filter_by_include_in(self.profile.get('education', []), 'cv')
        if education:
            output.append("## Education\n")
            for edu in education:
                output.append(f"### {edu['degree']} in {edu['field']}")
                output.append(f"*{edu['institution']}* | {edu.get('graduation_date', '')}")
                if edu.get('grade'):
                    output.append(f"Grade: {edu['grade']}")
                output.append("")
        
        # Certifications
        certs = self.filter_by_include_in(self.profile.get('certifications', []), 'cv')
        certs = self.filter_by_priority(certs, 'medium')
        if certs:
            output.append("## Certifications\n")
            for cert in certs:
                status = " (Active)" if cert.get('status') == 'active' else ""
                output.append(f"- **{cert['name']}** | {cert['issuer']} | {cert.get('date_issued', '')}{status}")
            output.append("")
        
        # Skills
        skills = self.profile.get('skills', {})
        if skills:
            output.append("## Skills\n")
            
            for category, items in skills.items():
                if items and isinstance(items, list):
                    output.append(f"**{category.replace('_', ' ').title()}:** {', '.join(items)}")
            output.append("")
        
        # Projects (only high priority)
        projects = self.filter_by_include_in(self.profile.get('projects', []), 'cv')
        projects = self.filter_by_priority(projects, 'high')
        if focus:
            projects = self.filter_by_tags(projects, [focus])
        
        if projects:
            output.append("## Key Projects\n")
            for proj in projects[:3]:  # Limit to 3 for CV
                output.append(f"### {proj['title']}")
                output.append(f"*{proj.get('role', '')}* | {proj.get('start_date', '')} - {proj.get('end_date', '')}")
                output.append(f"\n{proj.get('description', '')}")
                
                if proj.get('achievements'):
                    for ach in proj['achievements']:
                        output.append(f"- {ach}")
                
                output.append("")
        
        return "\n".join(output)
    
    def generate_linkedin_summary(self) -> str:
        """Generate LinkedIn-formatted summary"""
        output = []
        
        # Use long summary or LinkedIn variant
        summary = self.profile['summary']
        linkedin_summary = summary.get('long', summary.get('short', ''))
        output.append(linkedin_summary)
        output.append("")
        
        # Add specialisations from skills
        skills = self.profile.get('skills', {})
        specialisations = []
        
        if skills.get('programme_management'):
            specialisations.extend(skills['programme_management'][:3])
        if skills.get('technical', {}).get('methodologies'):
            specialisations.extend(skills['technical']['methodologies'][:3])
        
        if specialisations:
            output.append(f"Specialisations: {', '.join(specialisations)}")
            output.append("")
        
        # Key achievements from recent experience
        experiences = self.filter_by_include_in(self.profile.get('experience', []), 'linkedin')
        recent_achievements = []
        
        for exp in experiences[:2]:  # Last 2 roles
            achievements = exp.get('achievements', [])
            for ach in achievements:
                if isinstance(ach, dict) and ach.get('highlight'):
                    recent_achievements.append(ach['text'])
                elif isinstance(ach, str):
                    recent_achievements.append(ach)
            
            if len(recent_achievements) >= 3:
                break
        
        if recent_achievements:
            output.append("Recent achievements:")
            for ach in recent_achievements[:3]:
                output.append(f"• {ach}")
            output.append("")
        
        # Certifications
        certs = self.filter_by_include_in(self.profile.get('certifications', []), 'linkedin')
        active_certs = [c for c in certs if c.get('status') == 'active']
        
        if active_certs:
            cert_names = [c['name'] for c in active_certs]
            output.append(f"Certifications: {', '.join(cert_names)}")
        
        return "\n".join(output)
    
    def generate_brief_bio(self, max_words: int = 100) -> str:
        """Generate brief bio for websites/profiles"""
        personal = self.profile['personal']
        summary = self.profile['summary'].get('short', '')
        
        # Get top certifications
        certs = self.filter_by_priority(self.profile.get('certifications', []), 'high')
        cert_names = [c['name'] for c in certs[:3]]
        
        bio = f"{personal['name']} is a {personal['title']}. {summary}"
        
        if cert_names:
            bio += f" Certified in {', '.join(cert_names)}."
        
        return bio
    
    def generate_stats_summary(self) -> Dict[str, Any]:
        """Generate statistics about your profile"""
        stats = {
            'total_experience_years': 0,
            'total_jobs': len(self.profile.get('experience', [])),
            'total_certifications': len(self.profile.get('certifications', [])),
            'active_certifications': len([c for c in self.profile.get('certifications', []) 
                                         if c.get('status') == 'active']),
            'total_education': len(self.profile.get('education', [])),
            'total_projects': len(self.profile.get('projects', [])),
            'cpd_items': len(self.profile.get('cpd', [])),
            'publications': len(self.profile.get('publications', [])),
            'speaking_engagements': len(self.profile.get('speaking', []))
        }
        
        # Calculate years of experience
        for exp in self.profile.get('experience', []):
            if exp.get('duration_years'):
                stats['total_experience_years'] += exp['duration_years']
        
        return stats

def main():
    parser = argparse.ArgumentParser(
        description='Generate filtered outputs from your master JSON profile'
    )
    parser.add_argument(
        '--profile',
        type=str,
        default='inputs/my_profile.json',
        help='Path to your profile JSON (default: inputs/my_profile.json)'
    )
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        choices=['cv', 'linkedin', 'bio', 'stats'],
        help='Type of output to generate'
    )
    parser.add_argument(
        '--focus',
        type=str,
        help='Focus area (e.g., technical, leadership, programme_management)'
    )
    parser.add_argument(
        '--max-experiences',
        type=int,
        help='Maximum number of experiences to include in CV'
    )
    parser.add_argument(
        '--save',
        type=str,
        help='Save output to file (provide filename)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Profile Output Generator")
    print("=" * 60)
    print(f"Profile:      {args.profile}")
    print(f"Output type:  {args.output}")
    if args.focus:
        print(f"Focus:        {args.focus}")
    print("=" * 60)
    print()
    
    # Load profile
    try:
        generator = ProfileOutputGenerator(args.profile)
    except FileNotFoundError:
        print(f"❌ Error: Profile file not found at {args.profile}")
        return
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {args.profile}")
        return
    
    # Generate output
    output_content = ""
    
    if args.output == 'cv':
        print("📄 Generating CV...")
        output_content = generator.generate_cv_markdown(
            focus=args.focus,
            max_experiences=args.max_experiences
        )
    
    elif args.output == 'linkedin':
        print("💼 Generating LinkedIn summary...")
        output_content = generator.generate_linkedin_summary()
    
    elif args.output == 'bio':
        print("✍️ Generating brief bio...")
        output_content = generator.generate_brief_bio()
    
    elif args.output == 'stats':
        print("📊 Generating profile statistics...")
        stats = generator.generate_stats_summary()
        output_content = json.dumps(stats, indent=2)
    
    # Display or save
    if args.save:
        output_path = Path(args.save)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output_content)
        
        print(f"✅ Saved to: {output_path}")
    else:
        print()
        print("=" * 60)
        print("OUTPUT")
        print("=" * 60)
        print()
        print(output_content)
        print()
        print("=" * 60)
        print()
        print("💡 Tip: Use --save filename.md to save output to a file")

if __name__ == "__main__":
    main()