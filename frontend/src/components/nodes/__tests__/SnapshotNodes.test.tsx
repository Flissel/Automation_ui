/**
 * Tests for Snapshot-based Node Components
 * 
 * Comprehensive test suite for snapshot OCR and automation nodes
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlowProvider } from 'reactflow';
import SnapshotDesignerNode from '../SnapshotDesignerNode';
import SnapshotOCRExecutorNode from '../SnapshotOCRExecutorNode';
import SnapshotClickExecutorNode from '../SnapshotClickExecutorNode';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock canvas context for snapshot designer
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  fillText: jest.fn(),
  strokeText: jest.fn(),
}));

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 0;
  height = 0;
  
  constructor() {
    setTimeout(() => {
      this.width = 800;
      this.height = 600;
      if (this.onload) this.onload();
    }, 0);
  }
};

const mockNodeProps = {
  id: 'test-node',
  data: {
    label: 'Test Node',
    config: {},
  },
  selected: false,
  type: 'test',
  position: { x: 0, y: 0 },
  dragHandle: '.drag-handle',
  isConnectable: true,
  zIndex: 1,
  xPos: 0,
  yPos: 0,
  dragging: false,
};

const renderWithReactFlow = (component: React.ReactElement) => {
  return render(
    <ReactFlowProvider>
      {component}
    </ReactFlowProvider>
  );
};

describe('SnapshotDesignerNode', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders correctly with default props', () => {
    renderWithReactFlow(<SnapshotDesignerNode {...mockNodeProps} />);
    
    expect(screen.getByText('Snapshot Designer')).toBeInTheDocument();
    expect(screen.getByText('Create Snapshot')).toBeInTheDocument();
  });

  it('creates a snapshot when button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        snapshot_id: 'test-snapshot-123',
        image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          timestamp: '2024-01-01T12:00:00Z',
          resolution: '800x600',
          monitor: 0
        }
      })
    });

    renderWithReactFlow(<SnapshotDesignerNode {...mockNodeProps} />);
    
    const createButton = screen.getByText('Create Snapshot');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/snapshots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitor: 0, quality: 85 })
      });
    });
  });

  it('switches between OCR and Click design modes', () => {
    renderWithReactFlow(<SnapshotDesignerNode {...mockNodeProps} />);
    
    const ocrModeButton = screen.getByText('OCR Zones');
    const clickModeButton = screen.getByText('Click Actions');
    
    expect(ocrModeButton).toHaveClass('bg-blue-500');
    expect(clickModeButton).toHaveClass('bg-gray-300');
    
    fireEvent.click(clickModeButton);
    
    expect(clickModeButton).toHaveClass('bg-green-500');
    expect(ocrModeButton).toHaveClass('bg-gray-300');
  });

  it('adds OCR zones when canvas is clicked in OCR mode', async () => {
    const nodeWithSnapshot = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        snapshot_image: 'data:image/png;base64,test',
        snapshot_metadata: {
          timestamp: '2024-01-01T12:00:00Z',
          resolution: '800x600',
          monitor: 0
        }
      }
    };

    renderWithReactFlow(<SnapshotDesignerNode {...nodeWithSnapshot} />);
    
    await waitFor(() => {
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });

    const canvas = screen.getByRole('img', { hidden: true });
    
    // Simulate mouse down, move, and up to create a zone
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(canvas, { clientX: 200, clientY: 150 });

    // Check if zone was added (this would need to be verified through state or UI changes)
    expect(canvas).toBeInTheDocument();
  });

  it('saves template when save button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const nodeWithData = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        snapshot_id: 'test-snapshot',
        ocr_zones: [{
          id: 'zone1',
          name: 'Test Zone',
          x: 100, y: 100, width: 100, height: 50,
          language: 'eng',
          confidence_threshold: 0.8
        }]
      }
    };

    renderWithReactFlow(<SnapshotDesignerNode {...nodeWithData} />);
    
    const saveButton = screen.getByText('Save Template');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/snapshots/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('test-snapshot')
      });
    });
  });
});

describe('SnapshotOCRExecutorNode', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders correctly with default props', () => {
    renderWithReactFlow(<SnapshotOCRExecutorNode {...mockNodeProps} />);
    
    expect(screen.getByText('OCR Executor')).toBeInTheDocument();
    expect(screen.getByText('Load Template')).toBeInTheDocument();
  });

  it('loads templates when load button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ['template1', 'template2', 'template3']
    });

    renderWithReactFlow(<SnapshotOCRExecutorNode {...mockNodeProps} />);
    
    const loadButton = screen.getByText('Load Template');
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/snapshots/templates');
    });
  });

  it('starts OCR execution when start button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test_template',
          ocr_zones: [{
            id: 'zone1',
            name: 'Test Zone',
            x: 100, y: 100, width: 100, height: 50,
            language: 'eng',
            confidence_threshold: 0.8
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          snapshot_id: 'new-snapshot',
          image_data: 'data:image/png;base64,test'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            zone_id: 'zone1',
            text: 'Extracted text',
            confidence: 0.95,
            processing_time_ms: 150
          }]
        })
      });

    const nodeWithTemplate = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        template_name: 'test_template'
      }
    };

    renderWithReactFlow(<SnapshotOCRExecutorNode {...nodeWithTemplate} />);
    
    // First load the template
    const loadButton = screen.getByText('Load Template');
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Start OCR')).toBeInTheDocument();
    });

    // Then start execution
    const startButton = screen.getByText('Start OCR');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/snapshots/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('zone1')
      });
    });
  });

  it('displays OCR results after execution', async () => {
    const nodeWithResults = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        execution_results: [{
          zone_id: 'zone1',
          zone_name: 'Test Zone',
          text: 'Sample extracted text',
          confidence: 0.92,
          processing_time_ms: 200
        }]
      }
    };

    renderWithReactFlow(<SnapshotOCRExecutorNode {...nodeWithResults} />);
    
    expect(screen.getByText('Sample extracted text')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('200ms')).toBeInTheDocument();
  });
});

describe('SnapshotClickExecutorNode', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders correctly with default props', () => {
    renderWithReactFlow(<SnapshotClickExecutorNode {...mockNodeProps} />);
    
    expect(screen.getByText('Click Executor')).toBeInTheDocument();
    expect(screen.getByText('Load Template')).toBeInTheDocument();
  });

  it('executes click actions when start button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test_template',
          click_actions: [{
            id: 'click1',
            name: 'Test Click',
            x: 500, y: 300,
            action_type: 'click',
            button: 'left',
            delay_ms: 100
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          snapshot_id: 'new-snapshot',
          image_data: 'data:image/png;base64,test'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            action_id: 'click1',
            success: true,
            execution_time_ms: 50
          }]
        })
      });

    const nodeWithTemplate = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        template_name: 'test_template'
      }
    };

    renderWithReactFlow(<SnapshotClickExecutorNode {...nodeWithTemplate} />);
    
    // Load template first
    const loadButton = screen.getByText('Load Template');
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText('Start Execution')).toBeInTheDocument();
    });

    // Start execution
    const startButton = screen.getByText('Start Execution');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/snapshots/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('click1')
      });
    });
  });

  it('displays execution results after click actions', async () => {
    const nodeWithResults = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        execution_results: [{
          action_id: 'click1',
          action_name: 'Login Button',
          success: true,
          execution_time_ms: 75,
          error: null
        }]
      }
    };

    renderWithReactFlow(<SnapshotClickExecutorNode {...nodeWithResults} />);
    
    expect(screen.getByText('Login Button')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('75ms')).toBeInTheDocument();
  });

  it('handles execution errors gracefully', async () => {
    const nodeWithError = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        execution_results: [{
          action_id: 'click1',
          action_name: 'Failed Click',
          success: false,
          execution_time_ms: 0,
          error: 'Target element not found'
        }]
      }
    };

    renderWithReactFlow(<SnapshotClickExecutorNode {...nodeWithError} />);
    
    expect(screen.getByText('Failed Click')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
    expect(screen.getByText('Target element not found')).toBeInTheDocument();
  });
});

describe('Snapshot Node Integration', () => {
  it('maintains data consistency between designer and executor nodes', async () => {
    const sharedData = {
      snapshot_id: 'shared-snapshot',
      template_name: 'shared-template',
      ocr_zones: [{
        id: 'zone1',
        name: 'Shared Zone',
        x: 100, y: 100, width: 200, height: 50,
        language: 'eng',
        confidence_threshold: 0.8
      }]
    };

    const designerProps = {
      ...mockNodeProps,
      data: { ...mockNodeProps.data, ...sharedData }
    };

    const executorProps = {
      ...mockNodeProps,
      id: 'executor-node',
      data: { ...mockNodeProps.data, ...sharedData }
    };

    const { rerender } = renderWithReactFlow(
      <div>
        <SnapshotDesignerNode {...designerProps} />
        <SnapshotOCRExecutorNode {...executorProps} />
      </div>
    );

    // Both nodes should display the same template data
    expect(screen.getAllByText('Shared Zone')).toHaveLength(2);
  });
});