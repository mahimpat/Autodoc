"""
Advanced branded document export system
Supports multiple formats with custom branding, layouts, and security options
"""

import os
import json
import tempfile
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import base64
from pathlib import Path

# For different export formats
from reportlab.lib.pagesizes import A4, letter, legal
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

# For Word export
from docx import Document as WordDocument
from docx.shared import Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.shared import OxmlElement, qn

# For HTML export
from jinja2 import Template
import markdown
from weasyprint import HTML, CSS

class ExportFormat(Enum):
    PDF = "pdf"
    DOCX = "docx"
    HTML = "html" 
    MARKDOWN = "markdown"
    EPUB = "epub"
    LATEX = "latex"

class PageSize(Enum):
    A4 = "A4"
    LETTER = "Letter"
    LEGAL = "Legal"
    TABLOID = "Tabloid"

class SecurityLevel(Enum):
    NONE = "none"
    PASSWORD = "password"
    RESTRICT_EDITING = "restrict_editing"
    RESTRICT_COPYING = "restrict_copying"
    FULL_PROTECTION = "full_protection"

@dataclass
class BrandingConfig:
    """Configuration for document branding"""
    company_name: Optional[str] = None
    company_logo: Optional[str] = None  # Base64 encoded or URL
    primary_color: str = "#1F2937"      # Dark gray default
    secondary_color: str = "#3B82F6"    # Blue default
    accent_color: str = "#10B981"       # Green default
    font_family: str = "Inter"
    
    # Header/Footer
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    show_page_numbers: bool = True
    show_date_generated: bool = True
    
    # Watermark
    watermark_text: Optional[str] = None
    watermark_opacity: float = 0.1

@dataclass
class LayoutConfig:
    """Configuration for document layout"""
    page_size: PageSize = PageSize.A4
    margins_inch: Dict[str, float] = None
    
    # Typography
    title_font_size: int = 24
    heading_font_size: int = 18
    body_font_size: int = 11
    line_spacing: float = 1.2
    
    # Structure
    include_toc: bool = True
    include_cover_page: bool = True
    include_appendix: bool = False
    toc_depth: int = 3
    
    def __post_init__(self):
        if self.margins_inch is None:
            self.margins_inch = {"top": 1.0, "right": 1.0, "bottom": 1.0, "left": 1.0}

@dataclass
class SecurityConfig:
    """Configuration for document security"""
    level: SecurityLevel = SecurityLevel.NONE
    password: Optional[str] = None
    owner_password: Optional[str] = None
    allow_printing: bool = True
    allow_copying: bool = True
    allow_editing: bool = True
    allow_annotations: bool = True

class BrandedExporter:
    """Main class for branded document export"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
    
    def export_document(
        self,
        content: str,
        title: str,
        format: ExportFormat,
        branding: BrandingConfig,
        layout: LayoutConfig,
        security: SecurityConfig = SecurityConfig(),
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Export document with custom branding and layout"""
        
        try:
            if format == ExportFormat.PDF:
                return self._export_pdf(content, title, branding, layout, security, metadata)
            elif format == ExportFormat.DOCX:
                return self._export_docx(content, title, branding, layout, metadata)
            elif format == ExportFormat.HTML:
                return self._export_html(content, title, branding, layout, metadata)
            elif format == ExportFormat.MARKDOWN:
                return self._export_markdown(content, title, metadata)
            elif format == ExportFormat.LATEX:
                return self._export_latex(content, title, branding, layout, metadata)
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "format": format.value
            }
    
    def _export_pdf(
        self,
        content: str,
        title: str,
        branding: BrandingConfig,
        layout: LayoutConfig,
        security: SecurityConfig,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Export as branded PDF"""
        
        output_path = os.path.join(self.temp_dir, f"{title}.pdf")
        
        # Configure page size
        page_size = A4
        if layout.page_size == PageSize.LETTER:
            page_size = letter
        elif layout.page_size == PageSize.LEGAL:
            page_size = legal
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=page_size,
            topMargin=layout.margins_inch["top"]*inch,
            bottomMargin=layout.margins_inch["bottom"]*inch,
            leftMargin=layout.margins_inch["left"]*inch,
            rightMargin=layout.margins_inch["right"]*inch
        )
        
        # Build styles
        styles = self._create_pdf_styles(branding, layout)
        story = []
        
        # Add cover page
        if layout.include_cover_page:
            story.extend(self._create_pdf_cover(title, branding, styles))
            story.append(PageBreak())
        
        # Add table of contents
        if layout.include_toc:
            story.extend(self._create_pdf_toc(content, styles, layout.toc_depth))
            story.append(PageBreak())
        
        # Add main content
        story.extend(self._convert_content_to_pdf(content, styles))
        
        # Build PDF with custom page template
        doc.build(
            story,
            onFirstPage=lambda canvas, doc: self._add_pdf_page_elements(canvas, doc, branding, True),
            onLaterPages=lambda canvas, doc: self._add_pdf_page_elements(canvas, doc, branding, False)
        )
        
        # Apply security settings
        if security.level != SecurityLevel.NONE:
            self._apply_pdf_security(output_path, security)
        
        # Get file info
        file_size = os.path.getsize(output_path)
        
        return {
            "success": True,
            "file_path": output_path,
            "file_size": file_size,
            "format": "pdf",
            "pages": self._count_pdf_pages(output_path)
        }
    
    def _export_docx(
        self,
        content: str,
        title: str,
        branding: BrandingConfig,
        layout: LayoutConfig,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Export as branded Word document"""
        
        output_path = os.path.join(self.temp_dir, f"{title}.docx")
        
        # Create Word document
        doc = WordDocument()
        
        # Set document properties
        if metadata:
            doc.core_properties.title = title
            doc.core_properties.author = metadata.get('author', branding.company_name)
            doc.core_properties.subject = metadata.get('subject', '')
            doc.core_properties.created = datetime.now()
        
        # Configure styles
        self._configure_docx_styles(doc, branding, layout)
        
        # Add cover page
        if layout.include_cover_page:
            self._add_docx_cover(doc, title, branding)
            doc.add_page_break()
        
        # Add table of contents
        if layout.include_toc:
            self._add_docx_toc(doc, content, layout.toc_depth)
            doc.add_page_break()
        
        # Add main content
        self._convert_content_to_docx(doc, content, branding)
        
        # Add headers and footers
        self._add_docx_headers_footers(doc, branding, layout)
        
        doc.save(output_path)
        
        file_size = os.path.getsize(output_path)
        
        return {
            "success": True,
            "file_path": output_path,
            "file_size": file_size,
            "format": "docx"
        }
    
    def _export_html(
        self,
        content: str,
        title: str,
        branding: BrandingConfig,
        layout: LayoutConfig,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Export as branded HTML"""
        
        output_path = os.path.join(self.temp_dir, f"{title}.html")
        
        # Create HTML template
        html_template = self._create_html_template(branding, layout)
        
        # Convert markdown to HTML if needed
        html_content = markdown.markdown(
            content,
            extensions=['toc', 'tables', 'fenced_code', 'codehilite']
        )
        
        # Generate table of contents
        toc_html = ""
        if layout.include_toc:
            toc_html = self._generate_html_toc(content, layout.toc_depth)
        
        # Render template
        template = Template(html_template)
        html_output = template.render(
            title=title,
            content=html_content,
            toc=toc_html,
            company_name=branding.company_name,
            primary_color=branding.primary_color,
            secondary_color=branding.secondary_color,
            accent_color=branding.accent_color,
            font_family=branding.font_family,
            generated_date=datetime.now().strftime("%B %d, %Y"),
            metadata=metadata or {}
        )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_output)
        
        file_size = os.path.getsize(output_path)
        
        return {
            "success": True,
            "file_path": output_path,
            "file_size": file_size,
            "format": "html"
        }
    
    def _create_pdf_styles(self, branding: BrandingConfig, layout: LayoutConfig):
        """Create custom PDF styles"""
        styles = getSampleStyleSheet()
        
        # Primary color
        primary_color = HexColor(branding.primary_color)
        
        # Update existing styles
        styles['Title'].fontSize = layout.title_font_size
        styles['Title'].textColor = primary_color
        styles['Title'].fontName = 'Helvetica-Bold'
        styles['Title'].alignment = TA_CENTER
        styles['Title'].spaceAfter = 30
        
        styles['Heading1'].fontSize = layout.heading_font_size
        styles['Heading1'].textColor = primary_color
        styles['Heading1'].fontName = 'Helvetica-Bold'
        styles['Heading1'].spaceBefore = 20
        styles['Heading1'].spaceAfter = 12
        
        styles['Normal'].fontSize = layout.body_font_size
        styles['Normal'].leading = layout.body_font_size * layout.line_spacing
        styles['Normal'].fontName = 'Helvetica'
        
        # Add custom styles
        styles.add(ParagraphStyle(
            name='CompanyName',
            parent=styles['Title'],
            fontSize=28,
            textColor=primary_color,
            alignment=TA_CENTER
        ))
        
        styles.add(ParagraphStyle(
            name='Subtitle',
            parent=styles['Normal'],
            fontSize=14,
            textColor=HexColor(branding.secondary_color),
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        return styles
    
    def _create_html_template(self, branding: BrandingConfig, layout: LayoutConfig) -> str:
        """Create HTML template with branding"""
        
        return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family={{ font_family }}:wght@300;400;600;700&display=swap');
        
        :root {
            --primary-color: {{ primary_color }};
            --secondary-color: {{ secondary_color }};
            --accent-color: {{ accent_color }};
            --font-family: '{{ font_family }}', sans-serif;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--font-family);
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .document-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .company-name {
            opacity: 0.9;
            font-size: 1.1rem;
            font-weight: 300;
        }
        
        .content {
            padding: 2rem;
        }
        
        .toc {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            border-left: 4px solid var(--accent-color);
        }
        
        .toc h2 {
            color: var(--primary-color);
            margin-bottom: 1rem;
            font-size: 1.3rem;
        }
        
        .toc ul {
            list-style: none;
        }
        
        .toc a {
            color: var(--secondary-color);
            text-decoration: none;
            padding: 0.25rem 0;
            display: block;
            border-bottom: 1px solid #e2e8f0;
            transition: color 0.2s;
        }
        
        .toc a:hover {
            color: var(--accent-color);
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--primary-color);
            margin-top: 2rem;
            margin-bottom: 1rem;
        }
        
        h1 { font-size: 2rem; }
        h2 { font-size: 1.6rem; }
        h3 { font-size: 1.3rem; }
        
        p {
            margin-bottom: 1rem;
            text-align: justify;
        }
        
        code {
            background: #f1f5f9;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
        }
        
        blockquote {
            border-left: 4px solid var(--accent-color);
            background: #f8fafc;
            padding: 1rem 1.5rem;
            margin: 1rem 0;
            font-style: italic;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        
        th, td {
            border: 1px solid #e2e8f0;
            padding: 0.75rem;
            text-align: left;
        }
        
        th {
            background: var(--primary-color);
            color: white;
            font-weight: 600;
        }
        
        .footer {
            background: #f8fafc;
            padding: 1.5rem 2rem;
            text-align: center;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .document-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="document-container">
        <header class="header">
            <h1>{{ title }}</h1>
            {% if company_name %}
            <div class="company-name">{{ company_name }}</div>
            {% endif %}
        </header>
        
        <main class="content">
            {% if toc %}
            <div class="toc">
                <h2>Table of Contents</h2>
                {{ toc|safe }}
            </div>
            {% endif %}
            
            {{ content|safe }}
        </main>
        
        <footer class="footer">
            <p>Generated on {{ generated_date }}</p>
            {% if company_name %}
            <p>&copy; {{ company_name }}. All rights reserved.</p>
            {% endif %}
        </footer>
    </div>
</body>
</html>
        '''
    
    def create_export_job(
        self,
        version_id: int,
        format: ExportFormat,
        branding_config: Dict[str, Any],
        layout_config: Dict[str, Any],
        security_config: Dict[str, Any],
        requested_by_id: int
    ) -> Dict[str, Any]:
        """Create an export job for async processing"""
        
        # This would typically be stored in database and processed by a background worker
        job_data = {
            'version_id': version_id,
            'format': format.value,
            'branding': branding_config,
            'layout': layout_config,
            'security': security_config,
            'requested_by_id': requested_by_id,
            'status': 'queued',
            'created_at': datetime.utcnow().isoformat()
        }
        
        return {
            'job_id': f"export_{version_id}_{format.value}_{int(datetime.utcnow().timestamp())}",
            'status': 'queued',
            'estimated_completion': '2-5 minutes'
        }
    
    def get_supported_formats(self) -> List[Dict[str, Any]]:
        """Get list of supported export formats with capabilities"""
        
        return [
            {
                'format': 'pdf',
                'name': 'PDF Document',
                'description': 'Professional PDF with full branding and security options',
                'supports_security': True,
                'supports_watermark': True,
                'max_file_size': '50MB'
            },
            {
                'format': 'docx',
                'name': 'Microsoft Word',
                'description': 'Editable Word document with custom styles',
                'supports_security': False,
                'supports_watermark': False,
                'max_file_size': '25MB'
            },
            {
                'format': 'html',
                'name': 'HTML Document',
                'description': 'Interactive web-ready HTML with responsive design',
                'supports_security': False,
                'supports_watermark': False,
                'max_file_size': '10MB'
            },
            {
                'format': 'markdown',
                'name': 'Markdown',
                'description': 'Plain text markdown for developers',
                'supports_security': False,
                'supports_watermark': False,
                'max_file_size': '5MB'
            }
        ]