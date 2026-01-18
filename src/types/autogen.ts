/**
 * AutoGen AI Agent Analysis Types
 * 
 * Diese Typdefinitionen entsprechen den JSON-Strukturen,
 * die vom AutoGen Multi-Agent Framework zurückgegeben werden.
 */

// ============================================================================
// VISION AGENT TYPES
// ============================================================================

/**
 * Ergebnis der Bildanalyse durch den Vision Agent
 */
export interface VisionAnalysis {
  /** Liste der sichtbaren Anwendungen */
  applications: string[];
  /** Identifizierte UI-Elemente (Buttons, Menüs, etc.) */
  ui_elements: string[];
  /** Beschreibung des Layouts */
  layout_description: string;
  /** Wichtige Beobachtungen */
  observations: string[];
  /** Potenzielle Probleme oder Anomalien */
  potential_issues: string[];
}

// ============================================================================
// OCR AGENT TYPES
// ============================================================================

/**
 * Ergebnis der Texterkennung durch den OCR Agent
 */
export interface OCRAnalysis {
  /** Erkannte Fenstertitel */
  window_titles: string[];
  /** Sichtbarer Text in Dokumenten/UI */
  visible_text: string[];
  /** Erkannte Fehlermeldungen */
  error_messages: string[];
  /** Erkannte Code-Snippets */
  code_snippets: string[];
  /** Erkannte Sprache des Texts */
  language_detected: string;
}

// ============================================================================
// COORDINATOR AGENT TYPES
// ============================================================================

/**
 * Zusammenfassender Report vom Coordinator Agent
 */
export interface CoordinatorReport {
  /** Kurze Zusammenfassung der Bildschirmaktivität */
  summary: string;
  /** Was der Benutzer wahrscheinlich gerade tut */
  active_task: string;
  /** Wichtigste Erkenntnisse */
  key_findings: string[];
  /** Empfehlungen (falls relevant) */
  recommendations: string[];
  /** Dringende/priorisierte Punkte */
  priority_items: string[];
  /** Konfidenz der Analyse (0.0 - 1.0) */
  confidence: number;
}

// ============================================================================
// COMPOSITE ANALYSIS RESULT
// ============================================================================

/**
 * Status einer Analyse
 */
export type AnalysisStatus = 'success' | 'error' | 'pending' | 'processing';

/**
 * Komplettes Analyseergebnis vom AutoGen Multi-Agent System
 */
export interface AutoGenAnalysisResult {
  /** ID des analysierten Monitors */
  monitor_id: string;
  /** Zeitstempel der Analyse */
  timestamp: string;
  /** Status der Analyse */
  status: AnalysisStatus;
  /** Fehlermeldung (falls status === 'error') */
  error?: string;
  /** Vision Agent Ergebnis */
  vision?: VisionAnalysis;
  /** OCR Agent Ergebnis */
  ocr?: OCRAnalysis;
  /** Coordinator Report */
  coordinator?: CoordinatorReport;
  /** Verarbeitungszeit in Millisekunden */
  processing_time_ms?: number;
  /** Frame-Nummer für Zuordnung */
  frame_number?: number;
}

// ============================================================================
// STATISTICS AND HISTORY
// ============================================================================

/**
 * Statistiken für den AutoGen Analysis Service
 */
export interface AutoGenStats {
  /** Anzahl empfangener Frames */
  frames_received: number;
  /** Anzahl analysierter Frames */
  frames_analyzed: number;
  /** Anzahl übersprungener Frames (Rate-Limiting) */
  frames_dropped: number;
  /** Anzahl der Verbindungsversuche */
  connection_attempts: number;
  /** Anzahl erfolgreicher Verbindungen */
  successful_connections: number;
  /** Anzahl der Analysefehler */
  analysis_errors: number;
  /** Zeitstempel des letzten Frames */
  last_frame_time: number;
  /** Zeitstempel der letzten Analyse */
  last_analysis_time: number;
  /** Service läuft */
  is_running: boolean;
  /** WebSocket verbunden */
  is_connected: boolean;
}

/**
 * History-Eintrag für die AutoGen-Analyse
 */
export interface AutoGenHistoryEntry {
  /** Eindeutige ID des Eintrags */
  id: string;
  /** Analyseergebnis */
  result: AutoGenAnalysisResult;
  /** Zeitpunkt des Empfangs im Frontend */
  received_at: Date;
}

/**
 * State für das AutoGen Analysis Panel
 */
export interface AutoGenPanelState {
  /** Ob Live-Updates pausiert sind */
  isPaused: boolean;
  /** Aktuelles/neuestes Analyseergebnis */
  currentResult: AutoGenAnalysisResult | null;
  /** Historie der Analyseergebnisse (max. 50 Einträge) */
  history: AutoGenHistoryEntry[];
  /** Aggregierte Statistiken */
  stats: {
    totalAnalyses: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    averageProcessingTime: number;
    averageConfidence: number;
  };
  /** Ob der Service verbunden ist */
  isConnected: boolean;
  /** Letzter Fehler */
  lastError: string | null;
}

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

/**
 * WebSocket-Nachricht für Analyseergebnisse
 */
export interface AnalysisResultMessage {
  type: 'analysis_result';
  result: AutoGenAnalysisResult;
  timestamp: number;
}

/**
 * WebSocket-Nachricht für Service-Statistiken
 */
export interface AutoGenStatsMessage {
  type: 'autogen_stats';
  stats: AutoGenStats;
  timestamp: number;
}

/**
 * Union-Type für alle AutoGen-bezogenen WebSocket-Nachrichten
 */
export type AutoGenWebSocketMessage = AnalysisResultMessage | AutoGenStatsMessage;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Prüft ob eine Nachricht ein AutoGen-Analyseergebnis ist
 */
export function isAnalysisResultMessage(message: unknown): message is AnalysisResultMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as AnalysisResultMessage).type === 'analysis_result'
  );
}

/**
 * Erzeugt eine eindeutige ID für einen History-Eintrag
 */
export function generateHistoryEntryId(): string {
  return `autogen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formatiert eine Konfidenz als Prozent-String
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Formatiert eine Verarbeitungszeit
 */
export function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}