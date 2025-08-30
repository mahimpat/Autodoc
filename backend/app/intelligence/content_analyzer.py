"""
Content Intelligence Engine for analyzing uploaded documents and recommending templates.
"""

import re
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass
from collections import Counter

@dataclass
class ContentAnalysis:
    """Comprehensive analysis of uploaded content"""
    document_type: str
    confidence: float
    key_themes: List[str]
    content_structure: Dict[str, Any]
    recommended_templates: List[Tuple[str, float]]  # (template_id, confidence)
    content_summary: str
    detected_sections: List[str]
    metadata: Dict[str, Any]

class ContentIntelligenceEngine:
    """Analyzes uploaded content to understand document type and recommend templates"""
    
    def __init__(self):
        # Document type patterns and their indicators
        self.document_patterns = {
            'contract': {
                'keywords': ['contract', 'agreement', 'party', 'parties', 'terms', 'conditions', 'obligations', 'breach', 'termination', 'liability', 'payment', 'consideration', 'whereas', 'hereby', 'shall', 'tenant', 'landlord', 'employee', 'employer', 'salary', 'compensation'],
                'phrases': ['in consideration of', 'party of the first part', 'party of the second part', 'effective date', 'term of this agreement', 'subject to the terms'],
                'structure': ['signature', 'date', 'witness', 'notary'],
                'weight': 1.0
            },
            'technical_documentation': {
                'keywords': ['api', 'function', 'method', 'class', 'parameter', 'return', 'response', 'request', 'endpoint', 'configuration', 'installation', 'setup', 'deployment', 'architecture', 'system', 'database', 'server', 'client', 'protocol', 'interface'],
                'phrases': ['how to install', 'getting started', 'api reference', 'configuration file', 'environment variable', 'command line'],
                'structure': ['code block', 'example', 'syntax', 'command'],
                'weight': 1.0
            },
            'project_documentation': {
                'keywords': ['project', 'milestone', 'deliverable', 'timeline', 'scope', 'requirement', 'specification', 'stakeholder', 'budget', 'resource', 'task', 'objective', 'goal', 'phase', 'sprint', 'epic', 'user story'],
                'phrases': ['project scope', 'project timeline', 'success criteria', 'project objectives', 'project deliverables', 'project milestones'],
                'structure': ['gantt', 'timeline', 'roadmap', 'backlog'],
                'weight': 1.0
            },
            'research_report': {
                'keywords': ['research', 'study', 'analysis', 'methodology', 'hypothesis', 'experiment', 'data', 'results', 'conclusion', 'findings', 'literature', 'review', 'survey', 'sample', 'statistical', 'significant', 'correlation'],
                'phrases': ['research question', 'literature review', 'data collection', 'statistical analysis', 'research methodology', 'study limitations'],
                'structure': ['abstract', 'bibliography', 'references', 'appendix'],
                'weight': 1.0
            },
            'meeting_notes': {
                'keywords': ['meeting', 'agenda', 'minutes', 'attendees', 'action', 'items', 'decisions', 'discussion', 'follow-up', 'next steps', 'assigned', 'due date', 'owner', 'notes'],
                'phrases': ['action items', 'meeting minutes', 'next steps', 'follow up', 'decision made', 'discussed'],
                'structure': ['bullet points', 'numbered list', 'attendee list'],
                'weight': 0.9
            },
            'financial_document': {
                'keywords': ['financial', 'budget', 'cost', 'expense', 'revenue', 'profit', 'loss', 'investment', 'roi', 'cash flow', 'balance', 'asset', 'liability', 'equity', 'tax', 'audit', 'risk', 'valuation'],
                'phrases': ['financial analysis', 'cash flow', 'return on investment', 'risk assessment', 'budget allocation'],
                'structure': ['table', 'chart', 'financial statement'],
                'weight': 1.0
            },
            'medical_document': {
                'keywords': ['patient', 'medical', 'clinical', 'diagnosis', 'treatment', 'symptom', 'procedure', 'medication', 'therapy', 'protocol', 'study', 'trial', 'health', 'disease', 'condition', 'examination'],
                'phrases': ['medical history', 'clinical trial', 'treatment plan', 'medical procedure', 'patient care'],
                'structure': ['medical chart', 'prescription', 'lab results'],
                'weight': 1.0
            },
            'general_notes': {
                'keywords': ['note', 'notes', 'idea', 'thoughts', 'draft', 'outline', 'summary', 'overview', 'information', 'details'],
                'phrases': ['take note', 'important point', 'remember', 'to do', 'follow up'],
                'structure': ['bullet points', 'numbered list', 'heading'],
                'weight': 0.5
            }
        }
        
        # Template mapping based on document types
        self.template_mappings = {
            'contract': [
                ('uploaded_contract_analysis', 1.0),
                ('content_driven_docs', 0.8),
                ('legal_contract_analysis', 0.7),
                ('uploaded_content_docs', 0.6)
            ],
            'technical_documentation': [
                ('technical_documentation', 1.0),
                ('content_driven_docs', 0.9),
                ('api_library_docs', 0.8),
                ('tdd', 0.7),
                ('uploaded_content_docs', 0.6)
            ],
            'project_documentation': [
                ('project_documentation', 1.0),
                ('content_driven_docs', 0.9),
                ('uploaded_content_docs', 0.7),
                ('tdd', 0.5)
            ],
            'research_report': [
                ('research_report', 1.0),
                ('content_driven_docs', 0.8),
                ('experiment_record', 0.7),
                ('uploaded_content_docs', 0.6)
            ],
            'meeting_notes': [
                ('content_driven_docs', 1.0),
                ('project_documentation', 0.8),
                ('uploaded_content_docs', 0.9)
            ],
            'financial_document': [
                ('finance_investment_analysis', 0.9),
                ('finance_risk_assessment', 0.8),
                ('content_driven_docs', 1.0),
                ('uploaded_content_docs', 0.7)
            ],
            'medical_document': [
                ('medical_case_report', 0.9),
                ('medical_clinical_study', 0.8),
                ('content_driven_docs', 1.0),
                ('uploaded_content_docs', 0.7)
            ],
            'general_notes': [
                ('content_driven_docs', 1.0),
                ('uploaded_content_docs', 0.9)
            ]
        }

    def analyze_content(self, text_content: str, filename: str = "") -> ContentAnalysis:
        """Perform comprehensive content analysis"""
        
        # Clean and prepare text
        clean_text = self._clean_text(text_content)
        
        # Document type detection
        document_type, type_confidence = self._detect_document_type(clean_text)
        
        # Extract key themes
        key_themes = self._extract_key_themes(clean_text)
        
        # Analyze content structure
        content_structure = self._analyze_structure(clean_text)
        
        # Detect sections
        detected_sections = self._detect_sections(clean_text)
        
        # Recommend templates
        recommended_templates = self._recommend_templates(document_type, type_confidence, content_structure)
        
        # Generate summary
        content_summary = self._generate_summary(clean_text, key_themes)
        
        # Extract metadata
        metadata = self._extract_metadata(text_content, filename)
        
        return ContentAnalysis(
            document_type=document_type,
            confidence=type_confidence,
            key_themes=key_themes,
            content_structure=content_structure,
            recommended_templates=recommended_templates,
            content_summary=content_summary,
            detected_sections=detected_sections,
            metadata=metadata
        )

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for analysis"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep structure
        text = re.sub(r'[^\w\s\.,!?;:()\-\[\]{}]', ' ', text)
        return text.lower()

    def _detect_document_type(self, text: str) -> Tuple[str, float]:
        """Detect the type of document based on content patterns"""
        scores = {}
        
        for doc_type, patterns in self.document_patterns.items():
            score = 0.0
            word_count = len(text.split())
            
            # Keyword matching
            for keyword in patterns['keywords']:
                count = text.count(keyword)
                score += (count / word_count) * 100 * patterns['weight']
            
            # Phrase matching (higher weight)
            for phrase in patterns['phrases']:
                if phrase in text:
                    score += 10 * patterns['weight']
            
            # Structure indicators
            for structure in patterns['structure']:
                if structure in text:
                    score += 5 * patterns['weight']
            
            scores[doc_type] = score
        
        if not scores or max(scores.values()) == 0:
            return 'general_notes', 0.3
        
        best_type = max(scores, key=scores.get)
        confidence = min(scores[best_type] / 10, 1.0)  # Normalize to 0-1
        
        return best_type, confidence

    def _extract_key_themes(self, text: str) -> List[str]:
        """Extract key themes and topics from the content"""
        words = text.split()
        
        # Filter out common words
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'}
        
        # Count word frequency
        word_freq = Counter([word for word in words if len(word) > 3 and word not in stop_words])
        
        # Return top themes
        return [word for word, count in word_freq.most_common(10)]

    def _analyze_structure(self, text: str) -> Dict[str, Any]:
        """Analyze the structural elements of the content"""
        structure = {
            'has_headings': bool(re.search(r'(^|\n)(#{1,6}\s|[A-Z][A-Z\s]{10,})', text)),
            'has_lists': bool(re.search(r'(^|\n)[\s]*[-*•]\s', text) or re.search(r'(^|\n)[\s]*\d+\.', text)),
            'has_tables': text.count('|') > 5 or 'table' in text,
            'has_code': bool(re.search(r'```|`[^`]+`', text)),
            'paragraph_count': len([p for p in text.split('\n\n') if p.strip()]),
            'average_paragraph_length': 0,
            'has_dates': bool(re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}', text)),
            'has_numbers': bool(re.search(r'\$[\d,]+|\d+%|\d+\.\d+', text)),
            'has_signatures': 'signature' in text or 'signed' in text,
            'formality_level': self._assess_formality(text)
        }
        
        paragraphs = [p for p in text.split('\n\n') if p.strip()]
        if paragraphs:
            structure['average_paragraph_length'] = sum(len(p.split()) for p in paragraphs) / len(paragraphs)
        
        return structure

    def _assess_formality(self, text: str) -> str:
        """Assess the formality level of the text"""
        formal_indicators = ['hereby', 'whereas', 'furthermore', 'therefore', 'pursuant', 'shall', 'notwithstanding']
        informal_indicators = ['gonna', 'wanna', 'stuff', 'things', 'like', 'you know']
        
        formal_count = sum(1 for word in formal_indicators if word in text)
        informal_count = sum(1 for word in informal_indicators if word in text)
        
        if formal_count > informal_count + 2:
            return 'formal'
        elif informal_count > formal_count:
            return 'informal'
        else:
            return 'neutral'

    def _detect_sections(self, text: str) -> List[str]:
        """Detect potential section headings in the content"""
        sections = []
        
        # Look for markdown-style headings
        heading_matches = re.findall(r'#{1,6}\s+([^\n]+)', text)
        sections.extend(heading_matches)
        
        # Look for all-caps headings
        caps_matches = re.findall(r'\n([A-Z][A-Z\s]{5,})\n', text)
        sections.extend(caps_matches)
        
        # Look for numbered sections
        numbered_matches = re.findall(r'\n\d+\.\s+([^\n]+)', text)
        sections.extend(numbered_matches)
        
        return [section.strip() for section in sections if len(section.strip()) > 2]

    def _recommend_templates(self, document_type: str, confidence: float, structure: Dict[str, Any]) -> List[Tuple[str, float]]:
        """Recommend templates based on document analysis"""
        recommendations = []
        
        # Get base recommendations for document type
        if document_type in self.template_mappings:
            base_recommendations = self.template_mappings[document_type]
        else:
            base_recommendations = self.template_mappings['general_notes']
        
        # Adjust recommendations based on structure and confidence
        for template_id, base_score in base_recommendations:
            adjusted_score = base_score * confidence
            
            # Bonus for structured content
            if structure.get('has_headings') and 'content_driven' in template_id:
                adjusted_score += 0.1
            if structure.get('has_tables') and 'technical' in template_id:
                adjusted_score += 0.1
            if structure.get('formality_level') == 'formal' and 'legal' in template_id:
                adjusted_score += 0.1
            
            recommendations.append((template_id, min(adjusted_score, 1.0)))
        
        # Sort by confidence and return top 5
        recommendations.sort(key=lambda x: x[1], reverse=True)
        return recommendations[:5]

    def _generate_summary(self, text: str, themes: List[str]) -> str:
        """Generate a brief summary of the content"""
        word_count = len(text.split())
        paragraph_count = len([p for p in text.split('\n\n') if p.strip()])
        
        summary = f"Document contains {word_count} words across {paragraph_count} paragraphs"
        
        if themes:
            theme_text = ', '.join(themes[:5])
            summary += f". Key themes: {theme_text}"
        
        return summary

    def _extract_metadata(self, original_text: str, filename: str) -> Dict[str, Any]:
        """Extract metadata from the document"""
        metadata = {
            'filename': filename,
            'word_count': len(original_text.split()),
            'character_count': len(original_text),
            'line_count': len(original_text.split('\n')),
            'has_images': 'image' in original_text.lower() or 'figure' in original_text.lower(),
            'language': 'english',  # Could be enhanced with language detection
            'estimated_reading_time': max(1, len(original_text.split()) // 200)  # ~200 WPM
        }
        
        # Extract dates
        date_matches = re.findall(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}', original_text)
        if date_matches:
            metadata['dates_found'] = date_matches[:5]  # First 5 dates
        
        # Extract email addresses
        email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', original_text)
        if email_matches:
            metadata['emails_found'] = email_matches[:5]
        
        return metadata