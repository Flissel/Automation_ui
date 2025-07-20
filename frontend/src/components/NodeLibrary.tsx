/**
 * TRAE Visual Workflow System - Node Library Component
 * 
 * Sidebar component for browsing and adding nodes to the workflow
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useMemo } from 'react';
import { NodeCategory } from '../types';
import { NODE_TEMPLATES, getNodeTemplatesByCategory } from '../config/nodes';
import DesktopSwitcher from './DesktopSwitcher';

interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface NodeLibraryProps {
  onAddNode: (nodeType: string, nodeCategory: NodeCategory) => void;
}

const NodeLibrary: React.FC<NodeLibraryProps> = ({ onAddNode }) => {
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all' | 'desktop'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Convert node templates to node definitions for compatibility
  const nodeDefinitions: NodeDefinition[] = useMemo(() => {
    const definitions = Object.values(NODE_TEMPLATES).map(template => ({
      type: template.type,
      category: template.category,
      label: template.label,
      description: template.description,
      icon: template.icon,
      color: template.color,
    }));
    
    // Debug logging
    console.log('🔍 [NodeLibrary] Total node templates loaded:', definitions.length);
    console.log('🔍 [NodeLibrary] Actions nodes:', definitions.filter(n => n.category === 'actions'));
    console.log('🔍 [NodeLibrary] Advanced automation nodes:', definitions.filter(n =>
      n.type === 'ocr_click_pattern_monitor' ||
      n.type === 'enhanced_ocr_monitor' ||
      n.type === 'ocr_text_tracker'
    ));
    
    return definitions;
  }, []);

  const categories = useMemo(() => {
    const cats = [
      { id: 'all', label: 'All Nodes', icon: '📦', count: nodeDefinitions.length },
      { id: 'desktop', label: 'Desktop Control', icon: '🖥️', count: 0 },
      { id: 'triggers', label: 'Triggers', icon: '⚡', count: nodeDefinitions.filter(n => n.category === 'triggers').length },
      { id: 'actions', label: 'Actions', icon: '🎯', count: nodeDefinitions.filter(n => n.category === 'actions').length },
      { id: 'logic', label: 'Logic', icon: '🧠', count: nodeDefinitions.filter(n => n.category === 'logic').length },
      { id: 'data', label: 'Data', icon: '📊', count: nodeDefinitions.filter(n => n.category === 'data').length },
    ];
    
    console.log('🔍 [NodeLibrary] Categories with counts:', cats);
    return cats;
  }, [nodeDefinitions]);

  const filteredNodes = useMemo(() => {
    return nodeDefinitions.filter(node => {
      const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [nodeDefinitions, selectedCategory, searchTerm]);

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string, nodeCategory: NodeCategory) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, nodeCategory }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeClick = (nodeType: string, nodeCategory: NodeCategory) => {
    onAddNode(nodeType, nodeCategory);
  };

  return (
    <div style={{
      height: '100%',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
        }}>
          Node Library
        </h3>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      {/* Categories */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as NodeCategory | 'all' | 'desktop')}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '4px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: selectedCategory === category.id ? '#e0f2fe' : 'transparent',
              color: selectedCategory === category.id ? '#0369a1' : '#4b5563',
              fontSize: '14px',
              fontWeight: selectedCategory === category.id ? '500' : '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </span>
            <span style={{
              fontSize: '12px',
              backgroundColor: selectedCategory === category.id ? '#0369a1' : '#9ca3af',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              minWidth: '20px',
              textAlign: 'center',
            }}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: selectedCategory === 'desktop' ? '0' : '12px',
      }}>
        {selectedCategory === 'desktop' ? (
          <DesktopSwitcher />
        ) : (
          <>
            {filteredNodes.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                padding: '20px',
              }}>
                {searchTerm ? 'No nodes match your search' : 'No nodes in this category'}
              </div>
            ) : (
              filteredNodes.map((node, index) => (
                <div
                  key={`${node.type}-${node.category}-${index}`}
                  draggable
                  onDragStart={(e) => handleNodeDragStart(e, node.type, node.category)}
                  onClick={() => handleNodeClick(node.type, node.category)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    cursor: 'grab',
                    transition: 'all 0.2s',
                    borderLeft: `4px solid ${node.color}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = node.color;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.cursor = 'grabbing';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.cursor = 'grab';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}>
                    <span style={{
                      fontSize: '20px',
                      lineHeight: '1',
                      flexShrink: 0,
                    }}>
                      {node.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937',
                        marginBottom: '4px',
                        lineHeight: '1.2',
                      }}>
                        {node.label}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        lineHeight: '1.3',
                      }}>
                        {node.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center',
      }}>
        Drag nodes to canvas or click to add
      </div>
    </div>
  );
};

export default NodeLibrary;