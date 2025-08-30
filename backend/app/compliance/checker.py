"""
Advanced compliance checking system for documents
Supports multiple frameworks: GDPR, HIPAA, SOX, ISO27001, etc.
"""

import re
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

class ComplianceFramework(Enum):
    GDPR = "gdpr"
    HIPAA = "hipaa" 
    SOX = "sox"
    ISO27001 = "iso27001"
    PCI_DSS = "pci_dss"
    CCPA = "ccpa"

class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Status(Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    NOT_APPLICABLE = "not_applicable"

@dataclass
class ComplianceIssue:
    line_number: int
    text: str
    issue_type: str
    description: str

@dataclass
class ComplianceSuggestion:
    original_text: str
    suggested_text: str
    reason: str
    confidence: float

@dataclass
class ComplianceRule:
    rule_id: str
    description: str
    pattern: Optional[str] = None
    keywords: Optional[List[str]] = None
    severity: Severity = Severity.MEDIUM
    auto_fixable: bool = False
    
class ComplianceChecker:
    def __init__(self):
        self.rules = self._load_compliance_rules()
    
    def _load_compliance_rules(self) -> Dict[ComplianceFramework, List[ComplianceRule]]:
        """Load predefined compliance rules for different frameworks"""
        return {
            ComplianceFramework.GDPR: [
                ComplianceRule(
                    rule_id="GDPR-001",
                    description="Personal data must be processed lawfully",
                    keywords=["personal data", "personally identifiable", "PII"],
                    severity=Severity.HIGH
                ),
                ComplianceRule(
                    rule_id="GDPR-002", 
                    description="Data subject rights must be mentioned",
                    keywords=["right to be forgotten", "data portability", "right of access"],
                    severity=Severity.MEDIUM
                ),
                ComplianceRule(
                    rule_id="GDPR-003",
                    description="Data retention periods must be specified",
                    pattern=r"retain|retention|delete|removal",
                    severity=Severity.HIGH
                ),
                ComplianceRule(
                    rule_id="GDPR-004",
                    description="Avoid exposing personal identifiers",
                    pattern=r"\b\d{3}-\d{2}-\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\b\d{10,}\b",
                    severity=Severity.CRITICAL,
                    auto_fixable=True
                )
            ],
            ComplianceFramework.HIPAA: [
                ComplianceRule(
                    rule_id="HIPAA-001",
                    description="Protected Health Information (PHI) must be safeguarded",
                    keywords=["PHI", "protected health information", "medical records"],
                    severity=Severity.CRITICAL
                ),
                ComplianceRule(
                    rule_id="HIPAA-002",
                    description="Avoid exposing patient identifiers", 
                    pattern=r"\bMR\d+\b|\bpatient\s+\d+\b|\bSSN\s*:?\s*\d{3}-?\d{2}-?\d{4}",
                    severity=Severity.CRITICAL,
                    auto_fixable=True
                ),
                ComplianceRule(
                    rule_id="HIPAA-003",
                    description="Access controls must be documented",
                    keywords=["access control", "authorization", "authentication"],
                    severity=Severity.HIGH
                )
            ],
            ComplianceFramework.SOX: [
                ComplianceRule(
                    rule_id="SOX-001",
                    description="Financial controls must be documented",
                    keywords=["internal controls", "financial reporting", "audit trail"],
                    severity=Severity.HIGH
                ),
                ComplianceRule(
                    rule_id="SOX-002", 
                    description="Management must certify accuracy",
                    keywords=["management certification", "accuracy", "completeness"],
                    severity=Severity.HIGH
                ),
                ComplianceRule(
                    rule_id="SOX-003",
                    description="Avoid specific financial amounts without context",
                    pattern=r"\$[\d,]+\.?\d*\b(?!\s+(?:budget|allocated|projected))",
                    severity=Severity.MEDIUM,
                    auto_fixable=True
                )
            ],
            ComplianceFramework.ISO27001: [
                ComplianceRule(
                    rule_id="ISO27001-001",
                    description="Information security policies must be documented",
                    keywords=["security policy", "information security", "ISMS"],
                    severity=Severity.HIGH
                ),
                ComplianceRule(
                    rule_id="ISO27001-002",
                    description="Risk assessment procedures must be defined", 
                    keywords=["risk assessment", "threat analysis", "vulnerability"],
                    severity=Severity.HIGH
                ),
                ComplianceRule(
                    rule_id="ISO27001-003",
                    description="Avoid exposing system details",
                    pattern=r"\b(?:password|pwd|secret|token|key)\s*[:=]\s*\w+",
                    severity=Severity.CRITICAL,
                    auto_fixable=True
                )
            ]
        }
    
    def check_compliance(
        self, 
        content: str, 
        frameworks: List[ComplianceFramework]
    ) -> Dict[str, Any]:
        """Check document content against specified compliance frameworks"""
        
        results = {}
        all_issues = []
        all_suggestions = []
        
        for framework in frameworks:
            framework_results = self._check_framework(content, framework)
            results[framework.value] = framework_results
            all_issues.extend(framework_results.get('issues', []))
            all_suggestions.extend(framework_results.get('suggestions', []))
        
        # Calculate overall compliance score
        total_checks = sum(len(self.rules.get(f, [])) for f in frameworks)
        failed_checks = sum(len(r.get('failed_rules', [])) for r in results.values())
        compliance_score = ((total_checks - failed_checks) / total_checks) * 100 if total_checks > 0 else 100
        
        return {
            'overall_score': compliance_score,
            'framework_results': results,
            'total_issues': len(all_issues),
            'critical_issues': len([i for i in all_issues if i.get('severity') == 'critical']),
            'auto_fixable_issues': len([i for i in all_issues if i.get('auto_fixable', False)]),
            'suggestions': all_suggestions
        }
    
    def _check_framework(self, content: str, framework: ComplianceFramework) -> Dict[str, Any]:
        """Check content against a specific compliance framework"""
        
        rules = self.rules.get(framework, [])
        issues = []
        suggestions = []
        passed_rules = []
        failed_rules = []
        
        lines = content.split('\n')
        
        for rule in rules:
            rule_issues = []
            rule_suggestions = []
            
            if rule.pattern:
                # Pattern-based checking
                pattern_matches = self._check_pattern(content, lines, rule)
                rule_issues.extend(pattern_matches['issues'])
                rule_suggestions.extend(pattern_matches['suggestions'])
                
            if rule.keywords:
                # Keyword-based checking
                keyword_matches = self._check_keywords(content, lines, rule)
                rule_issues.extend(keyword_matches['issues']) 
                rule_suggestions.extend(keyword_matches['suggestions'])
            
            if rule_issues:
                failed_rules.append({
                    'rule_id': rule.rule_id,
                    'description': rule.description,
                    'severity': rule.severity.value,
                    'issues': rule_issues,
                    'suggestions': rule_suggestions
                })
                issues.extend(rule_issues)
                suggestions.extend(rule_suggestions)
            else:
                passed_rules.append({
                    'rule_id': rule.rule_id,
                    'description': rule.description,
                    'status': 'passed'
                })
        
        return {
            'framework': framework.value,
            'total_rules_checked': len(rules),
            'passed_rules': passed_rules,
            'failed_rules': failed_rules,
            'issues': issues,
            'suggestions': suggestions
        }
    
    def _check_pattern(self, content: str, lines: List[str], rule: ComplianceRule) -> Dict[str, Any]:
        """Check content against regex patterns"""
        issues = []
        suggestions = []
        
        if not rule.pattern:
            return {'issues': issues, 'suggestions': suggestions}
        
        pattern = re.compile(rule.pattern, re.IGNORECASE)
        
        for line_num, line in enumerate(lines, 1):
            matches = pattern.finditer(line)
            
            for match in matches:
                issue = {
                    'line_number': line_num,
                    'text': line.strip(),
                    'matched_text': match.group(),
                    'issue_type': 'pattern_violation',
                    'description': f"{rule.description} (Rule: {rule.rule_id})",
                    'severity': rule.severity.value,
                    'auto_fixable': rule.auto_fixable
                }
                issues.append(issue)
                
                if rule.auto_fixable:
                    suggestion = self._generate_auto_fix(match.group(), rule)
                    if suggestion:
                        suggestions.append(suggestion)
        
        return {'issues': issues, 'suggestions': suggestions}
    
    def _check_keywords(self, content: str, lines: List[str], rule: ComplianceRule) -> Dict[str, Any]:
        """Check content for required keywords"""
        issues = []
        suggestions = []
        
        if not rule.keywords:
            return {'issues': issues, 'suggestions': suggestions}
        
        content_lower = content.lower()
        missing_keywords = []
        
        for keyword in rule.keywords:
            if keyword.lower() not in content_lower:
                missing_keywords.append(keyword)
        
        if missing_keywords:
            issue = {
                'line_number': 0,  # Document-level issue
                'text': '',
                'issue_type': 'missing_keywords',
                'description': f"{rule.description}. Missing: {', '.join(missing_keywords)}",
                'severity': rule.severity.value,
                'missing_keywords': missing_keywords,
                'auto_fixable': False
            }
            issues.append(issue)
            
            # Suggest where to add missing keywords
            suggestion = {
                'original_text': '',
                'suggested_text': f"Consider adding content related to: {', '.join(missing_keywords)}",
                'reason': rule.description,
                'confidence': 0.8
            }
            suggestions.append(suggestion)
        
        return {'issues': issues, 'suggestions': suggestions}
    
    def _generate_auto_fix(self, matched_text: str, rule: ComplianceRule) -> Optional[Dict[str, Any]]:
        """Generate automatic fixes for common compliance violations"""
        
        fixes = {
            # Email addresses
            r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}': '[EMAIL_REDACTED]',
            # SSN patterns
            r'\d{3}-\d{2}-\d{4}': '[SSN_REDACTED]',
            # Phone numbers
            r'\d{10,}': '[PHONE_REDACTED]',
            # Passwords/secrets
            r'(?:password|pwd|secret|token|key)\s*[:=]\s*\w+': 'password: [REDACTED]',
            # Financial amounts
            r'\$[\d,]+\.?\d*': '[AMOUNT_REDACTED]',
            # Patient/Medical IDs
            r'(?:MR|patient)\s*\d+': '[PATIENT_ID_REDACTED]'
        }
        
        for pattern, replacement in fixes.items():
            if re.search(pattern, matched_text, re.IGNORECASE):
                return {
                    'original_text': matched_text,
                    'suggested_text': replacement,
                    'reason': f'Automatically redact sensitive information ({rule.rule_id})',
                    'confidence': 0.95
                }
        
        return None
    
    def apply_auto_fixes(self, content: str, framework: ComplianceFramework) -> str:
        """Apply automatic fixes to content"""
        
        rules = self.rules.get(framework, [])
        fixed_content = content
        
        for rule in rules:
            if not rule.auto_fixable or not rule.pattern:
                continue
            
            pattern = re.compile(rule.pattern, re.IGNORECASE)
            
            def replace_func(match):
                fix = self._generate_auto_fix(match.group(), rule)
                return fix['suggested_text'] if fix else match.group()
            
            fixed_content = pattern.sub(replace_func, fixed_content)
        
        return fixed_content
    
    def get_compliance_report(
        self, 
        content: str, 
        frameworks: List[ComplianceFramework]
    ) -> Dict[str, Any]:
        """Generate a comprehensive compliance report"""
        
        results = self.check_compliance(content, frameworks)
        
        # Generate executive summary
        critical_issues = results['critical_issues']
        total_issues = results['total_issues']
        compliance_score = results['overall_score']
        
        if compliance_score >= 90:
            status = "Excellent"
            status_color = "green"
        elif compliance_score >= 70:
            status = "Good"
            status_color = "yellow"
        elif compliance_score >= 50:
            status = "Fair"
            status_color = "orange" 
        else:
            status = "Poor"
            status_color = "red"
        
        executive_summary = f"""
        Compliance Status: {status} ({compliance_score:.1f}%)
        Total Issues Found: {total_issues}
        Critical Issues: {critical_issues}
        Auto-Fixable Issues: {results['auto_fixable_issues']}
        """
        
        return {
            **results,
            'executive_summary': executive_summary.strip(),
            'status': status,
            'status_color': status_color,
            'recommendations': self._generate_recommendations(results),
            'generated_at': json.dumps(None, default=str)  # Placeholder for timestamp
        }
    
    def _generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on compliance results"""
        
        recommendations = []
        
        if results['critical_issues'] > 0:
            recommendations.append("🚨 Address critical compliance issues immediately")
        
        if results['auto_fixable_issues'] > 0:
            recommendations.append(f"✨ {results['auto_fixable_issues']} issues can be automatically fixed")
        
        # Framework-specific recommendations
        for framework, framework_results in results['framework_results'].items():
            failed_rules = framework_results.get('failed_rules', [])
            
            if framework == 'gdpr' and failed_rules:
                recommendations.append("📋 Review GDPR Article 13/14 requirements for data processing transparency")
            
            if framework == 'hipaa' and failed_rules:
                recommendations.append("🏥 Ensure all PHI is properly de-identified or encrypted")
            
            if framework == 'sox' and failed_rules:
                recommendations.append("💼 Document all financial controls and approval processes")
        
        if results['overall_score'] < 70:
            recommendations.append("📈 Consider compliance training for content creators")
        
        return recommendations