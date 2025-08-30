"""
Multi-Document Synthesis Engine for combining information from multiple uploaded documents.
"""

from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from collections import defaultdict
import re
import json

@dataclass
class DocumentCluster:
    """Represents a cluster of related document snippets"""
    theme: str
    snippets: List[str]
    file_sources: List[str]
    confidence: float
    relationships: List[str]  # How snippets relate to each other

@dataclass
class SynthesisResult:
    """Result of multi-document synthesis"""
    document_clusters: List[DocumentCluster]
    cross_references: Dict[str, List[str]]
    content_gaps: List[str]
    synthesis_summary: str
    recommended_structure: List[Dict[str, Any]]

class MultiDocumentSynthesizer:
    """Intelligently combines information from multiple documents"""
    
    def __init__(self):
        # Common relationship indicators
        self.relationship_patterns = {
            'sequence': ['first', 'second', 'third', 'next', 'then', 'after', 'before', 'finally'],
            'causation': ['because', 'since', 'therefore', 'as a result', 'consequently', 'due to'],
            'comparison': ['however', 'on the other hand', 'whereas', 'compared to', 'unlike', 'similar to'],
            'addition': ['also', 'furthermore', 'moreover', 'in addition', 'additionally', 'besides'],
            'example': ['for example', 'for instance', 'such as', 'including', 'namely', 'specifically'],
            'conclusion': ['in conclusion', 'to summarize', 'overall', 'in summary', 'finally']
        }
        
        # Content type indicators for clustering
        self.content_types = {
            'procedures': ['step', 'procedure', 'process', 'method', 'how to', 'instructions'],
            'requirements': ['requirement', 'must', 'shall', 'should', 'need', 'necessary'],
            'specifications': ['specification', 'spec', 'parameter', 'configuration', 'setting'],
            'background': ['background', 'context', 'overview', 'introduction', 'history'],
            'examples': ['example', 'sample', 'demo', 'illustration', 'case study'],
            'troubleshooting': ['error', 'problem', 'issue', 'troubleshoot', 'fix', 'solution'],
            'reference': ['reference', 'documentation', 'manual', 'guide', 'api', 'endpoint']
        }

    def synthesize_documents(self, snippets_by_file: Dict[str, List[str]]) -> SynthesisResult:
        """
        Main synthesis function that combines multiple documents intelligently
        
        Args:
            snippets_by_file: Dictionary mapping file paths to lists of text snippets
        
        Returns:
            SynthesisResult with organized and synthesized content
        """
        
        # Step 1: Cluster related content across documents
        document_clusters = self._cluster_related_content(snippets_by_file)
        
        # Step 2: Identify cross-references and relationships
        cross_references = self._identify_cross_references(snippets_by_file)
        
        # Step 3: Detect content gaps
        content_gaps = self._detect_content_gaps(document_clusters, snippets_by_file)
        
        # Step 4: Generate synthesis summary
        synthesis_summary = self._generate_synthesis_summary(document_clusters, snippets_by_file)
        
        # Step 5: Recommend document structure
        recommended_structure = self._recommend_document_structure(document_clusters)
        
        return SynthesisResult(
            document_clusters=document_clusters,
            cross_references=cross_references,
            content_gaps=content_gaps,
            synthesis_summary=synthesis_summary,
            recommended_structure=recommended_structure
        )

    def _cluster_related_content(self, snippets_by_file: Dict[str, List[str]]) -> List[DocumentCluster]:
        """Cluster related content across multiple documents"""
        clusters = []
        
        # Collect all snippets with their source files
        all_snippets = []
        for file_path, snippets in snippets_by_file.items():
            for snippet in snippets:
                all_snippets.append((snippet, file_path))
        
        # Cluster by content type and theme
        content_clusters = defaultdict(list)
        
        for snippet, file_path in all_snippets:
            snippet_lower = snippet.lower()
            
            # Determine content type
            content_type = self._classify_content_type(snippet_lower)
            
            # Extract key themes/topics
            themes = self._extract_themes_from_snippet(snippet)
            
            # Cluster by content type and primary theme
            primary_theme = themes[0] if themes else "general"
            cluster_key = f"{content_type}_{primary_theme}"
            
            content_clusters[cluster_key].append({
                'snippet': snippet,
                'file_path': file_path,
                'themes': themes,
                'content_type': content_type
            })
        
        # Convert to DocumentCluster objects
        for cluster_key, items in content_clusters.items():
            if len(items) >= 2:  # Only create clusters with multiple items
                content_type, primary_theme = cluster_key.split('_', 1)
                
                snippets = [item['snippet'] for item in items]
                file_sources = list(set(item['file_path'] for item in items))
                
                # Calculate confidence based on theme consistency and file diversity
                theme_consistency = self._calculate_theme_consistency(items)
                file_diversity = len(file_sources) / len(snippets_by_file)
                confidence = (theme_consistency + file_diversity) / 2
                
                # Identify relationships between snippets
                relationships = self._identify_snippet_relationships(snippets)
                
                clusters.append(DocumentCluster(
                    theme=f"{content_type.title()}: {primary_theme.replace('_', ' ').title()}",
                    snippets=snippets,
                    file_sources=file_sources,
                    confidence=confidence,
                    relationships=relationships
                ))
        
        # Sort clusters by confidence
        clusters.sort(key=lambda x: x.confidence, reverse=True)
        return clusters

    def _classify_content_type(self, text: str) -> str:
        """Classify the type of content in a text snippet"""
        scores = {}
        
        for content_type, keywords in self.content_types.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                scores[content_type] = score
        
        return max(scores.keys(), key=scores.get) if scores else 'general'

    def _extract_themes_from_snippet(self, snippet: str) -> List[str]:
        """Extract key themes from a snippet"""
        # Simple keyword extraction (could be enhanced with NLP)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', snippet.lower())
        
        # Remove common words
        stop_words = {'that', 'this', 'with', 'from', 'they', 'been', 'have', 'were', 'will', 'would', 'could', 'should', 'might', 'must', 'need', 'want', 'like', 'know', 'think', 'make', 'take', 'come', 'give', 'work', 'time', 'year', 'good', 'well', 'much', 'many', 'more', 'most', 'some', 'very', 'just', 'only', 'also', 'even', 'back', 'here', 'where', 'when', 'what', 'which', 'while', 'these', 'those', 'about', 'after', 'before', 'between', 'during', 'through', 'under', 'above', 'below'}
        
        # Count frequency
        word_freq = {}
        for word in words:
            if word not in stop_words and len(word) > 3:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Return top themes
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:5]]

    def _calculate_theme_consistency(self, items: List[Dict]) -> float:
        """Calculate how consistent themes are across items"""
        all_themes = []
        for item in items:
            all_themes.extend(item['themes'])
        
        if not all_themes:
            return 0.0
        
        # Calculate theme overlap
        theme_counts = {}
        for theme in all_themes:
            theme_counts[theme] = theme_counts.get(theme, 0) + 1
        
        # Consistency is based on how many themes appear multiple times
        repeated_themes = sum(1 for count in theme_counts.values() if count > 1)
        return repeated_themes / len(set(all_themes)) if set(all_themes) else 0.0

    def _identify_snippet_relationships(self, snippets: List[str]) -> List[str]:
        """Identify relationships between snippets in a cluster"""
        relationships = []
        
        # Look for sequence indicators
        sequence_found = any(
            any(indicator in snippet.lower() for indicator in self.relationship_patterns['sequence'])
            for snippet in snippets
        )
        if sequence_found:
            relationships.append("Sequential process/procedure")
        
        # Look for causal relationships
        causal_found = any(
            any(indicator in snippet.lower() for indicator in self.relationship_patterns['causation'])
            for snippet in snippets
        )
        if causal_found:
            relationships.append("Cause-effect relationships")
        
        # Look for examples and illustrations
        example_found = any(
            any(indicator in snippet.lower() for indicator in self.relationship_patterns['example'])
            for snippet in snippets
        )
        if example_found:
            relationships.append("Examples and illustrations")
        
        # Check for complementary information
        if len(snippets) > 1:
            relationships.append("Complementary information")
        
        return relationships

    def _identify_cross_references(self, snippets_by_file: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Identify cross-references between different files"""
        cross_refs = defaultdict(list)
        
        # Extract potential references (capitalized terms, acronyms, etc.)
        file_references = {}
        for file_path, snippets in snippets_by_file.items():
            file_text = ' '.join(snippets).lower()
            
            # Find capitalized terms (potential proper nouns, acronyms)
            references = set(re.findall(r'\b[A-Z][A-Z0-9_]{2,}\b', ' '.join(snippets)))
            # Find quoted terms
            references.update(re.findall(r'"([^"]+)"', file_text))
            # Find terms in backticks (code references)
            references.update(re.findall(r'`([^`]+)`', file_text))
            
            file_references[file_path] = references
        
        # Find common references between files
        file_paths = list(file_references.keys())
        for i, file1 in enumerate(file_paths):
            for file2 in file_paths[i+1:]:
                common_refs = file_references[file1] & file_references[file2]
                if common_refs:
                    cross_refs[file1].extend([f"Shares {len(common_refs)} references with {file2}"])
                    cross_refs[file2].extend([f"Shares {len(common_refs)} references with {file1}"])
        
        return dict(cross_refs)

    def _detect_content_gaps(self, clusters: List[DocumentCluster], snippets_by_file: Dict[str, List[str]]) -> List[str]:
        """Detect potential gaps in content coverage"""
        gaps = []
        
        # Analyze cluster coverage
        covered_types = set()
        for cluster in clusters:
            if cluster.confidence > 0.5:
                content_type = cluster.theme.split(':')[0].lower()
                covered_types.add(content_type)
        
        # Check for missing common content types
        expected_types = ['procedures', 'requirements', 'specifications', 'examples']
        missing_types = set(expected_types) - covered_types
        
        for missing_type in missing_types:
            gaps.append(f"Missing {missing_type} documentation")
        
        # Check for single-file clusters (potential isolation)
        isolated_content = [cluster for cluster in clusters if len(cluster.file_sources) == 1]
        if len(isolated_content) > len(clusters) * 0.5:
            gaps.append("Many topics appear in only one document - consider cross-referencing")
        
        # Check for low-confidence clusters
        low_confidence = [cluster for cluster in clusters if cluster.confidence < 0.3]
        if low_confidence:
            gaps.append(f"{len(low_confidence)} topics have unclear relationships between documents")
        
        return gaps

    def _generate_synthesis_summary(self, clusters: List[DocumentCluster], snippets_by_file: Dict[str, List[str]]) -> str:
        """Generate a summary of the document synthesis"""
        total_files = len(snippets_by_file)
        total_clusters = len(clusters)
        high_confidence_clusters = len([c for c in clusters if c.confidence > 0.7])
        
        summary = f"Synthesized {total_files} documents into {total_clusters} thematic clusters."
        
        if high_confidence_clusters > 0:
            summary += f" {high_confidence_clusters} clusters have high confidence for coherent documentation."
        
        # Identify most prominent themes
        if clusters:
            top_themes = [cluster.theme for cluster in clusters[:3]]
            summary += f" Main themes: {', '.join(top_themes)}."
        
        # Cross-document coverage
        multi_file_clusters = [c for c in clusters if len(c.file_sources) > 1]
        if multi_file_clusters:
            coverage = len(multi_file_clusters) / total_clusters * 100
            summary += f" {coverage:.0f}% of content spans multiple documents."
        
        return summary

    def _recommend_document_structure(self, clusters: List[DocumentCluster]) -> List[Dict[str, Any]]:
        """Recommend an optimal document structure based on clusters"""
        structure = []
        
        # Sort clusters by logical order (background -> requirements -> procedures -> examples -> reference)
        type_order = ['background', 'requirements', 'specifications', 'procedures', 'examples', 'troubleshooting', 'reference']
        
        ordered_clusters = []
        for type_name in type_order:
            matching_clusters = [c for c in clusters if type_name in c.theme.lower()]
            ordered_clusters.extend(sorted(matching_clusters, key=lambda x: x.confidence, reverse=True))
        
        # Add remaining clusters
        remaining_clusters = [c for c in clusters if c not in ordered_clusters]
        ordered_clusters.extend(sorted(remaining_clusters, key=lambda x: x.confidence, reverse=True))
        
        # Create structure recommendations
        for i, cluster in enumerate(ordered_clusters):
            section = {
                'title': cluster.theme,
                'priority': 'high' if cluster.confidence > 0.7 else 'medium' if cluster.confidence > 0.4 else 'low',
                'source_files': len(cluster.file_sources),
                'content_pieces': len(cluster.snippets),
                'relationships': cluster.relationships,
                'recommended_placement': i + 1
            }
            structure.append(section)
        
        return structure