"""
TRAE Automation Workflow Templates
Pre-configured workflow templates for common automation patterns
Author: TRAE Development Team  
Version: 3.0.0
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class WorkflowTemplate:
    """Base class for workflow templates"""

    def __init__(self, template_id: str, name: str, description: str, category: str):
        self.template_id = template_id
        self.name = name
        self.description = description
        self.category = category
        self.nodes = []
        self.connections = []
        self.config = {}
        self.tags = []
        self.difficulty_level = "beginner"  # beginner, intermediate, advanced
        self.estimated_duration = "1-2 minutes"

    def add_node(
        self,
        node_id: str,
        node_type: str,
        position: Dict[str, int],
        config: Dict[str, Any] = None,
    ):
        """Add a node to the workflow template"""
        self.nodes.append(
            {
                "id": node_id,
                "type": node_type,
                "position": position,
                "config": config or {},
            }
        )

    def add_connection(
        self,
        source_node: str,
        target_node: str,
        source_port: str,
        target_port: str,
        connection_type: str = "trigger_flow",
    ):
        """Add a connection between nodes"""
        self.connections.append(
            {
                "id": str(uuid.uuid4()),
                "source_node_id": source_node,
                "target_node_id": target_node,
                "source_port_id": source_port,
                "target_port_id": target_port,
                "connection_type": connection_type,
                # Also keep React Flow format for frontend compatibility
                "source": source_node,
                "target": target_node,
                "sourceHandle": source_port,
                "targetHandle": target_port,
                "type": connection_type,
            }
        )

    def set_config(self, config: Dict[str, Any]):
        """Set workflow configuration"""
        self.config = config

    def to_dict(self) -> Dict[str, Any]:
        """Convert template to dictionary format"""
        return {
            "id": self.template_id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "nodes": self.nodes,
            "connections": self.connections,
            "config": self.config,
            "metadata": {
                "tags": self.tags,
                "difficulty_level": self.difficulty_level,
                "estimated_duration": self.estimated_duration,
                "created_at": datetime.now().isoformat(),
                "version": "3.0.0",
            },
        }


class WorkflowTemplateRegistry:
    """Registry for automation workflow templates"""

    def __init__(self):
        self.templates = {}
        self._initialize_templates()

    def _initialize_templates(self):
        """Initialize all workflow templates"""

        # Template 1: Simple Screen Click Automation
        click_template = WorkflowTemplate(
            template_id="simple_click_automation",
            name="Simple Click Automation",
            description="Basic automation to take screenshot, detect text, and perform click action",
            category="Desktop Automation",
        )

        click_template.add_node(
            "trigger_1",
            "manual_trigger",
            {"x": 100, "y": 100},
            {"trigger_message": "Start click automation workflow"},
        )

        click_template.add_node(
            "screenshot_1",
            "screenshot_action",
            {"x": 300, "y": 100},
            {"capture_type": "full_screen", "save_to_file": False},
        )

        click_template.add_node(
            "ocr_1",
            "ocr_region",
            {"x": 500, "y": 100},
            {"language": "eng", "confidence_threshold": 70},
        )

        click_template.add_node(
            "click_1",
            "click_action",
            {"x": 700, "y": 100},
            {"click_type": "left", "wait_after": 1000},
        )

        click_template.add_node(
            "output_1",
            "display_output",
            {"x": 900, "y": 100},
            {"format": "json", "title": "Click Automation Result"},
        )

        # Add connections
        click_template.add_connection(
            "trigger_1", "screenshot_1", "trigger_output", "trigger_input"
        )
        click_template.add_connection(
            "screenshot_1", "ocr_1", "next_trigger", "trigger_input"
        )
        click_template.add_connection(
            "screenshot_1", "ocr_1", "image_output", "image_input"
        )
        click_template.add_connection(
            "ocr_1", "click_1", "next_trigger", "trigger_input"
        )
        click_template.add_connection(
            "click_1", "output_1", "success_output", "data_input"
        )

        click_template.tags = ["desktop", "click", "ocr", "automation"]
        click_template.difficulty_level = "beginner"
        click_template.estimated_duration = "30 seconds"

        self.templates[click_template.template_id] = click_template

        # Template 2: Form Fill Automation
        form_template = WorkflowTemplate(
            template_id="form_fill_automation",
            name="Automated Form Filling",
            description="Automated form filling with text input and submission",
            category="Web Automation",
        )

        form_template.add_node(
            "trigger_1",
            "manual_trigger",
            {"x": 100, "y": 150},
            {"trigger_message": "Start form filling automation"},
        )

        form_template.add_node(
            "type_name",
            "type_text_action",
            {"x": 300, "y": 100},
            {
                "text": "John Doe",
                "selector": "input[name='name']",
                "clear_before": True,
            },
        )

        form_template.add_node(
            "type_email",
            "type_text_action",
            {"x": 300, "y": 200},
            {
                "text": "john.doe@example.com",
                "selector": "input[name='email']",
                "clear_before": True,
            },
        )

        form_template.add_node(
            "submit_click",
            "click_action",
            {"x": 500, "y": 150},
            {
                "selector": "button[type='submit']",
                "click_type": "left",
                "wait_after": 2000,
            },
        )

        form_template.add_node(
            "output_1",
            "display_output",
            {"x": 700, "y": 150},
            {"format": "text", "title": "Form Submission Result"},
        )

        # Add connections
        form_template.add_connection(
            "trigger_1", "type_name", "trigger_output", "trigger_input"
        )
        form_template.add_connection(
            "type_name", "type_email", "next_trigger", "trigger_input"
        )
        form_template.add_connection(
            "type_email", "submit_click", "next_trigger", "trigger_input"
        )
        form_template.add_connection(
            "submit_click", "output_1", "success_output", "data_input"
        )

        form_template.tags = ["web", "form", "automation", "input"]
        form_template.difficulty_level = "beginner"
        form_template.estimated_duration = "1 minute"

        self.templates[form_template.template_id] = form_template

        # Template 3: Text Monitoring and Response
        monitor_template = WorkflowTemplate(
            template_id="text_monitor_response",
            name="Text Monitor & Response",
            description="Monitor screen for specific text and respond with automated action",
            category="Monitoring & Response",
        )

        monitor_template.add_node(
            "trigger_1",
            "manual_trigger",
            {"x": 100, "y": 200},
            {"trigger_message": "Start text monitoring"},
        )

        monitor_template.add_node(
            "screenshot_1",
            "screenshot_action",
            {"x": 250, "y": 200},
            {"capture_type": "region"},
        )

        monitor_template.add_node(
            "ocr_1",
            "ocr_region",
            {"x": 400, "y": 200},
            {"language": "eng", "confidence_threshold": 80},
        )

        monitor_template.add_node(
            "condition_1", "condition", {"x": 550, "y": 200}, {"operator": "contains"}
        )

        monitor_template.add_node(
            "response_click",
            "click_action",
            {"x": 700, "y": 150},
            {"click_type": "left", "wait_after": 500},
        )

        monitor_template.add_node(
            "no_action",
            "display_output",
            {"x": 700, "y": 250},
            {"format": "text", "title": "No Action Taken"},
        )

        monitor_template.add_node(
            "output_1",
            "display_output",
            {"x": 850, "y": 200},
            {"format": "json", "title": "Monitor Response Result"},
        )

        # Add connections
        monitor_template.add_connection(
            "trigger_1", "screenshot_1", "trigger_output", "trigger_input"
        )
        monitor_template.add_connection(
            "screenshot_1", "ocr_1", "next_trigger", "trigger_input"
        )
        monitor_template.add_connection(
            "screenshot_1", "ocr_1", "image_output", "image_input"
        )
        monitor_template.add_connection(
            "ocr_1", "condition_1", "extracted_text", "value_a"
        )
        monitor_template.add_connection(
            "condition_1", "response_click", "true_trigger", "trigger_input"
        )
        monitor_template.add_connection(
            "condition_1", "no_action", "false_trigger", "data_input"
        )
        monitor_template.add_connection(
            "response_click", "output_1", "success_output", "data_input"
        )

        monitor_template.tags = ["monitoring", "conditional", "ocr", "response"]
        monitor_template.difficulty_level = "intermediate"
        monitor_template.estimated_duration = "1-2 minutes"

        self.templates[monitor_template.template_id] = monitor_template

        # Template 4: File Processing Workflow
        file_template = WorkflowTemplate(
            template_id="file_processing_workflow",
            name="Automated File Processing",
            description="Monitor directory for new files and process them automatically",
            category="File Management",
        )

        file_template.add_node(
            "file_watcher",
            "file_watcher",
            {"x": 100, "y": 250},
            {
                "watch_path": "/watch/directory",
                "file_pattern": "*.txt",
                "recursive": False,
            },
        )

        file_template.add_node(
            "text_processor",
            "text_processor",
            {"x": 300, "y": 250},
            {"operation": "uppercase"},
        )

        file_template.add_node(
            "condition_1", "condition", {"x": 500, "y": 250}, {"operator": "not_equals"}
        )

        file_template.add_node(
            "success_output",
            "display_output",
            {"x": 700, "y": 200},
            {"format": "json", "title": "File Processed Successfully"},
        )

        file_template.add_node(
            "error_output",
            "display_output",
            {"x": 700, "y": 300},
            {"format": "text", "title": "File Processing Failed"},
        )

        # Add connections
        file_template.add_connection(
            "file_watcher", "text_processor", "trigger_output", "text_input"
        )
        file_template.add_connection(
            "text_processor", "condition_1", "result", "value_a"
        )
        file_template.add_connection(
            "condition_1", "success_output", "true_trigger", "data_input"
        )
        file_template.add_connection(
            "condition_1", "error_output", "false_trigger", "data_input"
        )

        file_template.tags = ["files", "processing", "monitoring", "automation"]
        file_template.difficulty_level = "intermediate"
        file_template.estimated_duration = "Continuous"

        self.templates[file_template.template_id] = file_template

        # Template 5: Multi-Step Desktop Task
        desktop_template = WorkflowTemplate(
            template_id="multi_step_desktop_task",
            name="Multi-Step Desktop Automation",
            description="Complex desktop automation with multiple steps and conditional logic",
            category="Advanced Automation",
        )

        desktop_template.add_node(
            "trigger_1",
            "manual_trigger",
            {"x": 50, "y": 300},
            {"trigger_message": "Start complex desktop automation"},
        )

        desktop_template.add_node(
            "screenshot_1",
            "screenshot_action",
            {"x": 200, "y": 300},
            {"capture_type": "active_window"},
        )

        desktop_template.add_node(
            "ocr_1",
            "ocr_region",
            {"x": 350, "y": 250},
            {"language": "eng", "confidence_threshold": 75},
        )

        desktop_template.add_node(
            "text_process_1",
            "text_processor",
            {"x": 350, "y": 350},
            {"operation": "extract_numbers"},
        )

        desktop_template.add_node(
            "condition_1",
            "condition",
            {"x": 500, "y": 300},
            {"operator": "greater_than"},
        )

        desktop_template.add_node(
            "click_1",
            "click_action",
            {"x": 650, "y": 250},
            {"click_type": "left", "wait_before": 500},
        )

        desktop_template.add_node(
            "type_1",
            "type_text_action",
            {"x": 650, "y": 350},
            {"text": "Alternative action", "typing_speed": 100},
        )

        desktop_template.add_node(
            "screenshot_2",
            "screenshot_action",
            {"x": 800, "y": 300},
            {"capture_type": "full_screen", "save_to_file": True},
        )

        desktop_template.add_node(
            "output_1",
            "display_output",
            {"x": 950, "y": 300},
            {"format": "pretty_json", "title": "Complex Automation Complete"},
        )

        # Add connections
        desktop_template.add_connection(
            "trigger_1", "screenshot_1", "trigger_output", "trigger_input"
        )
        desktop_template.add_connection(
            "screenshot_1", "ocr_1", "next_trigger", "trigger_input"
        )
        desktop_template.add_connection(
            "screenshot_1", "ocr_1", "image_output", "image_input"
        )
        desktop_template.add_connection(
            "ocr_1", "text_process_1", "extracted_text", "text_input"
        )
        desktop_template.add_connection(
            "text_process_1", "condition_1", "result", "value_a"
        )
        desktop_template.add_connection(
            "condition_1", "click_1", "true_trigger", "trigger_input"
        )
        desktop_template.add_connection(
            "condition_1", "type_1", "false_trigger", "trigger_input"
        )
        desktop_template.add_connection(
            "click_1", "screenshot_2", "next_trigger", "trigger_input"
        )
        desktop_template.add_connection(
            "type_1", "screenshot_2", "next_trigger", "trigger_input"
        )
        desktop_template.add_connection(
            "screenshot_2", "output_1", "next_trigger", "data_input"
        )

        desktop_template.tags = ["desktop", "complex", "multi-step", "conditional"]
        desktop_template.difficulty_level = "advanced"
        desktop_template.estimated_duration = "2-3 minutes"

        self.templates[desktop_template.template_id] = desktop_template

        # Template 6: Data Extraction Pipeline
        data_template = WorkflowTemplate(
            template_id="data_extraction_pipeline",
            name="Screen Data Extraction",
            description="Extract and process data from screen regions with validation",
            category="Data Processing",
        )

        data_template.add_node(
            "trigger_1",
            "manual_trigger",
            {"x": 100, "y": 350},
            {"trigger_message": "Start data extraction"},
        )

        data_template.add_node(
            "screenshot_1",
            "screenshot_action",
            {"x": 250, "y": 350},
            {"capture_type": "region"},
        )

        data_template.add_node(
            "ocr_1",
            "ocr_region",
            {"x": 400, "y": 300},
            {"language": "eng", "confidence_threshold": 85},
        )

        data_template.add_node(
            "ocr_2",
            "ocr_region",
            {"x": 400, "y": 400},
            {"language": "eng", "confidence_threshold": 85},
        )

        data_template.add_node(
            "text_process_1",
            "text_processor",
            {"x": 550, "y": 300},
            {"operation": "extract_emails"},
        )

        data_template.add_node(
            "text_process_2",
            "text_processor",
            {"x": 550, "y": 400},
            {"operation": "extract_numbers"},
        )

        data_template.add_node(
            "condition_1",
            "condition",
            {"x": 700, "y": 350},
            {"operator": "is_not_empty"},
        )

        data_template.add_node(
            "output_1",
            "display_output",
            {"x": 850, "y": 350},
            {"format": "pretty_json", "title": "Extracted Data Summary"},
        )

        # Add connections
        data_template.add_connection(
            "trigger_1", "screenshot_1", "trigger_output", "trigger_input"
        )
        data_template.add_connection(
            "screenshot_1", "ocr_1", "next_trigger", "trigger_input"
        )
        data_template.add_connection(
            "screenshot_1", "ocr_1", "image_output", "image_input"
        )
        data_template.add_connection(
            "screenshot_1", "ocr_2", "image_output", "image_input"
        )
        data_template.add_connection(
            "ocr_1", "text_process_1", "extracted_text", "text_input"
        )
        data_template.add_connection(
            "ocr_2", "text_process_2", "extracted_text", "text_input"
        )
        data_template.add_connection(
            "text_process_1", "condition_1", "result", "value_a"
        )
        data_template.add_connection(
            "condition_1", "output_1", "true_trigger", "data_input"
        )

        data_template.tags = ["data", "extraction", "ocr", "processing"]
        data_template.difficulty_level = "intermediate"
        data_template.estimated_duration = "1-2 minutes"

        self.templates[data_template.template_id] = data_template

        logger.info(f"Initialized {len(self.templates)} workflow templates")

    def get_template(self, template_id: str) -> Optional[WorkflowTemplate]:
        """Get a specific workflow template"""
        return self.templates.get(template_id)

    def get_all_templates(self) -> Dict[str, WorkflowTemplate]:
        """Get all workflow templates"""
        return self.templates

    def get_templates_by_category(self, category: str) -> List[WorkflowTemplate]:
        """Get templates by category"""
        return [
            template
            for template in self.templates.values()
            if template.category == category
        ]

    def get_templates_by_difficulty(self, difficulty: str) -> List[WorkflowTemplate]:
        """Get templates by difficulty level"""
        return [
            template
            for template in self.templates.values()
            if template.difficulty_level == difficulty
        ]

    def get_templates_by_tag(self, tag: str) -> List[WorkflowTemplate]:
        """Get templates containing a specific tag"""
        return [
            template for template in self.templates.values() if tag in template.tags
        ]

    def search_templates(self, query: str) -> List[WorkflowTemplate]:
        """Search templates by name, description, or tags"""
        query_lower = query.lower()
        results = []

        for template in self.templates.values():
            if (
                query_lower in template.name.lower()
                or query_lower in template.description.lower()
                or any(query_lower in tag.lower() for tag in template.tags)
            ):
                results.append(template)

        return results

    def get_template_categories(self) -> List[str]:
        """Get all available template categories"""
        categories = set(template.category for template in self.templates.values())
        return sorted(list(categories))

    def get_template_summary(self) -> Dict[str, Any]:
        """Get a summary of all templates"""
        categories = {}
        difficulty_counts = {"beginner": 0, "intermediate": 0, "advanced": 0}
        all_tags = set()

        for template in self.templates.values():
            # Count by category
            if template.category not in categories:
                categories[template.category] = 0
            categories[template.category] += 1

            # Count by difficulty
            difficulty_counts[template.difficulty_level] += 1

            # Collect all tags
            all_tags.update(template.tags)

        return {
            "total_templates": len(self.templates),
            "categories": categories,
            "difficulty_distribution": difficulty_counts,
            "available_tags": sorted(list(all_tags)),
            "template_list": [
                {
                    "id": template.template_id,
                    "name": template.name,
                    "category": template.category,
                    "difficulty": template.difficulty_level,
                    "tags": template.tags,
                    "estimated_duration": template.estimated_duration,
                }
                for template in self.templates.values()
            ],
        }


# Global registry instance
workflow_template_registry = WorkflowTemplateRegistry()


def get_workflow_template(template_id: str) -> Optional[Dict[str, Any]]:
    """Get a workflow template as dictionary"""
    template = workflow_template_registry.get_template(template_id)
    return template.to_dict() if template else None


def get_all_workflow_templates() -> List[Dict[str, Any]]:
    """Get all workflow templates as dictionaries"""
    return [
        template.to_dict()
        for template in workflow_template_registry.get_all_templates().values()
    ]


def get_workflow_templates_by_category(category: str) -> List[Dict[str, Any]]:
    """Get workflow templates by category"""
    templates = workflow_template_registry.get_templates_by_category(category)
    return [template.to_dict() for template in templates]


def search_workflow_templates(query: str) -> List[Dict[str, Any]]:
    """Search workflow templates"""
    templates = workflow_template_registry.search_templates(query)
    return [template.to_dict() for template in templates]


def get_workflow_template_summary() -> Dict[str, Any]:
    """Get workflow template summary"""
    return workflow_template_registry.get_template_summary()


if __name__ == "__main__":
    # Test the template system
    summary = get_workflow_template_summary()
    print(f"Workflow Template System Summary:")
    print(f"Total Templates: {summary['total_templates']}")
    print(f"Categories: {list(summary['categories'].keys())}")
    print(f"Difficulty Distribution: {summary['difficulty_distribution']}")
    print(f"Available Tags: {summary['available_tags'][:10]}...")  # Show first 10 tags
