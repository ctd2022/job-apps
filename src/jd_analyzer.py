#!/usr/bin/env python3
"""
JD Red-flag Detector (Idea #32)
Analyzes job descriptions for warning signs and green flags, independent of CV matching.
"""

import re
from llm_backend import LLMBackend

VALID_CATEGORIES = {"unrealistic_requirements", "culture_warning", "scope_overload", "transparency"}
VALID_SEVERITIES = {"high", "medium", "low"}
VALID_RISKS = {"low", "medium", "high", "critical"}


class JDAnalyzer:
    def __init__(self, backend: LLMBackend):
        self.backend = backend

    def analyze(self, jd_text: str) -> dict:
        messages = self._build_prompt(jd_text)
        raw = self.backend.chat(messages, temperature=0.3, max_tokens=1200)
        return self._parse_response(raw)

    def _build_prompt(self, jd_text: str) -> list[dict]:
        system = (
            "You are an expert job market analyst. Analyze job descriptions for red flags "
            "and green flags. Output ONLY structured blocks — no prose before or after.\n\n"
            "Categories to detect:\n"
            "- unrealistic_requirements: years of experience vs technology age, contradictory seniority signals\n"
            "- culture_warning: hustle language (rockstar, fast-paced, wear many hats), unclear work-life signals\n"
            "- scope_overload: one role across too many domains, vague catch-all duties\n"
            "- transparency: no salary range, vague responsibilities, no team size or reporting structure\n\n"
            "Output format (repeat for each red flag, separated by ---):\n"
            "RED_FLAG:\n"
            "CATEGORY: <unrealistic_requirements|culture_warning|scope_overload|transparency>\n"
            "SEVERITY: <high|medium|low>\n"
            "TITLE: <short title>\n"
            "DETAIL: <one sentence explanation>\n"
            "EVIDENCE: <verbatim quote from JD, or NONE>\n"
            "---\n\n"
            "For each green flag (separated by ---):\n"
            "GREEN_FLAG:\n"
            "CATEGORY: <category label>\n"
            "TITLE: <short title>\n"
            "DETAIL: <one sentence explanation>\n"
            "---\n\n"
            "After all flags:\n"
            "OVERALL_RISK: <low|medium|high|critical>\n"
            "SUMMARY: <one sentence overall assessment>"
        )

        user = f"Analyze this job description for red flags and green flags:\n\n{jd_text[:4000]}"
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def _parse_response(self, raw: str) -> dict:
        red_flags: list[dict] = []
        green_flags: list[dict] = []
        overall_risk = "low"
        summary = ""

        # Split into blocks by ---
        blocks = re.split(r'\n---\n|\n---$', raw)

        for block in blocks:
            block = block.strip()
            if not block:
                continue

            lines = [l for l in block.split('\n') if l.strip()]
            if not lines:
                continue

            first = lines[0].strip()

            if first == "RED_FLAG:":
                flag = self._parse_flag_block(lines[1:])
                if flag:
                    red_flags.append(flag)
            elif first == "GREEN_FLAG:":
                gflag = self._parse_green_flag_block(lines[1:])
                if gflag:
                    green_flags.append(gflag)

        # Parse OVERALL_RISK and SUMMARY (appear at the end, after all --- blocks)
        risk_match = re.search(r'OVERALL_RISK:\s*(\w+)', raw, re.IGNORECASE)
        if risk_match:
            val = risk_match.group(1).lower()
            if val in VALID_RISKS:
                overall_risk = val

        summary_match = re.search(r'SUMMARY:\s*(.+?)(?:\n|$)', raw, re.IGNORECASE)
        if summary_match:
            summary = summary_match.group(1).strip()

        return {
            "red_flags": red_flags,
            "green_flags": green_flags,
            "overall_risk": overall_risk,
            "summary": summary,
            "total_red_flags": len(red_flags),
        }

    def _parse_flag_block(self, lines: list[str]) -> dict | None:
        data = self._parse_key_value(lines)
        category = data.get("CATEGORY", "").lower()
        severity = data.get("SEVERITY", "").lower()
        title = data.get("TITLE", "")
        detail = data.get("DETAIL", "")
        evidence = data.get("EVIDENCE", None)

        if not title:
            return None

        if category not in VALID_CATEGORIES:
            category = "transparency"
        if severity not in VALID_SEVERITIES:
            severity = "medium"

        if evidence and evidence.upper().strip() in ("NONE", "N/A", ""):
            evidence = None

        return {
            "category": category,
            "severity": severity,
            "title": title,
            "detail": detail,
            "evidence": evidence,
        }

    def _parse_green_flag_block(self, lines: list[str]) -> dict | None:
        data = self._parse_key_value(lines)
        title = data.get("TITLE", "")
        if not title:
            return None
        return {
            "category": data.get("CATEGORY", ""),
            "title": title,
            "detail": data.get("DETAIL", ""),
        }

    def _parse_key_value(self, lines: list[str]) -> dict[str, str]:
        result: dict[str, str] = {}
        current_key: str | None = None
        current_parts: list[str] = []

        for line in lines:
            m = re.match(r'^([A-Z_]+):\s*(.*)', line.strip())
            if m:
                if current_key:
                    result[current_key] = ' '.join(current_parts).strip()
                current_key = m.group(1)
                current_parts = [m.group(2)] if m.group(2) else []
            elif current_key and line.strip():
                current_parts.append(line.strip())

        if current_key:
            result[current_key] = ' '.join(current_parts).strip()

        return result
