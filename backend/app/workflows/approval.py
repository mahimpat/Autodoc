"""
Advanced document approval workflow system
Supports multi-stage approvals, parallel/sequential workflows, and automated notifications
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func

from ..db import Base
from ..models import User

class WorkflowType(Enum):
    SEQUENTIAL = "sequential"  # Approvers must approve in order
    PARALLEL = "parallel"     # All approvers can approve simultaneously
    MAJORITY = "majority"     # Majority of approvers needed
    UNANIMOUS = "unanimous"   # All approvers must approve

class ApprovalAction(Enum):
    APPROVE = "approve"
    REJECT = "reject" 
    REQUEST_CHANGES = "request_changes"
    DELEGATE = "delegate"

class WorkflowStatus(Enum):
    DRAFT = "draft"
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"
    CANCELLED = "cancelled"

@dataclass
class ApprovalRule:
    """Defines approval requirements"""
    role_required: Optional[str] = None
    user_id: Optional[int] = None
    department: Optional[str] = None
    min_approval_level: int = 1  # 1=manager, 2=director, 3=VP, etc.
    auto_approve_conditions: Optional[Dict[str, Any]] = None

@dataclass 
class WorkflowTemplate:
    """Pre-defined workflow template"""
    name: str
    description: str
    workflow_type: WorkflowType
    approval_rules: List[ApprovalRule]
    sla_hours: Optional[int] = None  # Service Level Agreement in hours
    auto_escalate: bool = False
    notification_settings: Optional[Dict[str, Any]] = None

class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    version_id = Column(Integer, ForeignKey('document_versions.id'), nullable=False)
    
    # Workflow configuration
    name = Column(String, nullable=False)
    workflow_type = Column(String, nullable=False)  # sequential, parallel, majority, unanimous
    template_id = Column(Integer, ForeignKey('workflow_templates.id'))
    
    # Status tracking
    status = Column(String, default=WorkflowStatus.DRAFT.value)
    current_stage = Column(Integer, default=1)
    total_stages = Column(Integer, default=1)
    
    # Timeline
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    
    # SLA tracking
    sla_hours = Column(Integer)
    is_overdue = Column(Boolean, default=False)
    escalated_at = Column(DateTime(timezone=True))
    
    # Metadata
    approval_rules = Column(JSON)  # Serialized approval configuration
    notification_settings = Column(JSON)
    workflow_metadata = Column(JSON)
    
    # Creator
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")
    template = relationship("WorkflowTemplate")
    approvals = relationship("ApprovalRequest", back_populates="workflow")
    comments = relationship("WorkflowComment", back_populates="workflow")


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    
    # Template configuration
    workflow_type = Column(String, nullable=False)
    approval_rules = Column(JSON, nullable=False)
    
    # SLA and escalation
    default_sla_hours = Column(Integer, default=72)  # 3 days default
    auto_escalate = Column(Boolean, default=True)
    escalation_rules = Column(JSON)
    
    # Notifications
    notification_settings = Column(JSON)
    
    # Organization context
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    created_by = relationship("User")
    organization = relationship("Organization")
    workflows = relationship("ApprovalWorkflow", back_populates="template")


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey('approval_workflows.id'), nullable=False)
    
    # Approver information
    approver_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    approver_role = Column(String)  # Role at time of request
    approver_department = Column(String)
    
    # Request details
    stage_number = Column(Integer, nullable=False)
    is_required = Column(Boolean, default=True)  # False for optional/advisory approvals
    approval_level = Column(Integer, default=1)  # Organizational level required
    
    # Status
    status = Column(String, default="pending")  # pending, approved, rejected, delegated
    action_taken = Column(String)  # approve, reject, request_changes, delegate
    
    # Timeline
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    
    # Response details
    response_comment = Column(Text)
    rejection_reason = Column(Text)
    change_requests = Column(JSON)  # Structured change requests
    
    # Delegation
    delegated_to_id = Column(Integer, ForeignKey('users.id'))
    delegation_reason = Column(Text)
    delegated_at = Column(DateTime(timezone=True))
    
    # Metadata
    request_metadata = Column(JSON)
    approval_conditions = Column(JSON)  # Conditions that must be met
    
    # Relationships
    workflow = relationship("ApprovalWorkflow", back_populates="approvals")
    approver = relationship("User", foreign_keys=[approver_id])
    delegated_to = relationship("User", foreign_keys=[delegated_to_id])


class WorkflowComment(Base):
    __tablename__ = "workflow_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey('approval_workflows.id'), nullable=False)
    
    # Comment details
    content = Column(Text, nullable=False)
    comment_type = Column(String, default="general")  # general, approval, rejection, change_request
    
    # Context
    stage_number = Column(Integer)
    references_line = Column(Integer)  # Line number in document
    references_section = Column(String)  # Section of document
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolution_comment = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    resolved_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    workflow = relationship("ApprovalWorkflow", back_populates="comments")
    created_by = relationship("User", foreign_keys=[created_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])


class ApprovalWorkflowEngine:
    """Main engine for managing approval workflows"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_workflow(
        self,
        document_id: int,
        version_id: int,
        template_name: str,
        created_by_id: int,
        custom_approvers: Optional[List[int]] = None
    ) -> ApprovalWorkflow:
        """Create a new approval workflow from template"""
        
        # Get template
        template = self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.name == template_name,
            WorkflowTemplate.is_active == True
        ).first()
        
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        # Create workflow
        workflow = ApprovalWorkflow(
            document_id=document_id,
            version_id=version_id,
            name=f"{template.name} - Document {document_id}",
            workflow_type=template.workflow_type,
            template_id=template.id,
            sla_hours=template.default_sla_hours,
            approval_rules=template.approval_rules,
            notification_settings=template.notification_settings,
            created_by_id=created_by_id
        )
        
        # Set due date based on SLA
        if template.default_sla_hours:
            workflow.due_date = datetime.utcnow() + timedelta(hours=template.default_sla_hours)
        
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        
        # Create approval requests based on template rules
        self._create_approval_requests(workflow, template, custom_approvers)
        
        return workflow
    
    def _create_approval_requests(
        self,
        workflow: ApprovalWorkflow,
        template: WorkflowTemplate,
        custom_approvers: Optional[List[int]] = None
    ):
        """Create individual approval requests based on workflow rules"""
        
        approval_rules = template.approval_rules
        if not approval_rules:
            return
        
        # Use custom approvers if provided, otherwise use template rules
        if custom_approvers:
            for i, approver_id in enumerate(custom_approvers, 1):
                request = ApprovalRequest(
                    workflow_id=workflow.id,
                    approver_id=approver_id,
                    stage_number=i,
                    due_date=workflow.due_date
                )
                self.db.add(request)
        else:
            # Parse approval rules and create requests
            stage_number = 1
            
            for rule in approval_rules:
                # Find approvers matching the rule
                approvers = self._find_approvers_for_rule(rule, workflow)
                
                for approver in approvers:
                    request = ApprovalRequest(
                        workflow_id=workflow.id,
                        approver_id=approver.id,
                        approver_role=rule.get('role_required'),
                        approver_department=rule.get('department'),
                        stage_number=stage_number,
                        approval_level=rule.get('min_approval_level', 1),
                        due_date=workflow.due_date
                    )
                    self.db.add(request)
                
                if template.workflow_type == WorkflowType.SEQUENTIAL.value:
                    stage_number += 1
        
        self.db.commit()
    
    def _find_approvers_for_rule(
        self, 
        rule: Dict[str, Any], 
        workflow: ApprovalWorkflow
    ) -> List[User]:
        """Find users who match an approval rule"""
        
        query = self.db.query(User)
        
        # Filter by specific user
        if rule.get('user_id'):
            return [self.db.query(User).filter(User.id == rule['user_id']).first()]
        
        # Filter by role (this would need to be implemented based on your user model)
        if rule.get('role_required'):
            # This is a placeholder - you'd need to implement role checking
            # query = query.filter(User.role == rule['role_required'])
            pass
        
        # Filter by department
        if rule.get('department'):
            # This is a placeholder - you'd need to implement department checking
            # query = query.filter(User.department == rule['department'])
            pass
        
        return query.limit(10).all()  # Limit to prevent too many approvers
    
    def submit_approval(
        self,
        workflow_id: int,
        approver_id: int,
        action: ApprovalAction,
        comment: Optional[str] = None,
        change_requests: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Submit an approval decision"""
        
        # Find the approval request
        request = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.workflow_id == workflow_id,
            ApprovalRequest.approver_id == approver_id,
            ApprovalRequest.status == "pending"
        ).first()
        
        if not request:
            raise ValueError("Approval request not found or already processed")
        
        # Update the request
        request.status = action.value
        request.action_taken = action.value
        request.responded_at = datetime.utcnow()
        request.response_comment = comment
        
        if action == ApprovalAction.REQUEST_CHANGES and change_requests:
            request.change_requests = change_requests
            request.rejection_reason = "Changes requested"
        elif action == ApprovalAction.REJECT:
            request.rejection_reason = comment
        
        self.db.commit()
        
        # Update workflow status
        workflow_status = self._update_workflow_status(workflow_id)
        
        # Send notifications
        self._send_workflow_notifications(workflow_id, action, approver_id)
        
        return {
            'workflow_status': workflow_status,
            'next_action': self._determine_next_action(workflow_id),
            'message': f'Approval {action.value} recorded successfully'
        }
    
    def _update_workflow_status(self, workflow_id: int) -> str:
        """Update overall workflow status based on individual approvals"""
        
        workflow = self.db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            return "error"
        
        # Get all approval requests for this workflow
        requests = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.workflow_id == workflow_id
        ).all()
        
        if not requests:
            return workflow.status
        
        # Count approvals by status
        approved = len([r for r in requests if r.status == "approved"])
        rejected = len([r for r in requests if r.status == "rejected"])
        changes_requested = len([r for r in requests if r.status == "request_changes"])
        pending = len([r for r in requests if r.status == "pending"])
        total_required = len([r for r in requests if r.is_required])
        
        # Determine new status based on workflow type
        if workflow.workflow_type == WorkflowType.UNANIMOUS.value:
            if rejected > 0 or changes_requested > 0:
                new_status = WorkflowStatus.CHANGES_REQUESTED.value if changes_requested > 0 else WorkflowStatus.REJECTED.value
            elif approved == total_required:
                new_status = WorkflowStatus.APPROVED.value
                workflow.completed_at = datetime.utcnow()
            else:
                new_status = WorkflowStatus.IN_REVIEW.value
                
        elif workflow.workflow_type == WorkflowType.MAJORITY.value:
            required_approvals = (total_required // 2) + 1
            if approved >= required_approvals:
                new_status = WorkflowStatus.APPROVED.value
                workflow.completed_at = datetime.utcnow()
            elif rejected >= required_approvals or changes_requested > 0:
                new_status = WorkflowStatus.CHANGES_REQUESTED.value if changes_requested > 0 else WorkflowStatus.REJECTED.value
            else:
                new_status = WorkflowStatus.IN_REVIEW.value
                
        elif workflow.workflow_type == WorkflowType.SEQUENTIAL.value:
            # Check if current stage is complete
            current_stage_requests = [r for r in requests if r.stage_number == workflow.current_stage]
            current_stage_approved = all(r.status == "approved" for r in current_stage_requests if r.is_required)
            current_stage_rejected = any(r.status in ["rejected", "request_changes"] for r in current_stage_requests)
            
            if current_stage_rejected:
                new_status = WorkflowStatus.REJECTED.value
            elif current_stage_approved:
                # Move to next stage or complete
                max_stage = max(r.stage_number for r in requests)
                if workflow.current_stage < max_stage:
                    workflow.current_stage += 1
                    new_status = WorkflowStatus.IN_REVIEW.value
                else:
                    new_status = WorkflowStatus.APPROVED.value
                    workflow.completed_at = datetime.utcnow()
            else:
                new_status = WorkflowStatus.IN_REVIEW.value
        
        else:  # PARALLEL
            if rejected > 0 or changes_requested > 0:
                new_status = WorkflowStatus.CHANGES_REQUESTED.value if changes_requested > 0 else WorkflowStatus.REJECTED.value
            elif pending == 0:  # All responses received
                new_status = WorkflowStatus.APPROVED.value
                workflow.completed_at = datetime.utcnow()
            else:
                new_status = WorkflowStatus.IN_REVIEW.value
        
        workflow.status = new_status
        self.db.commit()
        
        return new_status
    
    def _determine_next_action(self, workflow_id: int) -> Dict[str, Any]:
        """Determine what the next action should be in the workflow"""
        
        workflow = self.db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            return {"action": "error", "message": "Workflow not found"}
        
        if workflow.status == WorkflowStatus.APPROVED.value:
            return {"action": "publish", "message": "Document ready to publish"}
        
        elif workflow.status == WorkflowStatus.REJECTED.value:
            return {"action": "revise", "message": "Document needs major revisions"}
        
        elif workflow.status == WorkflowStatus.CHANGES_REQUESTED.value:
            return {"action": "address_changes", "message": "Address requested changes"}
        
        elif workflow.status == WorkflowStatus.IN_REVIEW.value:
            # Find next pending approval
            pending_requests = self.db.query(ApprovalRequest).filter(
                ApprovalRequest.workflow_id == workflow_id,
                ApprovalRequest.status == "pending"
            ).order_by(ApprovalRequest.stage_number).all()
            
            if pending_requests:
                next_approver = pending_requests[0].approver
                return {
                    "action": "wait_approval",
                    "message": f"Waiting for approval from {next_approver.email}",
                    "next_approver_id": next_approver.id
                }
        
        return {"action": "unknown", "message": "Workflow status unclear"}
    
    def _send_workflow_notifications(
        self, 
        workflow_id: int, 
        action: ApprovalAction, 
        approver_id: int
    ):
        """Send notifications for workflow events"""
        # This would integrate with your notification system
        # For now, just a placeholder
        pass
    
    def get_workflow_analytics(self, workflow_id: int) -> Dict[str, Any]:
        """Get analytics and insights for a workflow"""
        
        workflow = self.db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.id == workflow_id
        ).first()
        
        if not workflow:
            return {}
        
        requests = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.workflow_id == workflow_id
        ).all()
        
        # Calculate metrics
        total_time = None
        if workflow.completed_at and workflow.started_at:
            total_time = (workflow.completed_at - workflow.started_at).total_seconds() / 3600  # hours
        
        avg_response_time = None
        response_times = []
        for request in requests:
            if request.responded_at and request.requested_at:
                response_time = (request.responded_at - request.requested_at).total_seconds() / 3600
                response_times.append(response_time)
        
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
        
        return {
            'workflow_id': workflow_id,
            'status': workflow.status,
            'total_approvers': len(requests),
            'approved_count': len([r for r in requests if r.status == "approved"]),
            'rejected_count': len([r for r in requests if r.status == "rejected"]),
            'pending_count': len([r for r in requests if r.status == "pending"]),
            'total_time_hours': total_time,
            'avg_response_time_hours': avg_response_time,
            'is_overdue': workflow.is_overdue,
            'sla_hours': workflow.sla_hours,
            'completion_percentage': (len([r for r in requests if r.status != "pending"]) / len(requests)) * 100 if requests else 0
        }