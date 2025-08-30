"""
Content Intelligence API endpoints for analyzing uploaded documents and providing smart recommendations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json

from ..auth import get_current_user, get_db
from ..models import User, Snippet
from ..intelligence.content_analyzer import ContentIntelligenceEngine, ContentAnalysis
from ..intelligence.document_synthesizer import MultiDocumentSynthesizer

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

# Initialize the content intelligence engines
intelligence_engine = ContentIntelligenceEngine()
document_synthesizer = MultiDocumentSynthesizer()

@router.post("/analyze_content")
async def analyze_uploaded_content(
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyze all uploaded content for the user and provide intelligent insights
    """
    try:
        # Get all user's snippets (uploaded content)
        user_snippets = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.id.desc()).all()
        
        if not user_snippets:
            return {
                "status": "no_content",
                "message": "No uploaded content found for analysis",
                "recommendations": []
            }
        
        # Combine all content for analysis
        combined_content = "\n\n".join([snippet.text for snippet in user_snippets if snippet.text])
        
        # Analyze the combined content
        analysis = intelligence_engine.analyze_content(combined_content, "combined_uploads")
        
        # Prepare the response
        response = {
            "status": "success",
            "analysis": {
                "document_type": analysis.document_type,
                "confidence": analysis.confidence,
                "key_themes": analysis.key_themes,
                "content_structure": analysis.content_structure,
                "content_summary": analysis.content_summary,
                "detected_sections": analysis.detected_sections,
                "metadata": analysis.metadata
            },
            "template_recommendations": [
                {
                    "template_id": template_id,
                    "confidence": confidence,
                    "reason": _get_recommendation_reason(template_id, analysis)
                }
                for template_id, confidence in analysis.recommended_templates
            ],
            "insights": _generate_insights(analysis),
            "content_stats": {
                "total_snippets": len(user_snippets),
                "total_files": len(set(snippet.path for snippet in user_snippets if snippet.path)),
                "estimated_documents": _estimate_document_count(user_snippets)
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/recommend_templates")
async def get_template_recommendations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get template recommendations based on uploaded content
    """
    try:
        # Get recent user snippets for quick analysis
        recent_snippets = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.id.desc()).limit(10).all()
        
        if not recent_snippets:
            return {
                "recommendations": [
                    {"template_id": "content_driven_docs", "confidence": 1.0, "reason": "No uploaded content - flexible template recommended"},
                    {"template_id": "uploaded_content_docs", "confidence": 0.9, "reason": "General purpose upload-based template"}
                ]
            }
        
        # Quick analysis on recent content
        sample_content = "\n".join([snippet.text[:500] for snippet in recent_snippets if snippet.text])  # First 500 chars each
        analysis = intelligence_engine.analyze_content(sample_content, "recent_uploads")
        
        return {
            "recommendations": [
                {
                    "template_id": template_id,
                    "confidence": confidence,
                    "reason": _get_recommendation_reason(template_id, analysis)
                }
                for template_id, confidence in analysis.recommended_templates
            ],
            "detected_type": analysis.document_type,
            "confidence": analysis.confidence
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@router.post("/analyze_file_content")
async def analyze_specific_file_content(
    file_path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyze content from a specific uploaded file
    """
    try:
        # Get snippets for the specific file
        file_snippets = db.query(Snippet).filter_by(
            user_id=user.id, 
            path=file_path
        ).all()
        
        if not file_snippets:
            raise HTTPException(status_code=404, detail="File not found or no content extracted")
        
        # Combine content from this file
        file_content = "\n".join([snippet.text for snippet in file_snippets if snippet.text])
        
        # Analyze the file content
        analysis = intelligence_engine.analyze_content(file_content, file_path.split('/')[-1])
        
        return {
            "filename": file_path.split('/')[-1],
            "analysis": {
                "document_type": analysis.document_type,
                "confidence": analysis.confidence,
                "key_themes": analysis.key_themes,
                "content_structure": analysis.content_structure,
                "content_summary": analysis.content_summary,
                "detected_sections": analysis.detected_sections,
                "metadata": analysis.metadata
            },
            "template_recommendations": [
                {
                    "template_id": template_id,
                    "confidence": confidence,
                    "reason": _get_recommendation_reason(template_id, analysis)
                }
                for template_id, confidence in analysis.recommended_templates
            ]
        }
        
    except Exception as e:
        if "File not found" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"File analysis failed: {str(e)}")

@router.post("/synthesize_documents")
async def synthesize_multiple_documents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Synthesize information from multiple uploaded documents
    """
    try:
        # Get all user's snippets organized by file
        user_snippets = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.path, Snippet.id).all()
        
        if not user_snippets:
            return {
                "status": "no_content",
                "message": "No uploaded content found for synthesis",
                "synthesis": None
            }
        
        # Organize snippets by file
        snippets_by_file = {}
        for snippet in user_snippets:
            file_path = snippet.path or "unknown_file"
            if file_path not in snippets_by_file:
                snippets_by_file[file_path] = []
            if snippet.text:
                snippets_by_file[file_path].append(snippet.text)
        
        # Only synthesize if we have multiple files or substantial content
        if len(snippets_by_file) < 2 and sum(len(snippets) for snippets in snippets_by_file.values()) < 5:
            return {
                "status": "insufficient_content",
                "message": "Need multiple documents or more content for meaningful synthesis",
                "synthesis": None
            }
        
        # Perform synthesis
        synthesis_result = document_synthesizer.synthesize_documents(snippets_by_file)
        
        # Format response
        response = {
            "status": "success",
            "synthesis": {
                "summary": synthesis_result.synthesis_summary,
                "document_clusters": [
                    {
                        "theme": cluster.theme,
                        "confidence": cluster.confidence,
                        "source_files": [path.split('/')[-1] for path in cluster.file_sources],
                        "content_pieces": len(cluster.snippets),
                        "relationships": cluster.relationships,
                        "sample_content": cluster.snippets[0][:200] + "..." if cluster.snippets else ""
                    }
                    for cluster in synthesis_result.document_clusters
                ],
                "cross_references": {
                    path.split('/')[-1]: refs 
                    for path, refs in synthesis_result.cross_references.items()
                },
                "content_gaps": synthesis_result.content_gaps,
                "recommended_structure": synthesis_result.recommended_structure
            },
            "stats": {
                "total_files": len(snippets_by_file),
                "total_clusters": len(synthesis_result.document_clusters),
                "high_confidence_clusters": len([c for c in synthesis_result.document_clusters if c.confidence > 0.7]),
                "cross_file_clusters": len([c for c in synthesis_result.document_clusters if len(c.file_sources) > 1])
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document synthesis failed: {str(e)}")

@router.get("/content_gaps")
async def identify_content_gaps(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Identify gaps in uploaded content coverage
    """
    try:
        # Get synthesis data
        synthesis_response = await synthesize_multiple_documents(user, db)
        
        if synthesis_response["status"] != "success":
            return synthesis_response
        
        synthesis_data = synthesis_response["synthesis"]
        
        # Enhanced gap analysis
        gaps = {
            "content_gaps": synthesis_data["content_gaps"],
            "recommendations": [],
            "missing_content_types": [],
            "improvement_suggestions": []
        }
        
        # Analyze cluster distribution
        clusters = synthesis_data["document_clusters"]
        content_types = [cluster["theme"].split(':')[0].lower() for cluster in clusters]
        
        # Check for missing standard content types
        standard_types = ['background', 'requirements', 'procedures', 'examples', 'specifications']
        missing_types = [t for t in standard_types if not any(t in ct for ct in content_types)]
        gaps["missing_content_types"] = missing_types
        
        # Generate recommendations
        if missing_types:
            gaps["recommendations"].extend([
                f"Consider adding {content_type} documentation" 
                for content_type in missing_types
            ])
        
        # Check for isolated content
        isolated_clusters = [c for c in clusters if len(c["source_files"]) == 1]
        if len(isolated_clusters) > len(clusters) * 0.6:
            gaps["improvement_suggestions"].append(
                "Many topics appear in only one document - consider creating cross-references"
            )
        
        # Check for low confidence clusters
        low_confidence = [c for c in clusters if c["confidence"] < 0.4]
        if low_confidence:
            gaps["improvement_suggestions"].append(
                f"{len(low_confidence)} topics have unclear relationships - consider reorganizing content"
            )
        
        return {
            "status": "success",
            "gaps": gaps,
            "total_files_analyzed": synthesis_response["stats"]["total_files"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")

def _get_recommendation_reason(template_id: str, analysis: ContentAnalysis) -> str:
    """Generate human-readable reasons for template recommendations"""
    reasons = {
        'content_driven_docs': f"Best for {analysis.document_type} content - adapts to your actual content structure",
        'uploaded_content_docs': f"Flexible template good for {analysis.document_type} with structured output",
        'uploaded_contract_analysis': "Specialized for contract analysis - extracts terms, obligations, and conditions",
        'technical_documentation': "Optimized for technical content with API references and procedures",
        'project_documentation': "Ideal for project materials with timelines and requirements",
        'legal_contract_analysis': "Traditional legal analysis with standard contract review framework",
        'research_report': "Academic-style research documentation with methodology and findings",
        'tdd': "Technical design document for system architecture and implementation",
        'api_library_docs': "API and library documentation with examples and integration guides"
    }
    
    base_reason = reasons.get(template_id, f"Suitable for {analysis.document_type} content")
    
    # Add specific insights
    if analysis.content_structure.get('has_code'):
        base_reason += " (detected code/technical content)"
    if analysis.content_structure.get('has_tables'):
        base_reason += " (detected structured data/tables)"
    if analysis.content_structure.get('formality_level') == 'formal':
        base_reason += " (formal document style detected)"
    
    return base_reason

def _generate_insights(analysis: ContentAnalysis) -> List[str]:
    """Generate actionable insights about the content"""
    insights = []
    
    # Document type insights
    if analysis.confidence > 0.8:
        insights.append(f"High confidence detection: This appears to be a {analysis.document_type.replace('_', ' ')}")
    elif analysis.confidence > 0.5:
        insights.append(f"Likely a {analysis.document_type.replace('_', ' ')} document")
    else:
        insights.append("Document type unclear - consider using flexible content-driven templates")
    
    # Structure insights
    structure = analysis.content_structure
    if structure.get('has_headings'):
        insights.append("Document has clear headings - good for structured templates")
    if structure.get('has_lists'):
        insights.append("Contains lists/bullet points - good for procedural documentation")
    if structure.get('has_tables'):
        insights.append("Contains tables/structured data - consider technical or data-focused templates")
    if structure.get('has_code'):
        insights.append("Contains code blocks - technical documentation templates recommended")
    
    # Content insights
    if len(analysis.key_themes) > 5:
        insights.append("Rich thematic content - comprehensive templates will work well")
    if analysis.metadata.get('word_count', 0) > 1000:
        insights.append("Substantial content volume - suitable for detailed documentation")
    elif analysis.metadata.get('word_count', 0) < 200:
        insights.append("Brief content - consider concise or summary-focused templates")
    
    # Section insights
    if len(analysis.detected_sections) > 3:
        insights.append("Multiple sections detected - structured templates will preserve organization")
    
    return insights

def _estimate_document_count(snippets: List[Snippet]) -> int:
    """Estimate the number of distinct documents from snippets"""
    unique_paths = set(snippet.path for snippet in snippets if snippet.path)
    return len(unique_paths)