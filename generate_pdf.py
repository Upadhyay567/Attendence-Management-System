import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def markdown_to_pdf(md_path, pdf_path):
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#fbbf24'), # Surya Yellow
        spaceAfter=15,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#94a3b8'),
        spaceAfter=25,
        alignment=TA_CENTER
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0284c7'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyText_Custom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    list_style = ParagraphStyle(
        'ListText_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        leftIndent=20,
        spaceAfter=6
    )

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    story = []
    
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_list = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Title
        if stripped.startswith('# '):
            story.append(Paragraph(stripped[2:], title_style))
            continue
        # Subtitle
        if stripped.startswith('## '):
            if stripped == '## End-to-End Implementation Report & Architecture Specification':
                story.append(Paragraph(stripped[3:], subtitle_style))
            else:
                story.append(Paragraph(stripped[3:], h1_style))
            continue
        # Heading 2
        if stripped.startswith('### '):
            story.append(Paragraph(stripped[4:], h2_style))
            continue
            
        # Horizontal lines
        if stripped == '---':
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceBefore=10, spaceAfter=15))
            continue
            
        # Bullet list items
        if stripped.startswith('* ') or stripped.startswith('- '):
            # Parse simple bolding
            text = stripped[2:]
            text = text.replace('**', '<b>', 1).replace('**', '</b>', 1)
            text = text.replace('**', '<b>', 1).replace('**', '</b>', 1) # Support second bolding
            story.append(Paragraph(f"&bull; {text}", list_style))
            continue
            
        # Indented/Numbered items
        if stripped.startswith('1. ') or stripped.startswith('2. ') or stripped.startswith('3. ') or stripped.startswith('4. ') or stripped.startswith('5. ') or stripped.startswith('6. ') or stripped.startswith('7. '):
            text = stripped
            text = text.replace('**', '<b>', 1).replace('**', '</b>', 1)
            text = text.replace('**', '<b>', 1).replace('**', '</b>', 1)
            story.append(Paragraph(text, list_style))
            continue
            
        # Regular body lines
        text = stripped
        text = text.replace('**', '<b>', 1).replace('**', '</b>', 1)
        text = text.replace('**', '<b>', 1).replace('**', '</b>', 1)
        story.append(Paragraph(text, body_style))
        
    doc.build(story)
    print(f"PDF generated successfully at {pdf_path}")

if __name__ == '__main__':
    markdown_to_pdf('PROJECT_REPORT.md', 'PROJECT_REPORT.pdf')
