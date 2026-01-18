/**
 * Intent Chat Panel
 *
 * Chat interface for processing intents via MCP tools.
 * Supports text input and displays automation results.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bot, User, Zap, Eye, MousePointer } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    coordinates?: { x: number; y: number };
    detectedElements?: Array<{ label: string; confidence: number }>;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

export interface IntentResult {
  success: boolean;
  action: string;
  target?: string;
  coordinates?: { x: number; y: number };
  detectedElements?: Array<{ label: string; x: number; y: number; confidence: number }>;
  ocrText?: string;
  error?: string;
}

interface IntentChatPanelProps {
  onIntent?: (intent: string) => Promise<IntentResult | null>;
  onReadScreen?: () => Promise<{ text: string; elements: Array<{ label: string; x: number; y: number }> } | null>;
  onValidate?: (target: string) => Promise<{ found: boolean; x?: number; y?: number; confidence?: number } | null>;
  onAction?: (action: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string } | null>;
  className?: string;
}

// ============================================
// Component
// ============================================

export const IntentChatPanel: React.FC<IntentChatPanelProps> = ({
  onIntent,
  onReadScreen,
  onValidate,
  onAction,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Desktop Automation Ready. Type your intent or use commands:\n• "read screen" - Capture and analyze screen\n• "find [element]" - Locate UI element\n• "click [target]" - Click on element\n• "type [text]" - Type text',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Add message helper
  const addMessage = useCallback((role: ChatMessage['role'], content: string, metadata?: ChatMessage['metadata']) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      metadata
    };
    setMessages(prev => [...prev, message]);
    return message.id;
  }, []);

  // Update message status
  const updateMessageStatus = useCallback((id: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, metadata: { ...msg.metadata, status } } : msg
    ));
  }, []);

  // Process intent
  const processIntent = useCallback(async (text: string) => {
    const lowerText = text.toLowerCase().trim();

    // Read Screen command
    if (lowerText === 'read screen' || lowerText === 'scan' || lowerText === 'analyze') {
      if (onReadScreen) {
        const msgId = addMessage('assistant', 'Reading screen...', { action: 'read_screen', status: 'processing' });
        try {
          const result = await onReadScreen();
          if (result) {
            updateMessageStatus(msgId, 'completed');
            addMessage('assistant', `Screen analyzed:\n• Text found: ${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}\n• Elements detected: ${result.elements.length}`, {
              action: 'read_screen',
              detectedElements: result.elements.map(e => ({ label: e.label, confidence: 1 })),
              status: 'completed'
            });
          } else {
            updateMessageStatus(msgId, 'failed');
            addMessage('assistant', 'Failed to read screen. Make sure MCP server is running.');
          }
        } catch (err) {
          updateMessageStatus(msgId, 'failed');
          addMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        return;
      }
    }

    // Find/Validate command
    const findMatch = lowerText.match(/^(?:find|locate|search|validate)\s+(.+)$/);
    if (findMatch && onValidate) {
      const target = findMatch[1];
      const msgId = addMessage('assistant', `Looking for "${target}"...`, { action: 'validate', status: 'processing' });
      try {
        const result = await onValidate(target);
        if (result?.found) {
          updateMessageStatus(msgId, 'completed');
          addMessage('assistant', `Found "${target}" at (${result.x}, ${result.y}) with ${Math.round((result.confidence || 0) * 100)}% confidence`, {
            action: 'validate',
            coordinates: { x: result.x!, y: result.y! },
            status: 'completed'
          });
        } else {
          updateMessageStatus(msgId, 'failed');
          addMessage('assistant', `Could not find "${target}" on screen.`);
        }
      } catch (err) {
        updateMessageStatus(msgId, 'failed');
        addMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      return;
    }

    // Click command
    const clickMatch = lowerText.match(/^click\s+(.+)$/);
    if (clickMatch && onAction) {
      const target = clickMatch[1];

      // First validate to get coordinates
      if (onValidate) {
        const msgId = addMessage('assistant', `Finding "${target}" to click...`, { action: 'click', status: 'processing' });
        try {
          const validateResult = await onValidate(target);
          if (validateResult?.found && validateResult.x !== undefined && validateResult.y !== undefined) {
            const actionResult = await onAction('click', { x: validateResult.x, y: validateResult.y });
            if (actionResult?.success) {
              updateMessageStatus(msgId, 'completed');
              addMessage('assistant', `Clicked "${target}" at (${validateResult.x}, ${validateResult.y})`, {
                action: 'click',
                coordinates: { x: validateResult.x, y: validateResult.y },
                status: 'completed'
              });
            } else {
              updateMessageStatus(msgId, 'failed');
              addMessage('assistant', `Click failed: ${actionResult?.error || 'Unknown error'}`);
            }
          } else {
            updateMessageStatus(msgId, 'failed');
            addMessage('assistant', `Could not find "${target}" to click.`);
          }
        } catch (err) {
          updateMessageStatus(msgId, 'failed');
          addMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        return;
      }
    }

    // Type command
    const typeMatch = lowerText.match(/^type\s+(.+)$/);
    if (typeMatch && onAction) {
      const text = typeMatch[1];
      const msgId = addMessage('assistant', `Typing "${text}"...`, { action: 'type', status: 'processing' });
      try {
        const result = await onAction('type', { text });
        if (result?.success) {
          updateMessageStatus(msgId, 'completed');
          addMessage('assistant', `Typed: "${text}"`, { action: 'type', status: 'completed' });
        } else {
          updateMessageStatus(msgId, 'failed');
          addMessage('assistant', `Type failed: ${result?.error || 'Unknown error'}`);
        }
      } catch (err) {
        updateMessageStatus(msgId, 'failed');
        addMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      return;
    }

    // General intent processing
    if (onIntent) {
      const msgId = addMessage('assistant', 'Processing intent...', { action: 'intent', status: 'processing' });
      try {
        const result = await onIntent(text);
        if (result?.success) {
          updateMessageStatus(msgId, 'completed');
          let responseText = `Executed: ${result.action}`;
          if (result.target) responseText += ` on "${result.target}"`;
          if (result.coordinates) responseText += ` at (${result.coordinates.x}, ${result.coordinates.y})`;
          addMessage('assistant', responseText, {
            action: result.action,
            coordinates: result.coordinates,
            detectedElements: result.detectedElements?.map(e => ({ label: e.label, confidence: e.confidence })),
            status: 'completed'
          });
        } else {
          updateMessageStatus(msgId, 'failed');
          addMessage('assistant', `Intent failed: ${result?.error || 'Could not process intent'}`);
        }
      } catch (err) {
        updateMessageStatus(msgId, 'failed');
        addMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      return;
    }

    // No handler available
    addMessage('assistant', 'No handler available for this command. Available commands:\n• read screen\n• find [element]\n• click [target]\n• type [text]');
  }, [onIntent, onReadScreen, onValidate, onAction, addMessage, updateMessageStatus]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    setIsProcessing(true);
    try {
      await processIntent(userMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, addMessage, processIntent]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Render message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <div
        key={message.id}
        className={`flex gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSystem ? 'bg-gray-700' : 'bg-blue-600'}`}>
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}

        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              isUser
                ? 'bg-blue-600 text-white'
                : isSystem
                  ? 'bg-gray-800 text-gray-300 border border-gray-700'
                  : 'bg-gray-800 text-gray-100'
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>

            {message.metadata && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.metadata.action && (
                  <Badge variant="outline" className="text-xs">
                    {message.metadata.action === 'click' && <MousePointer className="w-3 h-3 mr-1" />}
                    {message.metadata.action === 'read_screen' && <Eye className="w-3 h-3 mr-1" />}
                    {message.metadata.action === 'validate' && <Zap className="w-3 h-3 mr-1" />}
                    {message.metadata.action}
                  </Badge>
                )}
                {message.metadata.coordinates && (
                  <Badge variant="secondary" className="text-xs">
                    ({message.metadata.coordinates.x}, {message.metadata.coordinates.y})
                  </Badge>
                )}
                {message.metadata.status && message.metadata.status !== 'completed' && (
                  <Badge
                    variant={message.metadata.status === 'failed' ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {message.metadata.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {message.metadata.status}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1 px-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`flex flex-col h-full bg-gray-900 border-gray-800 ${className}`}>
      <CardHeader className="py-3 px-4 border-b border-gray-800">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Intent Processing
          {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.map(renderMessage)}
        </ScrollArea>

        <div className="p-3 border-t border-gray-800">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your intent... (e.g., 'click Submit button')"
              className="min-h-[60px] max-h-[120px] bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 resize-none"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="h-[60px] px-4"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntentChatPanel;
