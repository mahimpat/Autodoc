"""
Advanced document analytics and insights system
Provides comprehensive metrics on document usage, performance, and team collaboration
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
from sqlalchemy import text, func
from sqlalchemy.orm import Session
import numpy as np
from collections import defaultdict, Counter

from ..models import User, Document, Snippet
from ..models_versioning import DocumentVersion, DocumentComment
from ..workflows.approval import ApprovalWorkflow, ApprovalRequest

class MetricType(Enum):
    VIEWS = "views"
    DOWNLOADS = "downloads" 
    SHARES = "shares"
    COMMENTS = "comments"
    APPROVALS = "approvals"
    GENERATION_TIME = "generation_time"
    COLLABORATION = "collaboration"

class TimeRange(Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

@dataclass
class DocumentMetrics:
    """Core document metrics"""
    document_id: int
    title: str
    total_views: int = 0
    unique_viewers: int = 0
    total_downloads: int = 0
    total_shares: int = 0
    total_comments: int = 0
    avg_rating: float = 0.0
    word_count: int = 0
    readability_score: float = 0.0
    collaboration_score: float = 0.0
    last_updated: datetime = None

@dataclass
class TeamMetrics:
    """Team collaboration metrics"""
    organization_id: int
    team_name: str
    total_documents: int = 0
    active_collaborators: int = 0
    avg_approval_time_hours: float = 0.0
    documents_per_member: float = 0.0
    collaboration_frequency: float = 0.0
    quality_score: float = 0.0

@dataclass
class UsagePattern:
    """Usage pattern analysis"""
    peak_hours: List[int]
    peak_days: List[str]
    seasonal_trends: Dict[str, float]
    user_behavior: Dict[str, Any]
    content_preferences: Dict[str, int]

class DocumentAnalytics:
    """Main analytics engine for documents"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_document_metrics(
        self, 
        document_id: int,
        time_range: Optional[TimeRange] = None
    ) -> DocumentMetrics:
        """Get comprehensive metrics for a specific document"""
        
        # Get document basic info
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Get latest version
        latest_version = self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(DocumentVersion.created_at.desc()).first()
        
        # Calculate metrics
        metrics = DocumentMetrics(
            document_id=document_id,
            title=document.title,
            last_updated=document.created_at
        )
        
        if latest_version:
            metrics.word_count = latest_version.word_count
            metrics.readability_score = latest_version.readability_score or 0.0
            metrics.last_updated = latest_version.created_at
        
        # Get view analytics (placeholder - would need actual view tracking)
        metrics.total_views = self._get_document_views(document_id, time_range)
        metrics.unique_viewers = self._get_unique_viewers(document_id, time_range)
        
        # Get interaction metrics
        metrics.total_comments = self._get_comment_count(document_id, time_range)
        metrics.total_shares = self._get_share_count(document_id, time_range)
        metrics.total_downloads = self._get_download_count(document_id, time_range)
        
        # Calculate collaboration score
        metrics.collaboration_score = self._calculate_collaboration_score(document_id)
        
        return metrics
    
    def get_team_analytics(
        self, 
        organization_id: int,
        time_range: TimeRange = TimeRange.MONTH
    ) -> TeamMetrics:
        """Get team-level analytics"""
        
        # Get organization info
        from ..models import Organization
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise ValueError(f"Organization {organization_id} not found")
        
        # Calculate time filter
        time_filter = self._get_time_filter(time_range)
        
        # Get team metrics
        team_docs = self.db.query(Document).join(
            DocumentVersion, Document.id == DocumentVersion.document_id
        ).filter(
            DocumentVersion.workspace_id.in_(
                self.db.query(Workspace.id).filter(Workspace.organization_id == organization_id)
            ),
            DocumentVersion.created_at >= time_filter
        ).all()
        
        # Count active collaborators
        active_collaborators = self.db.query(User).join(
            user_organization, User.id == user_organization.c.user_id
        ).filter(
            user_organization.c.organization_id == organization_id
        ).count()
        
        # Calculate approval time
        avg_approval_time = self._calculate_avg_approval_time(organization_id, time_range)
        
        metrics = TeamMetrics(
            organization_id=organization_id,
            team_name=org.name,
            total_documents=len(team_docs),
            active_collaborators=active_collaborators,
            avg_approval_time_hours=avg_approval_time,
            documents_per_member=len(team_docs) / max(active_collaborators, 1),
            collaboration_frequency=self._calculate_collaboration_frequency(organization_id),
            quality_score=self._calculate_team_quality_score(organization_id)
        )
        
        return metrics
    
    def get_usage_patterns(
        self, 
        organization_id: Optional[int] = None,
        time_range: TimeRange = TimeRange.MONTH
    ) -> UsagePattern:
        """Analyze usage patterns and trends"""
        
        # This would analyze actual usage logs
        # For now, returning sample data structure
        
        return UsagePattern(
            peak_hours=[9, 10, 11, 14, 15, 16],  # 9-11 AM and 2-4 PM
            peak_days=['Monday', 'Tuesday', 'Wednesday'],
            seasonal_trends={
                'Q1': 1.2,  # 20% above average
                'Q2': 0.9,  # 10% below average  
                'Q3': 0.8,  # 20% below average (vacation season)
                'Q4': 1.3   # 30% above average (year-end push)
            },
            user_behavior={
                'avg_session_duration_minutes': 45,
                'avg_documents_per_session': 2.3,
                'bounce_rate': 0.15,
                'return_user_rate': 0.78
            },
            content_preferences={
                'technical_documentation': 35,
                'project_reports': 25,
                'legal_documents': 20,
                'research_papers': 15,
                'other': 5
            }
        )
    
    def get_performance_insights(
        self, 
        document_id: int
    ) -> Dict[str, Any]:
        """Get AI-powered insights about document performance"""
        
        metrics = self.get_document_metrics(document_id)
        
        insights = []
        recommendations = []
        
        # Readability analysis
        if metrics.readability_score < 50:
            insights.append({
                'type': 'readability',
                'severity': 'high',
                'message': 'Document readability is below average',
                'impact': 'Users may struggle to understand the content'
            })
            recommendations.append({
                'category': 'content',
                'priority': 'high',
                'action': 'Simplify language and use shorter sentences',
                'expected_impact': '+15% reader engagement'
            })
        
        # Collaboration analysis
        if metrics.collaboration_score < 0.3:
            insights.append({
                'type': 'collaboration',
                'severity': 'medium', 
                'message': 'Limited team collaboration detected',
                'impact': 'Document may benefit from more review and input'
            })
            recommendations.append({
                'category': 'workflow',
                'priority': 'medium',
                'action': 'Add more reviewers to approval workflow',
                'expected_impact': '+25% document quality'
            })
        
        # Usage analysis
        if metrics.total_views > 0 and metrics.total_comments == 0:
            insights.append({
                'type': 'engagement',
                'severity': 'low',
                'message': 'High views but no engagement',
                'impact': 'Content might not be compelling enough for interaction'
            })
            recommendations.append({
                'category': 'content',
                'priority': 'low', 
                'action': 'Add call-to-action sections or questions',
                'expected_impact': '+10% user engagement'
            })
        
        # Word count analysis
        if metrics.word_count > 5000:
            recommendations.append({
                'category': 'structure',
                'priority': 'medium',
                'action': 'Consider breaking into smaller sections or multiple documents',
                'expected_impact': '+20% completion rate'
            })
        elif metrics.word_count < 500:
            recommendations.append({
                'category': 'content',
                'priority': 'low',
                'action': 'Add more detail and examples to increase value',
                'expected_impact': '+15% user satisfaction'
            })
        
        return {
            'document_id': document_id,
            'performance_score': self._calculate_performance_score(metrics),
            'insights': insights,
            'recommendations': recommendations,
            'benchmark_comparison': self._compare_to_benchmarks(metrics),
            'generated_at': datetime.utcnow().isoformat()
        }
    
    def get_trending_content(
        self, 
        organization_id: Optional[int] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get trending documents based on recent activity"""
        
        # Calculate trend scores based on recent views, shares, comments
        trending_docs = []
        
        # Get recent documents with activity
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        
        query = self.db.query(Document).join(DocumentVersion)
        
        if organization_id:
            from ..models import Workspace
            query = query.join(Workspace).filter(
                Workspace.organization_id == organization_id
            )
        
        documents = query.filter(
            DocumentVersion.created_at >= recent_cutoff
        ).order_by(DocumentVersion.created_at.desc()).limit(50).all()
        
        for doc in documents:
            metrics = self.get_document_metrics(doc.id)
            
            # Calculate trend score (simple algorithm)
            trend_score = (
                metrics.total_views * 0.1 +
                metrics.total_comments * 2.0 +
                metrics.total_shares * 5.0 +
                (metrics.collaboration_score * 10)
            )
            
            trending_docs.append({
                'document_id': doc.id,
                'title': doc.title,
                'trend_score': trend_score,
                'metrics': metrics,
                'change_percent': self._calculate_change_percent(doc.id)
            })
        
        # Sort by trend score and return top results
        trending_docs.sort(key=lambda x: x['trend_score'], reverse=True)
        return trending_docs[:limit]
    
    def generate_analytics_report(
        self, 
        organization_id: int,
        time_range: TimeRange = TimeRange.MONTH
    ) -> Dict[str, Any]:
        """Generate comprehensive analytics report"""
        
        team_metrics = self.get_team_analytics(organization_id, time_range)
        usage_patterns = self.get_usage_patterns(organization_id, time_range)
        trending_content = self.get_trending_content(organization_id)
        
        # Get top performers
        top_documents = self._get_top_performing_documents(organization_id, time_range)
        top_contributors = self._get_top_contributors(organization_id, time_range)
        
        # Calculate KPIs
        kpis = self._calculate_organization_kpis(organization_id, time_range)
        
        return {
            'report_id': f"analytics_{organization_id}_{int(datetime.utcnow().timestamp())}",
            'organization_id': organization_id,
            'time_range': time_range.value,
            'generated_at': datetime.utcnow().isoformat(),
            
            'executive_summary': {
                'total_documents': team_metrics.total_documents,
                'active_collaborators': team_metrics.active_collaborators,
                'avg_approval_time': f"{team_metrics.avg_approval_time_hours:.1f} hours",
                'quality_score': f"{team_metrics.quality_score:.1f}%",
                'productivity_trend': self._calculate_productivity_trend(organization_id)
            },
            
            'team_metrics': team_metrics,
            'usage_patterns': usage_patterns,
            'trending_content': trending_content[:5],
            'top_performers': {
                'documents': top_documents[:5],
                'contributors': top_contributors[:5]
            },
            'kpis': kpis,
            
            'recommendations': self._generate_organization_recommendations(team_metrics, usage_patterns),
            
            'charts_data': {
                'document_creation_trend': self._get_creation_trend_data(organization_id, time_range),
                'collaboration_heatmap': self._get_collaboration_heatmap(organization_id),
                'quality_distribution': self._get_quality_distribution(organization_id),
                'approval_time_trend': self._get_approval_time_trend(organization_id, time_range)
            }
        }
    
    def _get_document_views(self, document_id: int, time_range: Optional[TimeRange]) -> int:
        """Get view count for document (placeholder)"""
        # In a real implementation, this would query view logs
        return np.random.randint(10, 500)
    
    def _get_unique_viewers(self, document_id: int, time_range: Optional[TimeRange]) -> int:
        """Get unique viewer count (placeholder)"""
        return np.random.randint(5, 100)
    
    def _get_comment_count(self, document_id: int, time_range: Optional[TimeRange]) -> int:
        """Get comment count for document"""
        count = self.db.query(DocumentComment).join(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).count()
        return count
    
    def _get_share_count(self, document_id: int, time_range: Optional[TimeRange]) -> int:
        """Get share count (placeholder)"""
        return np.random.randint(0, 50)
    
    def _get_download_count(self, document_id: int, time_range: Optional[TimeRange]) -> int:
        """Get download count (placeholder)"""
        return np.random.randint(0, 200)
    
    def _calculate_collaboration_score(self, document_id: int) -> float:
        """Calculate collaboration score based on team activity"""
        
        # Get versions count
        version_count = self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).count()
        
        # Get comment count
        comment_count = self.db.query(DocumentComment).join(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).count()
        
        # Get unique contributors count
        contributor_count = self.db.query(DocumentVersion.created_by_id).filter(
            DocumentVersion.document_id == document_id
        ).distinct().count()
        
        # Simple collaboration score algorithm
        score = min(1.0, (version_count * 0.1 + comment_count * 0.2 + contributor_count * 0.3))
        return round(score, 2)
    
    def _calculate_performance_score(self, metrics: DocumentMetrics) -> float:
        """Calculate overall performance score"""
        
        # Normalize various metrics to 0-1 scale
        view_score = min(1.0, metrics.total_views / 1000)
        engagement_score = min(1.0, (metrics.total_comments + metrics.total_shares) / 50)
        quality_score = metrics.readability_score / 100
        collab_score = metrics.collaboration_score
        
        # Weighted average
        performance = (
            view_score * 0.3 +
            engagement_score * 0.3 +
            quality_score * 0.2 +
            collab_score * 0.2
        ) * 100
        
        return round(performance, 1)
    
    def _get_time_filter(self, time_range: TimeRange) -> datetime:
        """Get datetime filter for time range"""
        now = datetime.utcnow()
        
        if time_range == TimeRange.HOUR:
            return now - timedelta(hours=1)
        elif time_range == TimeRange.DAY:
            return now - timedelta(days=1)
        elif time_range == TimeRange.WEEK:
            return now - timedelta(weeks=1)
        elif time_range == TimeRange.MONTH:
            return now - timedelta(days=30)
        elif time_range == TimeRange.QUARTER:
            return now - timedelta(days=90)
        elif time_range == TimeRange.YEAR:
            return now - timedelta(days=365)
        
        return now - timedelta(days=30)  # Default to month
    
    def _calculate_avg_approval_time(self, organization_id: int, time_range: TimeRange) -> float:
        """Calculate average approval time for organization"""
        
        time_filter = self._get_time_filter(time_range)
        
        # Get completed approval workflows
        workflows = self.db.query(ApprovalWorkflow).join(Document).join(DocumentVersion).join(Workspace).filter(
            Workspace.organization_id == organization_id,
            ApprovalWorkflow.completed_at.isnot(None),
            ApprovalWorkflow.created_at >= time_filter
        ).all()
        
        if not workflows:
            return 0.0
        
        total_hours = 0
        for workflow in workflows:
            if workflow.started_at and workflow.completed_at:
                duration = (workflow.completed_at - workflow.started_at).total_seconds() / 3600
                total_hours += duration
        
        return round(total_hours / len(workflows), 1)
    
    def _generate_organization_recommendations(
        self, 
        team_metrics: TeamMetrics,
        usage_patterns: UsagePattern
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered recommendations for organization"""
        
        recommendations = []
        
        # Productivity recommendations
        if team_metrics.documents_per_member < 1.0:
            recommendations.append({
                'category': 'productivity',
                'priority': 'high',
                'title': 'Increase Document Creation',
                'description': 'Team members are creating fewer documents than average',
                'action': 'Consider providing documentation templates and training',
                'expected_impact': '+40% documentation output'
            })
        
        # Collaboration recommendations
        if team_metrics.collaboration_frequency < 0.5:
            recommendations.append({
                'category': 'collaboration',
                'priority': 'medium',
                'title': 'Improve Team Collaboration',
                'description': 'Low collaboration detected in document workflows',
                'action': 'Implement mandatory peer reviews for important documents',
                'expected_impact': '+30% document quality'
            })
        
        # Quality recommendations
        if team_metrics.quality_score < 70:
            recommendations.append({
                'category': 'quality',
                'priority': 'high',
                'title': 'Enhance Document Quality',
                'description': 'Document quality scores are below benchmark',
                'action': 'Enable automated compliance checking and style guides',
                'expected_impact': '+25% quality score'
            })
        
        # Efficiency recommendations
        if team_metrics.avg_approval_time_hours > 48:
            recommendations.append({
                'category': 'efficiency',
                'priority': 'medium',
                'title': 'Reduce Approval Time',
                'description': 'Documents are taking too long to approve',
                'action': 'Streamline approval workflows and set SLA targets',
                'expected_impact': '-50% approval time'
            })
        
        return recommendations