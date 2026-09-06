import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/shared';
import { KanbanColumn, SearchBar } from '../components/quotations';
import { quotationsApi } from '../services/api';
import { useRealtimeUpdates } from '../contexts/WebSocketContext';
import type { Quotation, QuotationStatus } from '../types';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { QuotationCard } from '../components/quotations/QuotationCard';

const STATUS_COLUMNS: { title: string; status: QuotationStatus }[] = [
  { title: 'Draft', status: 'DRAFT' },
  { title: 'Pending Approval', status: 'PENDING_APPROVAL' },
  { title: 'Approved', status: 'APPROVED' },
  { title: 'Negotiation', status: 'NEGOTIATION' },
  { title: 'Confirmed', status: 'CONFIRMED' },
];

export function QuotationsList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingQuotation, setCreatingQuotation] = useState(false);
  const [activeQuotation, setActiveQuotation] = useState<Quotation | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  useEffect(() => {
    loadQuotations();
  }, []);

  // Real-time updates via WebSocket
  useRealtimeUpdates('quotation_update', () => {
    loadQuotations();
  });

  const loadQuotations = async () => {
    try {
      setError(null);
      const data = await quotationsApi.getAll();
      // Ensure data is an array and handle null/undefined
      if (Array.isArray(data)) {
        setQuotations(data);
      } else {
        console.error('Invalid quotations data received:', data);
        setQuotations([]);
        setError('Received invalid data from server');
      }
    } catch (error) {
      console.error('Failed to load quotations:', error);
      setError('Failed to load quotations. Please try again.');
      setQuotations([]); // Ensure quotations is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuotation = async () => {
    setCreatingQuotation(true);
    try {
      const newQuotation = await quotationsApi.create();
      navigate(`/quotations/${newQuotation.id}`);
    } catch (error) {
      console.error('Failed to create quotation:', error);
      alert('Failed to create quotation. Please try again.');
    } finally {
      setCreatingQuotation(false);
    }
  };

  const filteredQuotations = Array.isArray(quotations) 
    ? quotations.filter((q) =>
        q?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getQuotationsByStatus = (status: QuotationStatus) => {
    return filteredQuotations.filter((q) => q.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const quotation = quotations.find((q) => q.id === active.id);
    if (quotation) {
      setActiveQuotation(quotation);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveQuotation(null);

    if (!over) return;

    const quotationId = active.id as number;
    const newStatus = over.id as QuotationStatus;
    
    const quotation = quotations.find((q) => q.id === quotationId);
    if (!quotation || quotation.status === newStatus) return;

    // Optimistic update
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === quotationId ? { ...q, status: newStatus } : q
      )
    );

    try {
      // Update on backend
      await quotationsApi.update(quotationId.toString(), { status: newStatus });
    } catch (error) {
      console.error('Failed to update quotation status:', error);
      // Revert on error
      await loadQuotations();
      alert('Failed to update quotation status. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-dark-muted animate-pulse-slow">Loading quotations...</div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="text-danger text-5xl">⚠️</div>
            <h2 className="text-2xl font-bold text-dark-text">Unable to Load Quotations</h2>
            <p className="text-dark-muted text-center max-w-md">{error}</p>
            <button onClick={loadQuotations} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
            Quotations (List)
          </h1>
          <p className="text-dark-muted mt-2">
            Every quotation lives here, one row per quotation, click a row to open it
          </p>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex items-center justify-between gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex-1">
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          </div>
          <button 
            onClick={handleNewQuotation} 
            className="btn-primary"
            disabled={creatingQuotation}
          >
            {creatingQuotation ? (
              <span className="flex items-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Creating...
              </span>
            ) : (
              '+ New Quotation'
            )}
          </button>
        </div>

        {/* Empty State */}
        {quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
            <div className="text-8xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-dark-text">No Quotations Yet</h2>
            <p className="text-dark-muted text-center max-w-md">
              Get started by creating your first quotation
            </p>
            <button onClick={handleNewQuotation} className="btn-primary mt-4" disabled={creatingQuotation}>
              {creatingQuotation ? 'Creating...' : '+ Create First Quotation'}
            </button>
          </div>
        ) : (
          /* Kanban Board with Drag-and-Drop */
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {STATUS_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.status}
                  title={column.title}
                  status={column.status}
                  quotations={getQuotationsByStatus(column.status)}
                />
              ))}
            </div>
            
            {/* Drag Overlay - shows the card being dragged */}
            <DragOverlay>
              {activeQuotation ? (
                <div className="opacity-90 rotate-3 scale-105">
                  <QuotationCard quotation={activeQuotation} isDragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </>
  );
}
